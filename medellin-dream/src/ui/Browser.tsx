import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, FileQuestion, Globe2, GraduationCap, House, KeyRound, RotateCw, Search } from 'lucide-react'
import { useGame } from '../game/context'
import { imageUrl, matches, normalizeUrl } from '../game/state'
import type { Page } from '../game/types'

type Location = { kind: 'home' | 'url' | 'search'; value: string }
const home: Location = { kind:'home',value:'' }
const trimSearch = (text: string) => text.trim().toLowerCase()
function StudentPage({ page }: { page: Page }) {
  const { project,state,login } = useGame()
  const active = project.accounts.find(a => a.page === page.id && state.accounts.includes(a.id) && matches(a.when,state,project))
  const [user,setUser] = useState('')
  const [pass,setPass] = useState('')
  const [notice,setNotice] = useState('')
  if (active) return <div className="student-success">
    <strong>已登录学生信息系统</strong><p>当前虚构账号 · {active.name}（{active.username}）</p>
    <PageBody page={page} />
  </div>
  return <form className="student-form" autoComplete="off" onSubmit={e => {
    e.preventDefault()
    const account = project.accounts.find(a => a.page === page.id && a.username.trim() === user.trim() && a.password === pass)
    setPass('')
    if (!account) { setNotice('游戏内账号或密码不匹配。'); return }
    if (!matches(account.when,state,project)) { setNotice('该账号当前尚未获得登录权限。'); return }
    setNotice('')
    login(account.id)
  }}>
    <p>请使用在游戏中找到的虚构账号。</p>
    <label>游戏内学生账号<input name="fictional-student" value={user} onChange={e => setUser(e.target.value)} required autoComplete="off" /></label>
    <label>游戏内密码<input type="password" name="fictional-key" value={pass} onChange={e => setPass(e.target.value)} required autoComplete="new-password" /></label>
    <button className="primary-button"><KeyRound size={15} /> 登录学生系统</button>
    {notice && <p className="login-notice" role="status">{notice}</p>}
  </form>
}
function PageBody({ page }: { page: Page }) {
  const { project,act } = useGame()
  const image = imageUrl(project,page.image)
  return <>
    {image && <img className="web-article-image" src={image} alt="" />}
    {page.body && <div className="app-prose">{page.body}</div>}
    {page.action && page.action.kind !== 'none' && <button className="secondary-button" onClick={() => act(page.action)}>{page.actionLabel || '查看详情'}</button>}
  </>
}
function WebPage({ page }: { page: Page }) {
  return <article className={`web-page ${page.layout}`}>
    <span className="section-symbol">{page.kind === 'student' ? <GraduationCap size={25} /> : <Globe2 size={23} />}</span>
    <div><h1>{page.title}</h1><p className="web-domain">{page.url}</p></div>
    {page.kind === 'student' ? <StudentPage page={page} /> : <PageBody page={page} />}
  </article>
}
export function Browser() {
  const { project,state,browserRoute } = useGame()
  const [history,setHistory] = useState({ items:[home],index:0 })
  const [address,setAddress] = useState('')
  const [search,setSearch] = useState('')
  const [refresh,setRefresh] = useState(0)
  const lastRequest = useRef(0)
  const viewport = useRef<HTMLDivElement>(null)
  const location = history.items[history.index]
  const visible = (page: Page) => matches(page.when,state,project)
  const page = location.kind === 'home' ? project.pages.find(p => p.id === project.home && visible(p)) :
    location.kind === 'url' ? project.pages.find(p => normalizeUrl(p.url) === normalizeUrl(location.value) && visible(p)) : undefined
  const fallback = project.pages.find(p => p.id === project.notFound && p.kind === 'article' && visible(p))
  const addressValue = location.kind === 'url' ? location.value : location.kind === 'home' ? page?.url || '' : ''
  const jump = (next: Location) => {
    setHistory(prev => {
      const current = prev.items[prev.index]
      if (current.kind === next.kind && current.value === next.value) return prev
      const items = [...prev.items.slice(0,prev.index + 1),next].slice(-100)
      return { items,index:items.length - 1 }
    })
    setAddress(next.kind === 'url' ? next.value : next.kind === 'home' ? project.pages.find(p => p.id === project.home)?.url || '' : '')
    if (next.kind === 'search') setSearch(next.value)
  }
  useEffect(() => {
    if (browserRoute && lastRequest.current !== browserRoute.serial) {
      lastRequest.current = browserRoute.serial
      jump({kind:'url',value:browserRoute.url})
    }
  // Each route request is consumed once, including while the window is minimized.
  },[browserRoute])
  useEffect(() => {
    setAddress(addressValue)
    if (viewport.current) viewport.current.scrollTop = 0
  },[location,addressValue,refresh])
  const query = trimSearch(location.kind === 'search' ? location.value : '')
  const results = location.kind !== 'search' ? [] : project.search.filter(row => {
    if (!matches(row.when,state,project) || !project.pages.some(p => p.id === row.page && visible(p))) return false
    const matchesKeyword = row.keywords.split(/[,，;；\n]+/).map(trimSearch).filter(Boolean).some(k => k.includes(query) || query.includes(k))
    return Boolean(query && (matchesKeyword || trimSearch(row.title).includes(query)))
  }).sort((a,b) => a.order - b.order)
  const searchForm = (large = false) => <form className={large ? 'browser-search hero-search' : 'browser-search'} onSubmit={e => {
    e.preventDefault()
    if (search.trim()) jump({kind:'search',value:search.trim()})
  }}>
    <input type="search" aria-label={large ? '主页关键词搜索' : '搜索关键词'} placeholder={large ? '输入关键词搜索游戏内资料' : '搜索关键词'} value={search} onChange={e => setSearch(e.target.value)} required />
    <button aria-label={large ? '搜索资料' : '提交关键词搜索'} title="搜索关键词"><Search size={17} /></button>
  </form>
  return <div className="browser-app">
    <header className="browser-toolbar">
      <div className="browser-controls">
        <button className="icon-button" aria-label="后退" title="后退" disabled={history.index === 0} onClick={() => setHistory(h => ({ ...h,index:h.index - 1 }))}><ArrowLeft size={17} /></button>
        <button className="icon-button" aria-label="前进" title="前进" disabled={history.index >= history.items.length - 1} onClick={() => setHistory(h => ({ ...h,index:h.index + 1 }))}><ArrowRight size={17} /></button>
        <button className="icon-button" aria-label="刷新网页" title="刷新网页" onClick={() => setRefresh(r => r + 1)}><RotateCw size={16} /></button>
        <button className="icon-button" aria-label="浏览器主页" title="主页" onClick={() => jump(home)}><House size={17} /></button>
      </div>
      <form className="browser-address" onSubmit={e => { e.preventDefault(); if (address.trim()) jump({ kind:'url',value:address.trim() }) }}>
        <Globe2 size={15} /><input aria-label="虚构网址地址栏" placeholder="输入游戏内网址" spellCheck={false} value={address} onChange={e => setAddress(e.target.value)} required />
        <button title="打开网址" aria-label="打开网址"><ArrowRight size={16} /></button>
      </form>
      {searchForm()}
    </header>
    <div className="web-viewport" ref={viewport}>
      {page ? <WebPage key={page.id + '/' + refresh} page={page} /> : location.kind === 'home' ? <section className="browser-home">
        <span className="section-symbol"><Globe2 size={32} /></span><h1>星屿搜索</h1>
        {searchForm(true)}<p>搜索结果与地址均来自虚构的游戏内站点。</p>
      </section> : location.kind === 'search' ? <section className="search-results">
        <h1>搜索结果</h1><p>「{location.value}」共 {results.length} 条结果</p>
        {results.map(row => {
          const target = project.pages.find(p => p.id === row.page)!
          const thumbnail = imageUrl(project,row.thumbnail)
          return <button className="search-result" key={row.id} onClick={() => jump({kind:'url',value:target.url})}>
            {thumbnail && <img src={thumbnail} alt="" />}<span><strong>{row.title}</strong><small>{target.url}</small><span>{row.summary}</span></span>
          </button>
        })}
        {!results.length && <div className="empty-state"><Search size={25} />未找到匹配的资料</div>}
      </section> : fallback ? <WebPage key={fallback.id + '/' + refresh} page={fallback} /> : <section className="browser-home">
        <span className="section-symbol"><FileQuestion size={31} /></span><h1>404 · 页面未找到</h1>
        <p>游戏内找不到可访问的「{location.value}」。</p><button className="secondary-button" onClick={() => jump(home)}>返回主页</button>
      </section>}
    </div>
  </div>
}
