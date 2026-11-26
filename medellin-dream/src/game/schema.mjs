import { z } from 'zod'
import { builtinIcons, iconRanges } from '../icons/registry.mjs'

export { builtinIcons }

const text = z.string().max(50000)
const short = z.string().max(220)
const id = short.regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/, '资源 ID 无效')
const ref = id.or(z.literal(''))
const color = z.string().regex(/^#[0-9a-f]{6}$/i, '需要六位十六进制颜色')
const local = short.refine(value => value === '' || /^(?:https?:\/\/)?[a-z0-9][a-z0-9.-]*(?:\/[a-z0-9._~%/-]*)?$/i.test(value), '虚构网址格式无效')
const number = (min, max) => z.number().int().min(min).max(max)
const kind = z.enum(['flag','friend','clue','account'])
const condition = z.object({ mode: z.enum(['all','any']), rules: z.array(z.object({ kind, target: ref, value: z.boolean() })).max(60) })
const action = z.object({ kind: z.enum(['none','app','card','chat','moments','image','file','url','modal','clue','flag','unlock','event']),
  target: text, value: z.boolean().optional(), when: condition.optional() })
const row = fields => z.object({ id, ...fields })
const named = row({ name: short })
const when = condition.optional()
const maybeAction = action.optional()
export const allowedMimes = ['image/png','image/jpeg','image/webp','image/gif','image/svg+xml','image/avif','audio/mpeg','audio/ogg','audio/wav','audio/mp4','audio/webm','audio/flac','text/plain','application/pdf','application/zip','application/octet-stream']
export const maxAsset = 8 * 1024 * 1024
export const maxProject = 36 * 1024 * 1024
const assetSchema = row({ name: short, category: short, mime: z.enum(allowedMimes), data: z.string().max(Math.ceil(maxAsset / 3) * 4 + 80) })
  .superRefine((asset, ctx) => {
    const prefix = 'data:' + asset.mime + ';base64,'
    const body = asset.data.slice(prefix.length)
    if (!asset.data.startsWith(prefix) || body.length % 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(body) ||
      (body.length / 4) * 3 - (body.endsWith('==') ? 2 : body.endsWith('=') ? 1 : 0) > maxAsset) {
      ctx.addIssue({ code: 'custom', path: ['data'], message: '素材必须是受支持的本地 Base64 文件' })
    }
  })
const iconColors = z.object({
  plate: color.optional(), border: color.optional(), fill: color.optional(), accent: color.optional(), stroke: color.optional()
})
const iconTheme = z.object({
  size: number(...iconRanges.size).optional(),
  radius: number(...iconRanges.radius).optional(),
  opacity: number(...iconRanges.opacity).optional(),
  scale: number(...iconRanges.scale).optional(),
  glyphs: z.record(z.string().refine(key => builtinIcons.includes(key), '未注册的内置图标'),iconColors).optional()
})
const appIconFields = {
  icon: ref,
  iconMode: z.enum(['plate','original']).optional(),
  iconColors: iconColors.optional()
}
const iconThemeFile = z.object({
  format: z.literal('maroon-icon-theme'),
  version: z.literal(1),
  theme: iconTheme,
  apps: z.array(row(appIconFields)).max(100),
  assets: z.array(assetSchema).max(100)
}).superRefine((file, ctx) => {
  const assetIds = new Set(file.assets.map(asset => asset.id))
  const appIds = new Set(file.apps.map(app => app.id))
  if (assetIds.size !== file.assets.length || appIds.size !== file.apps.length) {
    ctx.addIssue({ code:'custom', message:'图标主题含重复的应用或素材 ID' })
  }
  for (const asset of file.assets) {
    if (!asset.mime.startsWith('image/')) {
      ctx.addIssue({ code:'custom', path:['assets',asset.id], message:'图标素材必须为图片' })
    }
  }
  for (const app of file.apps) {
    if (app.icon && !builtinIcons.includes(app.icon) && !assetIds.has(app.icon)) {
      ctx.addIssue({ code:'custom', path:['apps',app.id], message:'图标主题缺少应用引用的素材' })
    }
  }
})
export function parseIconTheme(input) {
  const result = iconThemeFile.safeParse(input)
  if (!result.success) throw new Error(result.error.issues.slice(0,5).map(issue => (
    [issue.path.join('.'),issue.message].filter(Boolean).join(' · ')
  )).join('\n'))
  return result.data
}

export const projectSchema = z.object({
  version: z.literal(1), theme: z.object({
    icons: iconTheme.optional(),
    wallpaper: ref, wallpaperMode: z.enum(['image','solid']).optional(), background: color, surface: color, text: color, accent: color, border: color,
    font: short.regex(/^[\p{L}\p{N} ,'-]+$/u, '字体名称无效'), fontSize: number(11,30), gap: number(0,36), radius: number(0,40),
    windowWidth: number(320,2400), windowHeight: number(180,1600), layout: z.enum(['grid','column'])
  }),
  apps: z.array(row({ name: short, ...appIconFields, type: z.enum(['chat','browser','notes','trash','unavailable']), enabled: z.boolean(), dock: z.boolean(),
    row: number(1,30), column: number(1,20), action: maybeAction })).max(100),
  contacts: z.array(row({ name: short, account: short, remark: short, avatar: ref, color, signature: text, region: short, bio: text,
    custom: z.array(z.object({ label: short, value: text, hidden: z.boolean() })), hidden: z.array(z.enum(['name','avatar','account','remark','signature','region','bio','moments','chat'])),
    initial: z.boolean(), searchable: z.boolean(), cover: ref, unlock: when, onAdd: maybeAction })),
  threads: z.array(row({ name: short, kind: z.enum(['direct','group']), avatar: ref, announcement: text, when,
    members: z.array(z.object({contact: ref, nickname: short})),
    messages: z.array(row({ sender: ref, type: z.enum(['text','image','system','date','link','file']), text, time: short,
      media: ref, url: local, when, action: maybeAction, onRead: maybeAction })) })),
  posts: z.array(row({ author: ref, text, time: short, location: short, images: z.array(ref).max(9), layout: z.enum(['grid','strip']),
    likes: z.array(ref), comments: z.array(row({ sender: ref, text, replyTo: ref })), when, action: maybeAction, imageAction: maybeAction, hiddenClue: ref })),
  assets: z.array(assetSchema),
  pages: z.array(row({ title: short, url: local, body: text, kind: z.enum(['article','student']), image: ref,
    layout: z.enum(['article','compact']), when, action: maybeAction, actionLabel: short })),
  search: z.array(row({ title: short, keywords: text, summary: text, thumbnail: ref, page: ref, order: number(-100000,100000), when })),
  accounts: z.array(row({ name: short, username: short, password: short, page: ref, when, onLogin: maybeAction })),
  notes: z.array(row({ title: short, body: text, date: short, asset: ref, when, action: maybeAction })),
  trash: z.array(row({ title: short, body: text, date: short, asset: ref, when, action: maybeAction })),
  events: z.array(row({ name: short, when, actions: z.array(action).max(60) })),
  flags: z.array(named), clues: z.array(named), home: ref, notFound: ref
})
export function parseProject(input) {
  const result = projectSchema.safeParse(input)
  if (!result.success) {
    const details = result.error.issues.slice(0, 30).map(issue => issue.path.join('.') + ' · ' + issue.message)
    throw new Error(details.join('\n'))
  }
  return result.data
}

export const cleanUrl = value => value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '')
const projectLists = ['apps','contacts','threads','posts','assets','pages','search','accounts','notes','trash','events','flags','clues']
export function demoResources(project) {
  return projectLists.flatMap(key => project[key].flatMap(item => [
    item.id, ...(item.messages || []).map(message => message.id), ...(item.comments || []).map(comment => comment.id)
  ])).filter(id => id.startsWith('demo-'))
}
export function validateReferences(project) {
  const errors = []
  const need = (ok, where, message) => { if (!ok) errors.push(where + ' · ' + message) }
  const seen = new Set(['self'])
  const maps = Object.fromEntries(projectLists.map(key => [key, new Map(project[key].map(row => [row.id,row]))]))
  const links = new Map(project.pages.map(page => [cleanUrl(page.url),page]))
  const recordId = (id, where) => { need(!seen.has(id), where, '资源 ID 重复'); seen.add(id) }
  const lookup = (key, value, where, required = false) => {
    if (value || required) need(maps[key].has(value), where, '关联资源缺失' + (value ? '（' + value + '）' : ''))
    return maps[key].get(value)
  }
  const art = (value, where, required = false) => {
    const asset = lookup('assets', value, where, required)
    if (asset) need(asset.mime.startsWith('image/'), where, '需要图片素材')
  }
  const conditions = { flag: 'flags', friend: 'contacts', account: 'accounts', clue: 'clues' }
  const checkCond = (condition, where) => condition?.rules.forEach(rule => lookup(conditions[rule.kind], rule.target, where + '条件', true))
  const targets = { app:'apps', card:'contacts', file:'assets', clue:'clues', flag:'flags', unlock:'flags', event:'events' }
  const checkAction = (action, where) => {
    if (!action) return
    checkCond(action.when, where)
    if (targets[action.kind]) lookup(targets[action.kind], action.target, where, true)
    else if (action.kind === 'chat') need(maps.threads.has(action.target) || maps.contacts.has(action.target), where, '需要会话或联系人')
    else if (action.kind === 'moments') lookup('contacts', action.target, where)
    else if (action.kind === 'image') art(action.target, where, true)
    else if (action.kind === 'url') need(links.has(cleanUrl(action.target)) && Boolean(action.target), where, '需要选择一个内部网址')
    else if (action.kind === 'modal') need(Boolean(action.target.trim()), where, '请输入弹窗内容')
  }
  const duplicates = (values, where) => need(new Set(values).size === values.length, where, '存在重复项')
  const names = { apps:'桌面应用', contacts:'联系人', threads:'会话', posts:'动态', assets:'素材', pages:'网页', search:'搜索结果',
    accounts:'虚构账号', notes:'备忘录', trash:'回收站', events:'事件', flags:'剧情状态', clues:'线索' }
  for (const key of projectLists) for (const row of project[key]) {
    const where = names[key] + '「' + (row.name || row.title || row.id) + '」'
    recordId(row.id, where)
    checkCond(row.when, where)
    checkAction(row.action, where + '行为')
    if (['apps','contacts','events','clues','flags','assets','accounts'].includes(key)) need(Boolean(row.name.trim()), where, '名称不能为空')
    if (['pages','search','notes','trash'].includes(key)) need(Boolean(row.title.trim()), where, '标题不能为空')
    if (key === 'apps' && !builtinIcons.includes(row.icon)) art(row.icon, where + '图标')
    if (key === 'contacts') {
      art(row.avatar, where + '头像')
      art(row.cover, where + '封面')
      checkCond(row.unlock, where + '解锁')
      checkAction(row.onAdd, where + '添加好友')
      if (row.searchable) need(Boolean(row.account.trim()), where, '可搜索联系人需要账号')
    }
    if (key === 'threads') {
      art(row.avatar, where + '头像')
      need(row.kind === 'group' ? Boolean(row.name.trim()) : row.members.length === 1, where, '群聊需要名称，单人会话需要一位联系人')
      duplicates(row.members.map(member => member.contact), where + '成员')
      row.members.forEach(member => lookup('contacts', member.contact, where + '成员', true))
      row.messages.forEach((message, index) => {
        const label = where + '消息 ' + (index + 1)
        recordId(message.id, label)
        if (message.type !== 'system' && message.type !== 'date' && message.sender !== 'self') {
          need(row.members.some(member => member.contact === message.sender), label, '发送者须为会话成员')
        }
        checkCond(message.when, label)
        checkAction(message.action, label + '点击行为')
        checkAction(message.onRead, label + '阅读事件')
        if (message.type === 'image') art(message.media, label, true)
        else lookup('assets', message.media, label, message.type === 'file')
        if (message.type === 'link' && !message.action) need(links.has(cleanUrl(message.url)) && Boolean(message.url), label, '网址未关联内部页面')
      })
    }
    if (key === 'posts') {
      lookup('contacts', row.author, where + '发布者', true)
      row.images.forEach(image => art(image, where, true))
      row.likes.forEach(person => lookup('contacts', person, where + '点赞人', true))
      duplicates(row.likes, where + '点赞人')
      checkAction(row.imageAction, where + '图片行为')
      lookup('clues', row.hiddenClue, where + '线索')
      const prior = new Set()
      row.comments.forEach(comment => {
        recordId(comment.id, where + '评论')
        lookup('contacts', comment.sender, where + '评论作者', true)
        if (comment.replyTo) need(prior.has(comment.replyTo), where, '回复目标须为前面的评论')
        prior.add(comment.id)
      })
    }
    if (key === 'pages') {
      need(Boolean(cleanUrl(row.url)), where, '请输入虚构网址')
      art(row.image, where)
    }
    if (key === 'search') { art(row.thumbnail, where); lookup('pages', row.page, where, true) }
    if (key === 'accounts') {
      const page = lookup('pages', row.page, where, true)
      if (page) need(page.kind === 'student', where, '请选择有登录表单的页面')
      need(Boolean(row.username.trim() && row.password), where, '请填写虚构账号与密码')
      checkAction(row.onLogin, where + '登录事件')
    }
    if (key === 'notes' || key === 'trash') lookup('assets', row.asset, where + '附件')
    if (key === 'events') row.actions.forEach(action => checkAction(action, where))
  }
  duplicates(project.contacts.filter(c => c.account.trim()).map(c => c.account.trim().toLowerCase()), '联系人账号')
  duplicates(project.threads.filter(t => t.kind === 'direct').map(t => t.members[0]?.contact).filter(Boolean), '单人会话联系人')
  duplicates(project.accounts.map(a => a.page + '|' + a.username.trim()), '同一网页的虚构账号')
  duplicates(project.pages.map(p => cleanUrl(p.url)).filter(Boolean), '虚构网址')
  art(project.theme.wallpaper, '主题壁纸')
  lookup('pages', project.home, '浏览器主页')
  lookup('pages', project.notFound, '浏览器 404 页面')
  if (project.theme.layout === 'grid') duplicates(project.apps.map(app => app.column + '/' + app.row), '桌面图标位置')
  return errors
}
export function assetUsages(project, target) {
  const usages = []
  const walk = (value, path) => {
    if (Array.isArray(value)) value.forEach((item,index) => walk(item, path + '[' + (index + 1) + ']'))
    else if (value && typeof value === 'object') {
      if (Object.hasOwn(value, 'kind') && Object.hasOwn(value, 'target')) {
        if ((value.kind === 'file' || value.kind === 'image') && value.target === target) usages.push(path)
        return
      }
      for (const [key, item] of Object.entries(value)) {
        if (['wallpaper','icon','avatar','cover','media','image','thumbnail','asset'].includes(key) && item === target) usages.push(path + '.' + key)
        else if (key === 'images' && item.includes(target)) usages.push(path + '.images')
        else if (typeof item === 'object') walk(item, path ? path + '.' + key : key)
      }
    }
  }
  const { assets, ...rest } = project
  walk(rest, '')
  return usages
}
export function validatePublish(input) {
  const project = parseProject(input)
  const errors = validateReferences(project)
  if (demoResources(project).length) errors.unshift('项目仍含独立测试资源。请移除测试数据后再发布。')
  if (errors.length) throw new Error(errors.join('\n'))
  return project
}
