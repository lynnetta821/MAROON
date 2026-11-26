import { useEffect, useState } from 'react'
import { FileText, NotebookPen, Paperclip, Search, Trash2 } from 'lucide-react'
import { useGame } from '../game/context'
import { matches } from '../game/state'

export function Entries({ kind }: { kind: 'notes' | 'trash' }) {
  const { project,state,act,entryRequest } = useGame()
  const [query,setQuery] = useState('')
  const [selected,setSelected] = useState('')
  const items = project[kind].filter(item => matches(item.when,state,project))
  const filtered = items.filter(item => (item.title + ' ' + item.body).toLowerCase().includes(query.trim().toLowerCase()))
  const entry = filtered.find(item => item.id === selected) || filtered[0]
  const Icon = kind === 'notes' ? NotebookPen : Trash2
  const title = kind === 'notes' ? '备忘录' : '已删除的文件'
  const asset = project.assets.find(a => a.id === entry?.asset)
  useEffect(() => { if (entryRequest) { setSelected(entryRequest); setQuery('') } },[entryRequest])
  return <div className={`entries-app ${kind}`}>
    <aside className="entry-list">
      <h2><Icon size={18} />{title}</h2>
      <label className="entry-search"><Search size={15} /><input type="search" value={query} onChange={e => setQuery(e.target.value)} aria-label="搜索条目" placeholder="搜索条目" /></label>
      {filtered.map(item => <button className={`entry-row ${entry?.id === item.id ? 'selected' : ''}`} key={item.id} onClick={() => setSelected(item.id)}>
        <FileText size={18} /><span><strong>{item.title}</strong>{item.date && <time>{item.date}</time>}</span>
      </button>)}
      {!filtered.length && <p className="entry-empty">{query ? '没有匹配条目' : '暂无可见内容'}</p>}
    </aside>
    {entry ? <article className="entry-view">
      <span className="section-symbol"><FileText size={22} /></span>
      <h1>{entry.title}</h1>
      {entry.date && <time>{entry.date}</time>}
      <div className="app-prose">{entry.body}</div>
      <div className="entry-actions">
        {asset && <button className="secondary-button" onClick={() => act({kind:'file',target:asset.id})}><Paperclip size={15} /> {asset.name}</button>}
        {entry.action && entry.action.kind !== 'none' && <button className="primary-button" onClick={() => act(entry.action)}>查看详情</button>}
      </div>
    </article> : <div className="empty-state entry-view"><Icon size={28} />选择条目后查看内容</div>}
  </div>
}
