import { makeId } from '../game/state'
import type { Project, Resource } from '../game/types'

export const modules = [
  { label:'系统', items:[['apps','桌面应用'],['icons','图标管理'],['theme','主题样式'],['assets','素材库']] },
  { label:'Chat Studio', items:[['contacts','联系人'],['direct','单人聊天'],['groups','群聊'],['posts','朋友圈']] },
  { label:'游戏资料', items:[['pages','页面管理'],['search','搜索数据库'],['accounts','虚构账号'],['notes','工作备忘录'],['trash','回收站']] },
  { label:'剧情', items:[['events','剧情事件'],['flags','剧情状态'],['clues','线索']] }
] as const
export type Module = typeof modules[number]['items'][number][0]
export type Collection = Exclude<keyof Project,'version' | 'theme' | 'home' | 'notFound'>
export type Item = Project[Collection][number]
export const collection = (module: Exclude<Module,'theme'|'icons'>): Collection => module === 'direct' || module === 'groups' ? 'threads' : module
export function getRows(project: Project, module: Module): Item[] {
  if (module === 'theme' || module === 'icons') return []
  const rows = project[collection(module)]
  return (module === 'direct' || module === 'groups') ?
    project.threads.filter(t => t.kind === (module === 'direct' ? 'direct' : 'group')) : rows
}
export function makeResource(module: Module, project: Project): Item | undefined {
  const id = makeId()
  switch (module) {
    case 'apps': {
      const first = Array.from({length: 600},(_,i) => ({ column:i % 20 + 1,row:Math.floor(i / 20) + 1 }))
        .sort((a,b) => (a.column > 2 ? 1 : 0) - (b.column > 2 ? 1 : 0))
        .find(cell => !project.apps.some(a => a.column === cell.column && a.row === cell.row))
      return { id,name:'新应用',icon:'files',type:'unavailable',enabled:false,dock:false,...(first || {column:1,row:1}) }
    }
    case 'contacts': return { id, name:'新联系人',account:'',remark:'',avatar:'',color:'#5e809f',signature:'',region:'',bio:'',custom:[],hidden:[],initial:true,searchable:false,cover:'' }
    case 'direct':
    case 'groups': return { id, name:module === 'direct' ? '' : '新群聊',kind:module === 'direct' ? 'direct' : 'group',avatar:'',members:[],announcement:'',messages:[] }
    case 'posts': return { id, author:'',text:'',time:'',location:'',images:[],layout:'grid',likes:[],comments:[],hiddenClue:'' }
    case 'pages': return { id,title:'新页面',url:'',body:'',kind:'article',image:'',layout:'article',actionLabel:'' }
    case 'search': return { id,title:'新搜索结果',keywords:'',summary:'',thumbnail:'',page:'',order:project.search.length }
    case 'accounts': return { id,name:'新虚构账号',username:'',password:'',page:'' }
    case 'notes':
    case 'trash': return { id,title:module === 'notes' ? '新备忘录' : '新回收站文件',body:'',date:'',asset:'' }
    case 'events': return { id,name:'新事件',actions:[] }
    case 'flags': return { id,name:'新剧情状态' }
    case 'clues': return { id,name:'新线索' }
    default: return undefined
  }
}
export function resourceName(project: Project, row: Item) {
  if ('members' in row && row.kind === 'direct') {
    const c = project.contacts.find(c => c.id === row.members[0]?.contact)
    return c?.remark || c?.name || '未选择聊天对象'
  }
  if ('name' in row) return row.name || '未命名'
  if ('title' in row) return row.title || '未命名'
  return row.text.trim().slice(0,40) || '新朋友圈动态'
}
export function copyResource(row: Item, project: Project): Item {
  const clone = { ...structuredClone(row), id:makeId() }
  if ('name' in clone && clone.name) clone.name += '（副本）'
  if ('title' in clone) clone.title += '（副本）'
  if ('account' in clone) { clone.account = ''; clone.searchable = false }
  if ('url' in clone) clone.url = ''
  if ('username' in clone) clone.username = ''
  if ('column' in clone) {
    const available = makeResource('apps',project)
    if (available && 'column' in available) { clone.column = available.column; clone.row = available.row }
  }
  if ('messages' in clone) clone.messages = clone.messages.map(m => ({ ...m,id:makeId() }))
  if ('comments' in clone) {
    const replacements = new Map(clone.comments.map(c => [c.id,makeId()]))
    clone.comments = clone.comments.map(c => ({ ...c,id:replacements.get(c.id)!,replyTo:replacements.get(c.replyTo) || '' }))
  }
  return clone
}
export function replaceRows(project: Project, module: Exclude<Module,'theme'|'icons'>, rows: Item[]): Project {
  const key = collection(module)
  if (module === 'direct' || module === 'groups') {
    const kind = module === 'groups' ? 'group' : 'direct'
    const others = project.threads.filter(t => t.kind !== kind)
    const threads = rows as Project['threads']
    return { ...project, threads:kind === 'group' ? [...threads,...others] : [...others,...threads] }
  }
  return { ...project, [key]:rows }
}
export function removeDemo(project: Project): Project {
  const demo = (id: string) => id.startsWith('demo-')
  const clean = <T extends Resource>(rows: T[]) => rows.filter(r => !demo(r.id))
  return {
    ...project, apps:clean(project.apps), contacts:clean(project.contacts), assets:clean(project.assets), pages:clean(project.pages),
    search:clean(project.search), accounts:clean(project.accounts), notes:clean(project.notes), trash:clean(project.trash),
    events:clean(project.events), flags:clean(project.flags), clues:clean(project.clues),
    threads:clean(project.threads).map(t => ({ ...t,messages:clean(t.messages) })),
    posts:clean(project.posts).map(p => ({ ...p,comments:clean(p.comments) })),
    home:demo(project.home) ? '' : project.home, notFound:demo(project.notFound) ? '' : project.notFound
  }
}
