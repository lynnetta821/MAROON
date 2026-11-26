import { createContext, useContext, useRef } from 'react'
import type { ReactNode } from 'react'
import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2, Upload } from 'lucide-react'
import type { Action, ActionKind, Asset, Condition, Project } from '../game/types'
import { makeId } from '../game/state'
import { allowedMimes, maxAsset } from '../game/schema.mjs'

export type Choice = { value: string; label: string }
export const choice = (value: string, label: string): Choice => ({ value, label })
export const choiceList = <T extends { id: string }>(items: T[], name: (item: T) => string) => items.map(item => choice(item.id, name(item) || '未命名'))
export const contactChoices = (p: Project) => choiceList(p.contacts, c => c.remark || c.name)
export const pageChoices = (p: Project) => choiceList(p.pages, a => a.title)
export const peopleChoices = (p: Project, ids: string[]) => contactChoices(p).filter(c => ids.includes(c.value))

type StudioContextValue = { project: Project; update: (update: (current: Project) => Project) => void; report: (message: string) => void }
export const StudioContext = createContext<StudioContextValue | null>(null)
export function useStudio() {
  const value = useContext(StudioContext)
  if (!value) throw new Error('StudioContext is required')
  return value
}
export function TextField({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="studio-field"><span>{label}</span>{type === 'textarea' ?
    <textarea aria-label={label} value={value} onChange={e => onChange(e.target.value)} rows={3} /> :
    <input aria-label={label} type={type} value={value} onChange={e => onChange(e.target.value)} />}</label>
}
export function NumberField({ label, value, onChange, min, max }: { label: string; value: number; onChange: (value: number) => void; min: number; max: number }) {
  return <label className="studio-field"><span>{label}</span><input aria-label={label} type="number" value={value} min={min} max={max}
    onChange={e => { if (e.target.value !== '') onChange(Number(e.target.value)) }} onBlur={() => {
      const n = Math.round(Math.min(max, Math.max(min, value)))
      if (n !== value) onChange(n)
    }} /></label>
}
export function ChoiceField({ label, value, onChange, options, empty }: { label: string; value: string; onChange: (value: string) => void; options: Choice[]; empty?: string }) {
  return <label className="studio-field"><span>{label}</span><select aria-label={label} value={value} onChange={e => onChange(e.target.value)}>
    {empty !== undefined && <option value="">{empty}</option>}
    {value && !options.some(o => o.value === value) && <option value={value}>缺失 · {value}</option>}
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select></label>
}
export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="studio-toggle"><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />{label}</label>
}
export function CheckList({ choices, selected, onChange }: { choices: Choice[]; selected: string[]; onChange: (value: string[]) => void }) {
  const all = [...choices, ...selected.filter(id => !choices.some(c => c.value === id)).map(id => choice(id, '缺失 · ' + id))]
  return <div className="studio-checklist">{all.map(o => <Toggle key={o.value} label={o.label} checked={selected.includes(o.value)}
    onChange={checked => onChange(checked ? [...selected,o.value] : selected.filter(item => item !== o.value))} />)}
    {!all.length && <small>暂无可选资源</small>}
  </div>
}
export function Fold({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  return <details className="studio-fold" open={defaultOpen || undefined}><summary>{title}</summary><div>{children}</div></details>
}
export function SortList<T>({ rows, setRows, render, label, identify, selected }: {
  rows: T[]; setRows: (items: T[]) => void; render: (row: T, index: number) => ReactNode; label: string; identify: (row: T, index: number) => string; selected?: string
}) {
  const drag = useRef<number | null>(null)
  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= rows.length) return
    const next = [...rows]
    const [row] = next.splice(from, 1)
    next.splice(to, 0, row)
    setRows(next)
  }
  return <div className="sort-list" aria-label={label}>{rows.map((row,i) => {
    const key = identify(row,i)
    return <div className={`sort-row ${key === selected ? 'selected' : ''}`} key={key}
      onDragOver={event => { if (drag.current !== null) { event.preventDefault(); event.dataTransfer.dropEffect = 'move' } }}
      onDrop={event => { if (drag.current === null) return; event.preventDefault(); event.stopPropagation(); move(drag.current,i); drag.current = null }}>
      <span title="拖拽排序" aria-hidden="true" className="drag-grip" draggable onDragStart={event => {
        drag.current = i; event.dataTransfer.setData('text/plain', key); event.dataTransfer.effectAllowed = 'move'
      }} onDragEnd={() => { drag.current = null }}><GripVertical size={15} /></span>
      <div className="sort-value">{render(row,i)}</div>
      <div className="sort-arrows">
        <button className="studio-icon" type="button" disabled={!i} aria-label={`上移第 ${i + 1} 项`} onClick={() => move(i,i - 1)}><ChevronUp size={13} /></button>
        <button className="studio-icon" type="button" disabled={i === rows.length - 1} aria-label={`下移第 ${i + 1} 项`} onClick={() => move(i,i + 1)}><ChevronDown size={13} /></button>
      </div>
    </div>
  })}</div>
}
export function SmallButton({ children, onClick, remove = false, disabled = false }: {
  children: ReactNode; onClick: () => void; remove?: boolean; disabled?: boolean
}) {
  return <button className={`studio-small ${remove ? 'danger' : ''}`} type="button" onClick={onClick} disabled={disabled}>{remove ? <Trash2 size={14} /> : <Plus size={14} />}{children}</button>
}
const fallbackMime: Record<string,string> = { svg:'image/svg+xml',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',
  gif:'image/gif',avif:'image/avif',mp3:'audio/mpeg',wav:'audio/wav',ogg:'audio/ogg',m4a:'audio/mp4',flac:'audio/flac',webm:'audio/webm',
  txt:'text/plain', pdf:'application/pdf',zip:'application/zip' }
export async function readAsset(file: File, imageOnly: boolean, existing?: Asset): Promise<Asset> {
  if (file.size > maxAsset || !file.size) throw new Error('素材大小应在 1 字节至 8 MiB 之间。')
  const mime = fallbackMime[file.name.split('.').at(-1)?.toLowerCase() || ''] || file.type || 'application/octet-stream'
  if (!allowedMimes.includes(mime) || (imageOnly && !mime.startsWith('image/'))) throw new Error('这种文件格式不可用。')
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('无法读取文件。'))
    reader.onload = () => resolve(String(reader.result))
    reader.readAsDataURL(new Blob([file], { type: mime }))
  })
  return { id: existing?.id || makeId(), name: existing?.name || file.name.slice(0,220), category: existing?.category || (mime.startsWith('image/') ? '图片' : mime.startsWith('audio/') ? '音频' : '附件'), mime, data }
}
export function AssetField({ label, value, onChange, imageOnly = true }: { label: string; value: string; onChange: (id: string) => void; imageOnly?: boolean }) {
  const { project, update, report } = useStudio()
  const assets = project.assets.filter(a => !imageOnly || a.mime.startsWith('image/'))
  const asset = assets.find(a => a.id === value)
  return <div className="studio-asset-field">
    <ChoiceField label={label} value={value} onChange={onChange} options={choiceList(assets,a => a.name)} empty="默认 / 无素材" />
    <div className="asset-inline">
      {asset?.mime.startsWith('image/') && <img src={asset.data} alt={asset.name} />}
      <label className="file-label"><Upload size={14} />上传{label}<input type="file" aria-label={`上传${label}`} accept={imageOnly ? 'image/*,.svg' : allowedMimes.join(',')} onChange={async e => {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file) return
        try {
          const item = await readAsset(file,imageOnly)
          update(p => ({ ...p, assets: [...p.assets,item] }))
          onChange(item.id)
        } catch (error) { report((error as Error).message) }
      }} /></label>
    </div>
  </div>
}
const conditions = [choice('flag','剧情状态'),choice('friend','好友关系'),choice('clue','已收集线索'),choice('account','已登录账号')]
export function conditionTargets(project: Project, kind: Condition['rules'][number]['kind']) {
  if (kind === 'friend') return contactChoices(project)
  const key = kind === 'flag' ? 'flags' : kind === 'clue' ? 'clues' : 'accounts'
  return choiceList(project[key], a => a.name)
}
export function ConditionField({ label, value, onChange }: { label: string; value?: Condition; onChange: (value?: Condition) => void }) {
  const { project } = useStudio()
  const rules = value?.rules ?? []
  const mode = value?.mode ?? 'all'
  const setRule = (n: number, patch: Partial<Condition['rules'][number]>) => onChange({ mode, rules: rules.map((r,i) => i === n ? { ...r, ...patch } : r) })
  return <Fold title={label + (rules.length ? ' · ' + rules.length + ' 条' : '')}>
    <ChoiceField label="组合方式" value={mode} options={[choice('all','全部满足（AND）'),choice('any','任一满足（OR）')]}
      onChange={next => onChange({ mode: next as Condition['mode'], rules })} />
    {rules.map((rule,i) => <div className="studio-block" key={i}>
      <ChoiceField label="条件类别" value={rule.kind} options={conditions} onChange={value => setRule(i,{ kind: value as typeof rule.kind, target: '' })} />
      <ChoiceField label="条件目标" value={rule.target} empty="选择资源" options={conditionTargets(project,rule.kind)} onChange={target => setRule(i,{ target })} />
      <Toggle label="目标为真" checked={rule.value} onChange={value => setRule(i,{ value })} />
      <SmallButton remove onClick={() => onChange(rules.length === 1 ? undefined : { mode, rules: rules.filter((_,idx) => idx !== i) })}>删除条件</SmallButton>
    </div>)}
    <SmallButton onClick={() => onChange({ mode, rules: [...rules,{ kind:'flag', target:project.flags[0]?.id || '', value:true }] })}>添加条件</SmallButton>
  </Fold>
}
const actionChoices: Choice[] = [
  choice('none','无行为'),choice('app','打开应用'),choice('card','打开好友名片'),choice('chat','打开聊天'),choice('moments','打开朋友圈'),
  choice('image','打开图片查看器'),choice('file','打开文件'),choice('url','跳转游戏内网址'),choice('modal','显示弹窗'),
  choice('clue','记录线索'),choice('flag','设置剧情状态'),choice('unlock','解锁内容'),choice('event','触发剧情事件')
]
function targets(p: Project, kind: ActionKind) {
  switch (kind) {
    case 'app': return choiceList(p.apps,a => a.name)
    case 'card':
    case 'moments': return contactChoices(p)
    case 'chat': return [...choiceList(p.threads.filter(t => t.kind === 'group'),a => a.name),...contactChoices(p)]
    case 'image': return choiceList(p.assets.filter(a => a.mime.startsWith('image/')),a => a.name)
    case 'file': return choiceList(p.assets,a => a.name)
    case 'url': return p.pages.filter(a => a.url).map(a => choice(a.url,a.title + ' · ' + a.url))
    case 'clue': return choiceList(p.clues,a => a.name)
    case 'flag':
    case 'unlock': return choiceList(p.flags,a => a.name)
    case 'event': return choiceList(p.events,a => a.name)
    default: return []
  }
}
export function ActionField({ label, value, onChange }: { label: string; value?: Action; onChange: (value?: Action) => void }) {
  const { project } = useStudio()
  const current = value || { kind: 'none', target: '' }
  return <Fold title={label + (value ? ' · ' + (actionChoices.find(o => o.value === value.kind)?.label || '') : '')}>
    <ChoiceField label="行为类型" value={value?.kind || 'default'} options={[choice('default','使用默认行为'),...actionChoices]}
      onChange={value => onChange(value === 'default' ? undefined : { kind: value as ActionKind, target: '' })} />
    {current.kind === 'modal' ? <TextField label="弹窗内容" type="textarea" value={current.target} onChange={target => onChange({ ...current, target })} /> :
      current.kind !== 'none' && <ChoiceField label="行为目标" value={current.target} empty={current.kind === 'moments' ? '全部动态' : '选择资源'}
        options={targets(project,current.kind)} onChange={target => onChange({ ...current,target })} />}
    {current.kind === 'flag' && <Toggle label="设为开启" checked={current.value !== false} onChange={value => onChange({ ...current,value })} />}
    {current.kind !== 'none' && <ConditionField label="行为条件" value={current.when} onChange={when => onChange({ ...current,when })} />}
  </Fold>
}
