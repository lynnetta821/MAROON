import { Upload } from 'lucide-react'
import type { Account, App, Asset, Entry, Page, Search, StoryEvent } from '../game/types'
import { iconRegistry, builtinIcons } from '../icons/registry.mjs'
import type { Patch } from './ChatFields'
import { ActionField, AssetField, ChoiceField, ConditionField, NumberField, SmallButton, SortList, TextField, Toggle, choice, choiceList, pageChoices, readAsset, useStudio } from './controls'

export const appTypes = [choice('chat','绿泡泡'),choice('browser','浏览器'),choice('notes','工作备忘录'),choice('trash','回收站'),choice('unavailable','暂不可用')]
export function AppFields({ row, patch }: { row: App; patch: Patch<App> }) {
  const { project } = useStudio()
  return <>
    <TextField label="应用名称" value={row.name} onChange={name => patch({name})} />
    <ChoiceField label="图标" value={row.icon} options={[...builtinIcons.map(id => choice(id,iconRegistry[id as keyof typeof iconRegistry].name)),
      ...choiceList(project.assets.filter(a => a.mime.startsWith('image/')),a => a.name)]} onChange={icon => patch({icon})} />
    <ChoiceField label="默认打开内容" value={row.type} options={appTypes} onChange={type => patch({type:type as App['type']})} />
    <div className="studio-pair">
      <NumberField label="位置列" min={1} max={20} value={row.column} onChange={column => patch({column})} />
      <NumberField label="位置行" min={1} max={30} value={row.row} onChange={row => patch({row})} />
    </div>
    <Toggle label="应用可用" checked={row.enabled} onChange={enabled => patch({enabled})} />
    <Toggle label="固定到任务栏" checked={row.dock} onChange={dock => patch({dock})} />
    <ActionField label="点击桌面图标时" value={row.action} onChange={action => patch({action})} />
  </>
}
export function ThemeFields() {
  const { project, update } = useStudio()
  const { theme } = project
  const set = <K extends keyof typeof theme>(key: K, value: typeof theme[K]) => update(p => ({ ...p,theme:{ ...p.theme,[key]:value } }))
  const colors = [['background','背景色'],['surface','窗口底色'],['text','文字颜色'],['accent','主题颜色'],['border','边框颜色']] as const
  const numbers = [['fontSize','字号',11,30],['gap','消息间距',0,36],['radius','窗口圆角',0,40],['windowWidth','默认窗口宽度',320,2400],['windowHeight','默认窗口高度',180,1600]] as const
  return <>
    <ChoiceField label="背景模式" value={theme.wallpaperMode || 'image'} options={[choice('image','壁纸'),choice('solid','纯色')]}
      onChange={value => set('wallpaperMode',value as 'image' | 'solid')} />
    {theme.wallpaperMode !== 'solid' && <AssetField label="壁纸" value={theme.wallpaper} onChange={value => set('wallpaper',value)} />}
    <ChoiceField label="桌面预设布局" value={theme.layout} options={[choice('grid','网格'),choice('column','竖列（跟随资源排序）')]}
      onChange={value => set('layout',value as typeof theme.layout)} />
    <TextField label="字体系列" value={theme.font} onChange={value => set('font',value)} />
    <div className="studio-pair">{colors.map(([key,label]) => <TextField key={key} type="color" label={label} value={theme[key]} onChange={value => set(key,value)} />)}</div>
    <div className="studio-pair">{numbers.map(([key,label,min,max]) => <NumberField key={key} label={label} min={min} max={max} value={theme[key]} onChange={value => set(key,value)} />)}</div>
  </>
}
export function AssetFields({ row, patch }: { row: Asset; patch: Patch<Asset> }) {
  const { report } = useStudio()
  return <>
    <TextField label="素材名称" value={row.name} onChange={name => patch({name})} />
    <TextField label="分类（例如头像、壁纸、图标、音频）" value={row.category} onChange={category => patch({category})} />
    {row.mime.startsWith('image/') && <img className="asset-editor-preview" src={row.data} alt={row.name} />}
    {row.mime.startsWith('audio/') && <audio className="asset-editor-preview" controls src={row.data} />}
    <p className="studio-hint">{row.mime} · {Math.ceil(row.data.length * .75 / 1024)} KiB</p>
    <label className="file-label"><Upload size={14} />替换文件<input type="file" aria-label="替换素材文件" onChange={async e => {
      const file = e.target.files?.[0]
      e.target.value = ''
      if (!file) return
      try { const next = await readAsset(file,row.mime.startsWith('image/'),row); patch({mime:next.mime,data:next.data}) }
      catch (error) { report((error as Error).message) }
    }} /></label>
    <a className="studio-small" download={row.name} href={row.data}>下载原文件</a>
  </>
}
export function PageFields({ row, patch }: { row: Page; patch: Patch<Page> }) {
  return <>
    <TextField label="页面标题" value={row.title} onChange={title => patch({title})} />
    <TextField label="虚构网址" value={row.url} onChange={url => patch({url})} />
    <ChoiceField label="页面类型" options={[choice('article','内容页'),choice('student','学生信息系统（含虚构登录）')]}
      value={row.kind} onChange={kind => patch({kind:kind as Page['kind']})} />
    <ChoiceField label="页面布局" options={[choice('article','文章布局'),choice('compact','紧凑卡片')]}
      value={row.layout} onChange={layout => patch({layout:layout as Page['layout']})} />
    <AssetField label="页面图片" value={row.image} onChange={image => patch({image})} />
    <TextField label="网页正文" type="textarea" value={row.body} onChange={body => patch({body})} />
    <ConditionField label="网页可见条件" value={row.when} onChange={when => patch({when})} />
    <TextField label="交互按钮文字" value={row.actionLabel} onChange={actionLabel => patch({actionLabel})} />
    <ActionField label="网页按钮行为" value={row.action} onChange={action => patch({action})} />
  </>
}
export function SearchFields({ row, patch }: { row: Search; patch: Patch<Search> }) {
  const { project } = useStudio()
  return <>
    <TextField label="结果标题" value={row.title} onChange={title => patch({title})} />
    <TextField label="关键词及别名（逗号或换行分隔）" type="textarea" value={row.keywords} onChange={keywords => patch({keywords})} />
    <TextField label="结果摘要" type="textarea" value={row.summary} onChange={summary => patch({summary})} />
    <AssetField label="结果缩略图" value={row.thumbnail} onChange={thumbnail => patch({thumbnail})} />
    <ChoiceField label="目标网页" value={row.page} empty="选择页面" options={pageChoices(project)} onChange={page => patch({page})} />
    <NumberField label="搜索结果排序（从小到大）" value={row.order} min={-100000} max={100000} onChange={order => patch({order})} />
    <ConditionField label="结果可见条件" value={row.when} onChange={when => patch({when})} />
  </>
}
export function AccountFields({ row, patch }: { row: Account; patch: Patch<Account> }) {
  const { project } = useStudio()
  return <>
    <p className="studio-hint">这些数据会随项目发布。仅输入剧情用的虚构账号。</p>
    <TextField label="账号名称" value={row.name} onChange={name => patch({name})} />
    <TextField label="虚构登录账号" value={row.username} onChange={username => patch({username})} />
    <TextField label="虚构登录密码" value={row.password} onChange={password => patch({password})} />
    <ChoiceField label="可登录网页" value={row.page} empty="选择学生系统页面" options={choiceList(project.pages.filter(a => a.kind === 'student'),a => a.title)}
      onChange={page => patch({page})} />
    <ConditionField label="账号解锁条件" value={row.when} onChange={when => patch({when})} />
    <ActionField label="登录后触发" value={row.onLogin} onChange={onLogin => patch({onLogin})} />
  </>
}
export function EntryFields({ row, patch }: { row: Entry; patch: Patch<Entry> }) {
  return <>
    <TextField label="标题" value={row.title} onChange={title => patch({title})} />
    <TextField label="日期" value={row.date} onChange={date => patch({date})} />
    <TextField label="正文" type="textarea" value={row.body} onChange={body => patch({body})} />
    <AssetField label="附件" value={row.asset} imageOnly={false} onChange={asset => patch({asset})} />
    <ConditionField label="条目可见条件" value={row.when} onChange={when => patch({when})} />
    <ActionField label="条目附加行为" value={row.action} onChange={action => patch({action})} />
  </>
}
export function EventFields({ row, patch }: { row: StoryEvent; patch: Patch<StoryEvent> }) {
  return <>
    <TextField label="事件名称" value={row.name} onChange={name => patch({name})} />
    <ConditionField label="事件执行条件" value={row.when} onChange={when => patch({when})} />
    <SortList label="事件行为排序" rows={row.actions} identify={(_,i) => String(i)} setRows={actions => patch({actions})} render={(action,i) => <div className="studio-block">
      <ActionField label={`第 ${i + 1} 个行为`} value={action} onChange={value =>
        patch({actions:row.actions.map((item,n) => n === i ? value || {kind:'none',target:''} : item)})} />
      <SmallButton remove onClick={() => patch({actions:row.actions.filter((_,n) => n !== i)})}>删除行为</SmallButton>
    </div>} />
    <SmallButton onClick={() => patch({actions:[...row.actions,{kind:'none',target:''}]})}>新增事件行为</SmallButton>
  </>
}
