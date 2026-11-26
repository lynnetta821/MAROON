import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { BatteryFull, CircleAlert, Info, RadioTower, Sparkles, Volume2, Wifi } from 'lucide-react'
import type { Action, App, Contact, PlayerState, Project } from '../game/types'
import { emptyPlayer, imageUrl, matches, playerKey, restorePlayer, setMembership } from '../game/state'
import { GameContext } from '../game/context'
import type { BrowserRoute, ChatRoute, ModalView } from '../game/context'
import { AppIcon } from './icons'
import { AppWindow, useWindowManager } from './WindowManager'
import { AppContent, GameDialog } from './apps'
import wallpaper from '../art/wallpaper.webp'

type Props = {
  project: Project; persistent?: boolean; initialApp?: string; initialChat?: Omit<ChatRoute, 'serial'>
  initialBrowser?: string; initialEntry?: string; initialCard?: string; initialMessage?: string; simulation?: PlayerState; topAction?: ReactNode
}
export function Desktop({ project, persistent = false, initialApp, initialChat, initialBrowser, initialEntry, initialCard, initialMessage, simulation, topAction }: Props) {
  const manager = useWindowManager(project.theme)
  const [state, setState] = useState(() => simulation || (persistent ? restorePlayer() : emptyPlayer()))
  const current = useRef(state)
  const [clock, setClock] = useState(() => new Date())
  const [dialog, setDialog] = useState<ModalView | null>(null)
  const serial = useRef(0)
  const [chatRoute, setChatRoute] = useState<ChatRoute | null>(null)
  const [browserRoute, setBrowserRoute] = useState<BrowserRoute | null>(null)
  const update = (patch: Partial<PlayerState>) => {
    current.current = { ...current.current, ...patch }
    setState(current.current)
  }
  useEffect(() => {
    if (!persistent) return
    try { localStorage.setItem(playerKey, JSON.stringify(state)) } catch { /* Optional storage. */ }
  }, [state, persistent])
  useEffect(() => {
    const interval = window.setInterval(() => setClock(new Date()), 15000)
    return () => window.clearInterval(interval)
  }, [])
  useEffect(() => {
    if (simulation) {
      current.current = simulation
      setState(simulation)
    }
  }, [simulation])
  useEffect(() => {
    const app = project.apps.find(a => a.id === initialApp)
    if (app) manager.open(app)
  // This is a navigation request. Content edits must preserve the preview windows.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialApp])
  useEffect(() => {
    if (initialChat) setChatRoute({ ...initialChat, serial: ++serial.current })
  }, [initialChat?.view, initialChat?.target])
  useEffect(() => {
    if (initialBrowser) setBrowserRoute({ url: initialBrowser, serial: ++serial.current })
  }, [initialBrowser])
  useEffect(() => {
    if (initialCard) setDialog({ kind:'card',target:initialCard })
  }, [initialCard])
  const openType = (type: App['type']) => {
    const app = project.apps.find(a => a.type === type && a.enabled)
    if (app) manager.open(app)
    else setDialog({ kind: 'modal', target: '此应用暂不可用' })
  }
  function act(action?: Action, chain = new Set<string>()) {
    if (!action || !matches(action.when, current.current, project)) return
    const { kind, target } = action
    switch (kind) {
      case 'none': break
      case 'app': {
        const app = project.apps.find(item => item.id === target)
        if (app) manager.open(app)
        break
      }
      case 'card':
      case 'image':
      case 'file':
      case 'modal': setDialog({ kind, target }); break
      case 'chat':
      case 'moments':
        setDialog(null)
        openType('chat')
        setChatRoute({ view: kind === 'chat' ? 'thread' : 'moments', target, serial: ++serial.current })
        break
      case 'url':
        setDialog(null)
        openType('browser')
        setBrowserRoute({ url: target, serial: ++serial.current })
        break
      case 'clue': update({ clues: setMembership(current.current.clues, target) }); break
      case 'flag':
      case 'unlock': update({ flags: setMembership(current.current.flags, target, kind === 'unlock' || action.value !== false) }); break
      case 'event': {
        const event = project.events.find(item => item.id === target)
        if (!event || chain.has(target) || !matches(event.when, current.current, project)) break
        const next = new Set([...chain, target])
        event.actions.forEach(item => act(item, next))
        break
      }
    }
  }
  function add(contact: Contact) {
    if (contact.initial || current.current.friends.includes(contact.id) || !matches(contact.unlock, current.current, project)) return false
    update({ friends: setMembership(current.current.friends, contact.id) })
    act({ kind: 'chat', target: contact.id })
    act(contact.onAdd)
    return true
  }
  function read(id: string, action?: Action) {
    if (!action || current.current.read.includes(id) || !matches(action.when, current.current, project)) return
    update({ read: setMembership(current.current.read, id) })
    act(action)
  }
  function login(id: string) {
    const account = project.accounts.find(item => item.id === id)
    if (!account || !matches(account.when, current.current, project)) return
    update({ accounts: setMembership(current.current.accounts, id) })
    act(account.onLogin)
  }
  const launch = (app: App) => {
    if (app.enabled && app.action) act(app.action)
    else manager.open(app)
  }
  const theme = project.theme
  const desktopStyle = {
    '--bg': theme.background, '--surface': theme.surface, '--text': theme.text, '--accent': theme.accent,
    '--border': theme.border, '--radius': theme.radius + 'px', '--gap': theme.gap + 'px',
    '--font': theme.font, '--font-size': theme.fontSize + 'px',
  } as CSSProperties
  const dockApps = project.apps.filter(app => app.dock || manager.windows.some(w => w.id === app.id))
  const liveWindows = manager.windows.filter(item => !item.hidden && project.apps.some(app => app.id === item.id))
  const activeId = liveWindows.reduce((best, item) => !best || best.z < item.z ? item : best, null as (typeof liveWindows)[number] | null)?.id
  const time = clock.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
  const date = clock.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })
  return <GameContext.Provider value={{ project, state, chatRoute, browserRoute, entryRequest:initialEntry, messageRequest:initialMessage, act, modal: setDialog, add, read, login }}>
    <main className="desktop" style={desktopStyle}>
      {theme.wallpaperMode !== 'solid' && <img className="desktop-wallpaper" alt="" aria-hidden="true"
        src={imageUrl(project,theme.wallpaper) || wallpaper} onError={event => {
          if (event.currentTarget.getAttribute('src') !== wallpaper) event.currentTarget.src = wallpaper
        }} />}
      <div className="system-bar">
        <button className="system-brand" onClick={() => setDialog({ kind: 'about', target: '' })} title="关于星屿 OS"><span><Sparkles size={16} /></span>星屿 OS</button>
        <span className="system-rule" />
        <span className="system-name">麦德林之梦</span>
        <div className="system-right">
          {topAction}
          <div className="status-icons" aria-hidden="true"><Wifi size={15} /><Volume2 size={15} /><BatteryFull size={19} /></div>
          <time className="system-time">{date} <b>{time}</b></time>
        </div>
      </div>
      <div className="desktop-stage" ref={manager.area}>
        <div className={`desktop-shortcuts ${theme.layout}`}>
          {project.apps.map(app => <button key={app.id} className="desktop-link" onClick={() => launch(app)}
            style={theme.layout === 'grid' ? { gridColumn: app.column, gridRow: app.row } : undefined}>
            <AppIcon icon={app.icon} app={app} project={project} active={activeId === app.id} /><span>{app.name}</span>
          </button>)}
        </div>
        <div className="desktop-corner"><RadioTower size={14} /> <span>星屿终端</span><span className="corner-divider" /><span>本地会话</span></div>
        {manager.windows.map(item => {
          const app = project.apps.find(a => a.id === item.id)
          if (!app) return null
          return <AppWindow key={item.id} item={item} manager={manager} title={app.name} icon={<AppIcon icon={app.icon} app={app} project={project} context="title" />}>
            {app.enabled && app.type !== 'unavailable' ? <AppContent app={app} active={!item.hidden && activeId === item.id} /> : <div className="unavailable">
              <CircleAlert size={30} /><strong>此应用暂不可用</strong><button className="primary-button" onClick={() => manager.close(item.id)}>确定</button>
            </div>}
          </AppWindow>
        })}
      </div>
      <div className="dock-bar">
        <button className="fiction-label" onClick={() => setDialog({ kind: 'about', target: '' })}><Info size={15} /> 虚构系统说明</button>
        <nav className="dock" aria-label="任务栏">
          {dockApps.map(app => {
            const opened = manager.windows.find(w => w.id === app.id)
            return <button key={app.id} className={`dock-item ${opened ? 'running' : ''} ${activeId === app.id ? 'active' : ''}`}
              aria-label={`任务栏 · ${app.name}`} title={app.name} onClick={() => opened ? manager.focus(app.id) : launch(app)}>
              <AppIcon icon={app.icon} app={app} project={project} context="dock" active={activeId === app.id} /><i />
            </button>
          })}
        </nav>
      </div>
      {dialog && <GameDialog dialog={dialog} close={() => setDialog(null)} />}
    </main>
  </GameContext.Provider>
}
