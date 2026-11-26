import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { ArrowLeft, CircleHelp, ContactRound, Ellipsis, FileText, Globe2, Heart, Images, LockKeyhole, MapPin, MessageCircle, Search, Sparkles, UserRound, UserRoundPlus, UsersRound } from 'lucide-react'
import { useGame } from '../game/context'
import { assetUrl, imageUrl, matches } from '../game/state'
import type { Contact, Message, Post, Thread } from '../game/types'

const nameOf = (contact?: Contact) => contact?.remark || contact?.name || '未知联系人'
export function Avatar({ contact, asset, group, self, size = '', onClick }: {
  contact?: Contact; asset?: string; group?: boolean; self?: boolean; size?: string; onClick?: () => void
}) {
  const { project } = useGame()
  const source = imageUrl(project, asset || contact?.avatar || '')
  const label = self ? '本机用户' : group ? '群聊' : nameOf(contact)
  const style = { '--avatar': contact?.color || (self ? '#506a9f' : '#337e85') } as CSSProperties
  const body = source ? <img src={source} alt="" /> : group ? <Sparkles size={20} /> : self ? <UserRound size={18} /> : contact?.name.slice(-1) || <UserRound size={18} />
  return onClick ? <button type="button" className={`avatar ${size}`} style={style} title={`查看${label}的名片`} aria-label={`查看${label}的名片`} onClick={onClick}>{body}</button>
    : <span className={`avatar ${size}`} style={style} aria-hidden="true">{body}</span>
}
function DirectCard({ contact }: { contact: Contact }) {
  const game = useGame()
  const friend = contact.initial || game.state.friends.includes(contact.id)
  const locked = !friend && !matches(contact.unlock, game.state, game.project)
  const [notice, setNotice] = useState('')
  const fields = [['account','账号',contact.account], ['remark','备注',contact.remark], ['signature','签名',contact.signature],
    ['region','地区',contact.region], ['bio','人物简介',contact.bio]]
  return <div className="contact-card">
    <div className="contact-card-head">{!contact.hidden.includes('avatar') && <Avatar contact={contact} size="large" />}<div>
      <h2>{contact.hidden.includes('name') ? (!contact.hidden.includes('remark') && contact.remark || '联系人') : (!contact.hidden.includes('remark') && contact.remark || contact.name)}</h2>
      {contact.remark && !contact.hidden.includes('remark') && !contact.hidden.includes('name') && <p>{contact.name}</p>}
    </div></div>
    <dl>{fields.filter(([id,,value]) => !contact.hidden.includes(id) && value).map(([id,label,value]) =>
      <div key={id}><dt>{label}</dt><dd>{value}</dd></div>)}
      {contact.custom.filter(f => !f.hidden).map((f,i) => <div key={i}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}
    </dl>
    <div className="card-buttons">
      {!contact.hidden.includes('moments') && <button className="secondary-button" onClick={() => game.act({ kind: 'moments', target: contact.id })}>查看朋友圈</button>}
      {friend && !contact.hidden.includes('chat') && <button className="primary-button" onClick={() => game.act({ kind: 'chat', target: contact.id })}>打开聊天</button>}
      {!friend && <button className="primary-button" disabled={locked} onClick={() => {
        if (!game.add(contact)) setNotice('该联系人已添加或尚未解锁。')
      }}>{locked ? '尚未解锁' : '添加好友'}</button>}
    </div>
    {notice && <p role="status">{notice}</p>}
  </div>
}
export { DirectCard }

function AddFriends() {
  const game = useGame()
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState<string | null>(null)
  const result = submitted && game.project.contacts.find(c => c.searchable && c.account.trim().toLowerCase() === submitted.toLowerCase())
  const existing = result && (result.initial || game.state.friends.includes(result.id))
  const locked = result && !existing && !matches(result.unlock, game.state, game.project)
  return <section className="add-friends">
    <span className="section-symbol"><UserRoundPlus size={26} /></span>
    <h2>添加好友</h2><p>输入资料中找到的游戏内账号。</p>
    <form onSubmit={e => { e.preventDefault(); setSubmitted(query.trim()) }}>
      <input aria-label="游戏内账号" placeholder="输入虚构账号" value={query} onChange={e => setQuery(e.target.value)} required />
      <button className="primary-button">查找</button>
    </form>
    {submitted !== null && <div className="add-result" role="status">
      {!result ? '未找到该账号' : locked ? '该账号的名片尚未解锁' : <>
        <Avatar contact={result} onClick={() => game.modal({ kind: 'card', target: result.id })} />
        <span><strong>{nameOf(result)}</strong>{existing && <small>该联系人已是好友</small>}</span>
        <button className="secondary-button" onClick={() => game.modal({ kind: 'card', target: result.id })}>查看名片</button>
      </>}
    </div>}
  </section>
}

function Bubble({ message, nickname, active }: { message: Message; nickname?: string; active: boolean }) {
  const game = useGame()
  const el = useRef<HTMLDivElement>(null)
  const contact = game.project.contacts.find(c => c.id === message.sender)
  const own = message.sender === 'self'
  const image = imageUrl(game.project, message.media)
  const file = game.project.assets.find(asset => asset.id === message.media)
  const trigger = message.action || (message.type === 'link' ? { kind: 'url', target: message.url } as const :
    message.type === 'image' ? { kind: 'image', target: message.media } as const : message.type === 'file' ? { kind: 'file', target: message.media } as const : undefined)
  useEffect(() => {
    const node = el.current
    if (!node || !active || !message.onRead || game.state.read.includes(message.id)) return
    const observer = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) game.read(message.id, message.onRead)
    }, { root: node.closest('.chat-history'), threshold: .25 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [active, message, game.state, game.read])
  if (message.type === 'date' || message.type === 'system') return <div ref={el} data-message-id={message.id} className={`chat-separator ${message.type}`}>
    {trigger ? <button onClick={() => game.act(trigger)}>{message.text || message.time}</button> : <span>{message.text || message.time}</span>}
  </div>
  return <div ref={el} data-message-id={message.id} className={`bubble-row ${own ? 'own' : ''}`}>
    <Avatar contact={contact} self={own} onClick={contact ? () => game.modal({ kind: 'card', target: contact.id }) : undefined} />
    <div className="bubble-stack">
      <div className="bubble-meta"><strong>{own ? '我' : nickname || nameOf(contact)}</strong>{message.time && <time>{message.time}</time>}</div>
      {message.type === 'link' || message.type === 'file' ? <button className="chat-link-card" onClick={() => game.act(trigger)}>
        <span className="link-symbol">{message.type === 'link' ? <Globe2 size={20} /> : <FileText size={20} />}</span>
        <span><strong>{message.text || (message.type === 'link' ? message.url : file?.name) || '文件'}</strong><small>{message.type === 'link' ? message.url : file?.name || '游戏内附件'}</small></span>
      </button> : message.type === 'image' && image ? <button className="bubble-image" onClick={() => game.act(trigger)}><img src={image} alt={message.text || '聊天图片'} /></button> :
        trigger ? <button className="bubble-text clickable" onClick={() => game.act(trigger)}>{message.text || '附件待配置'}</button> : <div className="bubble-text">{message.text}</div>}
    </div>
  </div>
}
function Moment({ post }: { post: Post }) {
  const game = useGame()
  const author = game.project.contacts.find(c => c.id === post.author)
  const contact = (id: string) => nameOf(game.project.contacts.find(c => c.id === id))
  const images = post.images.filter(id => imageUrl(game.project, id))
  return <article className="moment">
    <Avatar contact={author} onClick={author ? () => game.modal({ kind: 'card', target: author.id }) : undefined} />
    <div className="moment-main">
      <button className="moment-author" onClick={() => author && game.act({ kind: 'moments', target: author.id })}>{nameOf(author)}</button>
      {post.text && (post.action || post.hiddenClue ? <button className="moment-text action-text" onClick={() => {
        game.act(post.action)
        if (post.hiddenClue) game.act({ kind: 'clue', target: post.hiddenClue })
      }}>{post.text}</button> : <p className="moment-text">{post.text}</p>)}
      {!!images.length && <div className={`moment-images ${post.layout} ${images.length === 1 ? 'single' : ''}`}>
        {images.map((id,index) => <button key={id + index} aria-label={`查看动态图片 ${index + 1}`} onClick={() => {
          if (post.imageAction) game.act(post.imageAction)
          else game.modal({ kind: 'image', target: id, images, index })
          if (post.hiddenClue) game.act({ kind: 'clue', target: post.hiddenClue })
        }}><img src={assetUrl(game.project, id)} alt="" /></button>)}
      </div>}
      <div className="moment-meta">{post.time && <time>{post.time}</time>}{post.location && <span><MapPin size={12} /> {post.location}</span>}</div>
      {!!(post.likes.length || post.comments.length) && <div className="moment-feedback">
        {!!post.likes.length && <div className="moment-likes"><Heart size={13} />{post.likes.map(id => <button key={id} onClick={() => game.modal({ kind: 'card', target: id })}>{contact(id)}</button>)}</div>}
        {post.comments.map(c => {
          const parent = post.comments.find(other => other.id === c.replyTo)
          return <div key={c.id} className="moment-comment"><button onClick={() => game.modal({ kind: 'card', target: c.sender })}>{contact(c.sender)}</button>
            {parent && <> 回复 <button onClick={() => game.modal({ kind: 'card', target: parent.sender })}>{contact(parent.sender)}</button></>}：{c.text}</div>
        })}
      </div>}
    </div>
  </article>
}
type Tab = 'thread' | 'contacts' | 'moments' | 'add'
export function Chat({ active }: { active: boolean }) {
  const game = useGame()
  const { project, state, chatRoute, modal } = game
  const [tab, setTab] = useState<Tab>('thread')
  const [target, setTarget] = useState('')
  const [person, setPerson] = useState('')
  const [query, setQuery] = useState('')
  const [details, setDetails] = useState<boolean | null>(null)
  const [mobileThread, setMobileThread] = useState(false)
  const history = useRef<HTMLDivElement>(null)
  const [wide,setWide] = useState(false)
  const layout = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = layout.current
    if (!root) return
    const observer = new ResizeObserver(entries => setWide(entries[0].contentRect.width > 790))
    observer.observe(root)
    return () => observer.disconnect()
  },[])
  const showDetails = details ?? wide
  const getContact = (id: string) => project.contacts.find(c => c.id === id)
  const isFriend = (c?: Contact) => Boolean(c && (c.initial || state.friends.includes(c.id)))
  const threads = project.threads.filter(t => matches(t.when, state, project) && (t.kind === 'group' || isFriend(getContact(t.members[0]?.contact))))
  const threadName = (t: Thread) => t.kind === 'group' ? t.name : nameOf(getContact(t.members[0]?.contact))
  useEffect(() => {
    if (!chatRoute) return
    setTab(chatRoute.view === 'moments' ? 'moments' : 'thread')
    if (chatRoute.view === 'moments') setPerson(chatRoute.target)
    else { setTarget(chatRoute.target); setMobileThread(true) }
    setQuery('')
  }, [chatRoute])
  const selected = threads.find(t => t.id === target || (t.kind === 'direct' && t.members[0]?.contact === target)) || (!target ? threads[0] : undefined)
  const other = getContact(selected?.members[0]?.contact || target)
  const group = selected?.kind === 'group'
  const canChat = Boolean(selected || isFriend(other))
  const messages = selected?.messages.filter(m => matches(m.when, state, project)) || []
  useEffect(() => {
    if (history.current) history.current.scrollTop = 0
  }, [selected?.id])
  useEffect(() => {
    const element = Array.from(history.current?.querySelectorAll<HTMLElement>('[data-message-id]') || [])
      .find(node => node.dataset.messageId === game.messageRequest)
    if (element && history.current) history.current.scrollTop = Math.max(0,element.offsetTop - history.current.offsetTop - 10)
  }, [game.messageRequest, selected?.id])
  const cards = project.contacts.filter(c => isFriend(c) && `${nameOf(c)} ${c.name} ${c.hidden.includes('account') ? '' : c.account}`.toLowerCase().includes(query.trim().toLowerCase()))
  const posts = project.posts.filter(p => (!person || p.author === person) && matches(p.when, state, project))
  const author = getContact(person)
  const nav = [{ id: 'thread', name: '聊天', icon: MessageCircle }, { id: 'contacts', name: '通讯录', icon: ContactRound },
    { id: 'moments', name: '朋友圈', icon: Images }, { id: 'add', name: '添加好友', icon: UserRoundPlus }] as const
  return <div ref={layout} className={`chat-app ${mobileThread && tab === 'thread' ? 'mobile-thread' : ''}`}>
    <nav className="chat-nav" aria-label="绿泡泡导航">
      <div className="chat-local"><Avatar self /></div>
      {nav.map(({ id, name, icon: Icon }) => <button type="button" key={id} aria-label={name} title={name} aria-pressed={tab === id} className={tab === id ? 'selected' : ''}
        onClick={() => { setTab(id); setQuery(''); setMobileThread(false); if (id === 'moments') setPerson('') }}><Icon size={20} strokeWidth={1.75} /></button>)}
      <button className="chat-help" aria-label="虚构通讯说明" title="虚构通讯说明" onClick={() => modal({ kind: 'about', target: '' })}><CircleHelp size={18} /></button>
    </nav>
    {(tab === 'thread' || tab === 'contacts') && <aside className="chat-list" aria-label={tab === 'thread' ? '会话列表' : '联系人列表'}>
      <div className="chat-list-top">
        <h2>{tab === 'thread' ? '消息' : '通讯录'}</h2>
        <button className="icon-button" aria-label="查找新好友" title="添加好友" onClick={() => setTab('add')}><UserRoundPlus size={17} /></button>
        <label className="chat-search"><Search size={16} /><input type="search" aria-label="搜索联系人或会话" placeholder="搜索联系人" value={query} onChange={e => setQuery(e.target.value)} /></label>
      </div>
      {tab === 'thread' ? <>
        <div className="chat-list-caption">最近会话</div>
        {threads.filter(t => threadName(t).toLowerCase().includes(query.trim().toLowerCase())).map(t => {
          const latest = t.messages.filter(m => m.type !== 'date' && m.type !== 'system' && matches(m.when, state, project)).at(-1)
          return <button className={`thread-row ${selected?.id === t.id ? 'selected' : ''}`} key={t.id} onClick={() => { setTarget(t.id); setMobileThread(true) }}>
            <Avatar contact={t.kind === 'direct' ? getContact(t.members[0]?.contact) : undefined} asset={t.avatar} group={t.kind === 'group'} />
            <span className="thread-label"><strong>{threadName(t)}</strong><small>{latest?.text || (latest ? '附件' : '暂无记录')}</small></span>
            <time>{latest?.time || ''}</time>
          </button>
        })}
      </> : cards.map(c => <button className="thread-row" key={c.id} onClick={() => modal({ kind: 'card', target: c.id })}>
        <Avatar contact={c} /><span className="thread-label"><strong>{nameOf(c)}</strong><small>{c.hidden.includes('signature') ? '' : c.signature}</small></span>
      </button>)}
    </aside>}
    {tab === 'thread' && <section className="chat-conversation">
      {canChat ? <>
        <header className="conversation-title">
          <button className="icon-button mobile-back" aria-label="返回会话列表" onClick={() => setMobileThread(false)}><ArrowLeft size={18} /></button>
          <div><h2>{group && selected ? selected.name : nameOf(other)}</h2>
          <p>{group ? <><UsersRound size={13} /> {selected?.members.length} 位成员</> : '单人会话'}</p></div>
          {group ? <button className="icon-button" aria-label="群聊详情" aria-expanded={showDetails} title="群聊详情" onClick={() => setDetails(!showDetails)}><Ellipsis size={22} /></button>
            : other && <button className="icon-button" aria-label="好友名片" onClick={() => modal({ kind: 'card', target: other.id })}><Ellipsis size={22} /></button>}
        </header>
        <div className="chat-history" ref={history}>
          {messages.map(m => <Bubble key={m.id} message={m} nickname={selected?.members.find(member => member.contact === m.sender)?.nickname} active={active} />)}
          {!messages.length && <div className="empty-state"><MessageCircle size={27} />暂无聊天记录</div>}
        </div>
        <footer className="chat-readonly"><LockKeyhole size={13} /> 历史记录 <span>·</span> 只读</footer>
      </> : <div className="empty-state"><MessageCircle size={29} />选择会话查看聊天记录</div>}
    </section>}
    {tab === 'thread' && group && showDetails && <aside className="chat-details">
      <div className="detail-title"><UsersRound size={16} /> 群聊信息</div>
      <div className="detail-section"><h3>群成员 <span>{selected?.members.length}</span></h3>
        <div className="group-members">{selected?.members.map(m => {
          const c = getContact(m.contact)
          return c && <button key={m.contact} onClick={() => modal({ kind: 'card', target: c.id })} aria-label={`查看${nameOf(c)}的名片`}>
            <Avatar contact={c} /><span>{m.nickname || nameOf(c)}</span>
          </button>
        })}</div></div>
      <div className="detail-section"><h3>群公告</h3><p>{selected?.announcement || '暂无群公告'}</p></div>
    </aside>}
    {tab === 'contacts' && <div className="contacts-empty empty-state"><ContactRound size={30} />选择联系人查看名片</div>}
    {tab === 'add' && <AddFriends />}
    {tab === 'moments' && <section className="moments">
      <header className="moments-header"><h2>{author ? `${nameOf(author)}的朋友圈` : '朋友圈'}</h2>
        {author && <button className="secondary-button" onClick={() => setPerson('')}>全部动态</button>}</header>
      {author && <div className="moment-cover" style={imageUrl(project, author.cover) ? { backgroundImage: `url("${imageUrl(project, author.cover)}")` } : undefined}>
        <Avatar contact={author} size="large" onClick={() => modal({ kind: 'card', target: author.id })} /><strong>{nameOf(author)}</strong>
      </div>}
      <div className="moment-feed">{posts.map(p => <Moment key={p.id} post={p} />)}{!posts.length && <div className="empty-state"><Images size={28} />暂无可见动态</div>}</div>
    </section>}
  </div>
}
