import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Check, Copy, Download, Eye, FlaskConical, Gamepad2, LayoutGrid, Menu, Plus, Redo2, Save, Search as SearchIcon, Sparkles, Trash2, Undo2, Upload, X } from 'lucide-react'
import type { Account, App, Asset, Entry, Named, Page, PlayerState, Post, Project, Search, StoryEvent, Thread, Contact } from '../game/types'
import { emptyPlayer } from '../game/state'
import { assetUsages, demoResources, maxProject, parseProject, validateReferences } from '../game/schema.mjs'
import { Desktop } from '../ui/Desktop'
import { StudioContext, ChoiceField, CheckList, Fold, SortList, TextField, choiceList, readAsset } from './controls'
import { AccountFields, AppFields, AssetFields, EntryFields, EventFields, PageFields, SearchFields, ThemeFields } from './ProjectFields'
import { ContactFields, PostFields, ThreadFields } from './ChatFields'
import { copyResource, getRows, makeResource, modules, removeDemo, replaceRows, resourceName } from './resources'
import type { Item, Module } from './resources'
import type { useDraft } from './draft'
import type { ChatRoute } from '../game/context'

type Props = { draft: ReturnType<typeof useDraft>; base: Project; demo: Project; canPublish: boolean; exit: () => void; publish: (project: Project) => Promise<void> }
const names = Object.fromEntries(modules.flatMap<readonly [Module,string]>(group => group.items)) as Record<Module,string>
export function Studio({ draft, base, demo, canPublish, exit, publish }: Props) {
  const { project, update } = draft
  const [module,setModule] = useState<Module>('contacts')
  const [selected,setSelected] = useState('')
  const [message,setMessage] = useState('')
  const [query,setQuery] = useState('')
  const [notice,setNotice] = useState('')
  const [mode,setMode] = useState<'edit'|'player'>('edit')
  const [simulation,setSimulation] = useState<PlayerState>(emptyPlayer)
  const [check,setCheck] = useState<'validate'|'publish'|null>(null)
  const [working,setWorking] = useState(false)
  const [mobile,setMobile] = useState<'properties'|'resources'|'preview'>('properties')
  const importInput = useRef<HTMLInputElement>(null)
  const assetInput = useRef<HTMLInputElement>(null)
  const resources = getRows(project,module)
  const row = resources.find(r => r.id === selected) || resources[0]
  const filtered = resources.filter(r => {
    const value = resourceName(project,r) + ('category' in r ? ' ' + r.category : '')
    return value.toLowerCase().includes(query.trim().toLowerCase())
  })
  const demoCount = useMemo(() => demoResources(project).length,[project])
  const errors = useMemo(() => {
    if (!check) return []
    try { return validateReferences(parseProject(project)) }
    catch (error) { return (error as Error).message.split('\n') }
  },[project,check])
  const selectModule = (next: Module) => { setModule(next); setSelected(''); setMessage(''); setQuery(''); setMobile('resources') }
  const select = (id: string) => { setSelected(id); setMessage(''); setMobile('properties') }
  const add = () => {
    if (module === 'assets') { assetInput.current?.click(); return }
    if (module === 'theme') return
    const item = makeResource(module,project)
    if (item) {
      update(p => replaceRows(p,module,[...getRows(p,module),item]))
      select(item.id)
    }
  }
  const patch = <T extends Item>(fields: Partial<T>) => {
    if (module === 'theme' || !row) return
    update(p => replaceRows(p,module,getRows(p,module).map(r => r.id === row.id ? { ...r,...fields } as Item : r)))
  }
  const duplicate = () => {
    if (module === 'theme' || !row) return
    const copy = copyResource(row,project)
    update(p => replaceRows(p,module,[...getRows(p,module),copy]))
    select(copy.id)
  }
  const remove = () => {
    if (module === 'theme' || !row) return
    if (module === 'assets') {
      const usages = assetUsages(project,row.id)
      if (usages.length) { setNotice('素材仍被引用 · ' + usages.join('、')); return }
    }
    update(p => replaceRows(p,module,getRows(p,module).filter(r => r.id !== row.id)))
    setSelected('')
    setNotice('已从草稿删除，可按撤销恢复。')
  }
  const exportProject = () => {
    const blob = new Blob([JSON.stringify(project,null,2) + '\n'],{type:'application/json'})
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'medellin-project.json'
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url),5000)
    setNotice('已导出完整项目和内嵌素材。')
  }
  useEffect(() => {
    const save = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 's') return
      event.preventDefault()
      void draft.save(true)
    }
    window.addEventListener('keydown',save)
    return () => window.removeEventListener('keydown',save)
  },[draft.save])
  const upload = async (file?: File) => {
    if (!file) return
    try {
      const asset = await readAsset(file,false)
      update(p => ({ ...p,assets:[...p.assets,asset] }))
      select(asset.id)
    } catch (error) { setNotice((error as Error).message) }
  }
  const importProject = async (file?: File) => {
    if (!file) return
    try {
      if (file.size > maxProject) throw new Error('项目文件超过 36 MiB。')
      const data = parseProject(JSON.parse(await file.text())) as Project
      const report = validateReferences(data)
      update(() => data)
      setSelected('')
      setMessage('')
      setNotice(report.length ? `已导入草稿，共有 ${report.length} 项引用待修正。` : '项目及素材已导入草稿。')
      if (report.length) setCheck('validate')
    } catch (error) { setNotice('导入失败 · ' + (error as Error).message) }
  }
  const confirmPublish = async () => {
    setWorking(true)
    try {
      if (!await draft.save(true)) throw new Error('保存草稿失败。请检查保存状态，或导出当前项目。')
      await publish(project)
      setCheck(null)
      setNotice('正式游戏内容已发布到 data/published.json。')
    } catch (error) { setNotice((error as Error).message); setCheck(null) }
    finally { setWorking(false) }
  }
  const previewType = ['pages','search','accounts'].includes(module) ? 'browser' : module === 'notes' ? 'notes' : module === 'trash' ? 'trash' : 'chat'
  const previewApp = module === 'apps' && row ? row.id : module === 'theme' ? undefined : project.apps.find(a => a.enabled && a.type === previewType)?.id
  const chatRoute: Omit<ChatRoute,'serial'> | undefined = module === 'groups' || module === 'direct'
    ? { view:'thread',target:row?.id || '' } : module === 'posts' ? { view:'moments',target:(row as Post | undefined)?.author || '' } : undefined
  const previewUrl = module === 'pages' ? (row as Page | undefined)?.url : module === 'search' || module === 'accounts' ?
    project.pages.find(p => p.id === (row as Search | Account | undefined)?.page)?.url : undefined
  const previewCard = module === 'contacts' ? row?.id : undefined
  const previewEntry = module === 'notes' || module === 'trash' ? row?.id : undefined
  const renderFields = () => {
    if (module === 'theme') return <ThemeFields />
    if (!row) return <div className="studio-hint">可从资源列表新建{names[module]}。</div>
    switch (module) {
      case 'apps': return <AppFields row={row as App} patch={patch<App>} />
      case 'assets': return <AssetFields row={row as Asset} patch={patch<Asset>} />
      case 'contacts': return <ContactFields row={row as Contact} patch={patch<Contact>} />
      case 'direct':
      case 'groups': return <ThreadFields row={row as Thread} patch={patch<Thread>} messageId={message} selectMessage={setMessage} />
      case 'posts': return <PostFields row={row as Post} patch={patch<Post>} />
      case 'pages': return <PageFields row={row as Page} patch={patch<Page>} />
      case 'search': return <SearchFields row={row as Search} patch={patch<Search>} />
      case 'accounts': return <AccountFields row={row as Account} patch={patch<Account>} />
      case 'notes':
      case 'trash': return <EntryFields row={row as Entry} patch={patch<Entry>} />
      case 'events': return <EventFields row={row as StoryEvent} patch={patch<StoryEvent>} />
      default: return <TextField label="资源名称" value={(row as Named).name} onChange={name => patch<Named>({name})} />
    }
  }
  return <StudioContext.Provider value={{ project,update,report:setNotice }}>
    <main className={`studio mobile-${mobile}`}>
      <header className="studio-header">
        <div className="studio-brand"><span><Sparkles size={18} /></span><div><strong>ARG Studio</strong><small>麦德林之梦</small></div></div>
        <div className="studio-head-actions">
          <button className="studio-small" onClick={draft.undo} disabled={!draft.canUndo} aria-label="撤销" title="撤销"><Undo2 size={17} /></button>
          <button className="studio-small" onClick={draft.redo} disabled={!draft.canRedo} aria-label="重做" title="重做"><Redo2 size={17} /></button>
          <button className="studio-small" onClick={() => void draft.save(true)}><Save size={15} />保存草稿</button>
          <button className="studio-small" onClick={() => setMode(mode === 'edit' ? 'player' : 'edit')}>{mode === 'edit' ? <Eye size={16} /> : <LayoutGrid size={16} />}{mode === 'edit' ? '玩家预览' : '返回编辑'}</button>
          <button className="studio-primary" onClick={() => setCheck(canPublish ? 'publish' : 'validate')}><Check size={16} />{canPublish ? '发布' : '校验'}</button>
          <button className="studio-small" onClick={exit}><ArrowLeft size={16} />退出工作室</button>
        </div>
      </header>
      <div className="studio-status" role="status">
        <span><i /> {draft.status}</span>
        {demoCount > 0 && <span><FlaskConical size={13} /> 含 {demoCount} 项测试资源</span>}
        {draft.error && <span className="error-text">{draft.error}</span>}
        {notice && <span className="studio-notice">{notice}<button aria-label="关闭通知" className="studio-icon" onClick={() => setNotice('')}><X size={13} /></button></span>}
      </div>
      {mode === 'player' ? <div className="studio-full-preview">
        <Desktop project={project} simulation={simulation} initialApp={previewApp} initialChat={chatRoute} initialBrowser={previewUrl} initialEntry={previewEntry} initialCard={previewCard} initialMessage={message}
          topAction={<button className="studio-entry" onClick={() => setMode('edit')}><ArrowLeft size={14} /> 返回编辑</button>} />
      </div> : <>
        <div className="studio-mobile-nav">
          <button className="studio-small" onClick={() => setMobile('resources')}><Menu size={16} />资源</button>
          <button className="studio-small" onClick={() => setMobile('preview')}><Eye size={16} />预览</button>
          <button className="studio-small" onClick={() => setMobile('properties')}><LayoutGrid size={16} />属性</button>
        </div>
        <div className="studio-workspace">
          <aside className="studio-resources">
            <nav className="studio-modules" aria-label="工作室模块">{modules.map(group => <div key={group.label}>
              <h2>{group.label}</h2><div>{group.items.map(([id,label]) => <button key={id} className={module === id ? 'selected' : ''} aria-current={module === id ? 'page' : undefined} onClick={() => selectModule(id)}>{label}</button>)}</div>
            </div>)}</nav>
            {module !== 'theme' && <section className="resource-list">
              <header><h2>{names[module]}</h2><button className="studio-small" onClick={add}><Plus size={15} />{module === 'assets' ? '上传素材' : '新增'}</button></header>
              <label className="resource-search"><SearchIcon size={15} /><input type="search" aria-label="搜索资源" placeholder="搜索当前资源" value={query} onChange={e => setQuery(e.target.value)} /></label>
              <SortList label="资源排序" rows={filtered} selected={row?.id} identify={r => r.id}
                setRows={rows => {
                  const ids = new Set(filtered.map(item => item.id))
                  update(p => {
                    const reordered = rows.slice()
                    return replaceRows(p,module,getRows(p,module).map(item => ids.has(item.id) ? (reordered.shift() || item) : item))
                  })
                }} render={item =>
                  <button className="sort-select" onClick={() => select(item.id)} aria-pressed={row?.id === item.id}>
                    <span>{resourceName(project,item)}</span>{item.id.startsWith('demo-') && <small>测试资源</small>}
                  </button>} />
              {!filtered.length && <p className="studio-hint">暂无资源</p>}
            </section>}
            <details className="studio-file-menu"><summary>项目文件</summary>
              <button className="studio-small" onClick={() => importInput.current?.click()}><Upload size={15} />导入项目</button>
              <button className="studio-small" onClick={exportProject}><Download size={15} />导出项目及素材</button>
              <button className="studio-small" onClick={() => setCheck('validate')}><Check size={15} />校验引用</button>
              {demoCount > 0 && <button className="studio-small" onClick={() => { update(removeDemo); setNotice('已移除测试资源。请校验新内容对测试资源的引用。') }}>移除测试资源</button>}
              <button className="studio-small" onClick={() => { if (window.confirm('将当前草稿恢复为默认配置？可撤销此操作。')) update(() => structuredClone(base)) }}>恢复默认配置</button>
              <button className="studio-small" onClick={() => { if (window.confirm('用独立测试数据替换当前草稿？可撤销此操作。')) update(() => structuredClone(demo)) }}>载入测试项目</button>
            </details>
          </aside>
          <section className="studio-preview">
            <header><h2><Gamepad2 size={17} /> 实时预览</h2><span>独立测试会话</span></header>
            <div className="studio-canvas">
              <Desktop key={module} project={project} simulation={simulation} initialApp={previewApp} initialChat={chatRoute} initialBrowser={previewUrl} initialEntry={previewEntry} initialCard={previewCard} initialMessage={message} />
            </div>
            <div className="simulation">
              <Fold title="模拟剧情状态">
                <p className="studio-hint">设定测试初始状态。预览互动只在当前会话生效。</p>
                <div className="simulation-grid">
                  {(['flags','friends','accounts','clues'] as const).map((key,i) => <div key={key}>
                    <h3>{['剧情状态','好友','账号权限','线索'][i]}</h3>
                    <CheckList choices={choiceList(key === 'friends' ? project.contacts : project[key],a => a.name)} selected={simulation[key]}
                      onChange={values => setSimulation(s => ({ ...s,[key]:values }))} />
                  </div>)}
                </div>
                <button className="studio-small" onClick={() => setSimulation(emptyPlayer())}>重置模拟状态</button>
              </Fold>
            </div>
          </section>
          <aside className="studio-properties">
            <header><div><small>{names[module]}</small><h2>{row ? resourceName(project,row) : module === 'theme' ? '全局主题' : '属性面板'}</h2></div>
              {row && <div className="property-tools">
                <button className="studio-icon" title="复制资源" aria-label="复制资源" onClick={duplicate}><Copy size={16} /></button>
                <button className="studio-icon danger" title="删除资源" aria-label="删除资源" onClick={remove}><Trash2 size={16} /></button>
              </div>}
            </header>
            <div className="property-form" key={row?.id || module}>
              {module === 'pages' && <Fold title="浏览器全局页面">
                <ChoiceField label="主页" value={project.home} empty="使用内置主页" options={choiceList(project.pages,p => p.title)}
                  onChange={home => update(p => ({...p,home}))} />
                <ChoiceField label="404 页面" value={project.notFound} empty="使用内置 404" options={choiceList(project.pages.filter(p => p.kind === 'article'),p => p.title)}
                  onChange={notFound => update(p => ({...p,notFound}))} />
              </Fold>}
              {renderFields()}
              {row && <small className="resource-id">ID · {row.id}</small>}
            </div>
          </aside>
        </div>
      </>}
      <input ref={importInput} type="file" accept=".json,application/json" aria-label="导入项目文件" hidden onChange={e => { void importProject(e.target.files?.[0]); e.target.value = '' }} />
      <input ref={assetInput} type="file" aria-label="上传素材文件" hidden onChange={e => { void upload(e.target.files?.[0]); e.target.value = '' }} />
      {check && <div className="studio-overlay" onClick={() => !working && setCheck(null)}>
        <section className="studio-dialog" role="dialog" aria-modal="true" aria-label={check === 'publish' ? '发布前检查' : '数据与引用校验'} onClick={e => e.stopPropagation()}>
          <header><h2>{check === 'publish' ? '发布前检查' : '数据与引用校验'}</h2><button className="studio-icon" disabled={working} aria-label="关闭校验" onClick={() => setCheck(null)}><X size={19} /></button></header>
          {demoCount > 0 && <p className="error-text">项目含 {demoCount} 项独立测试资源。发布前请在「项目文件」移除测试资源。</p>}
          {errors.length ? <ul>{errors.map((err,i) => <li key={i}>{err}</li>)}</ul> : <p>项目结构及引用校验通过。</p>}
          {check === 'publish' && <p>发布将更新本地正式内容文件。静态站点使用重新构建后的版本。</p>}
          <div className="studio-dialog-actions">
            <button className="studio-small" disabled={working} onClick={() => { setMode('player'); setCheck(null) }}><Eye size={15} />打开玩家预览</button>
            {check === 'publish' && <button className="studio-primary" disabled={!!errors.length || !!demoCount || working} onClick={() => void confirmPublish()}>{working ? '正在发布…' : '确认写入正式内容'}</button>}
          </div>
        </section>
      </div>}
    </main>
  </StudioContext.Provider>
}
