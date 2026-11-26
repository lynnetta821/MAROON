import { useEffect, useMemo, useRef, useState } from 'react'
import { FlaskConical, PencilRuler } from 'lucide-react'
import { parseProject } from '../game/schema.mjs'
import type { Project } from '../game/types'
import { Desktop } from '../ui/Desktop'
import defaults from '../../data/default.json'
import { createDemo } from './demo'
import { Studio } from './Studio'
import { browserDraft, getSession, sendProject, useDraft } from './draft'
import type { Session } from './draft'
import '../styles/studio.css'

const base = parseProject(defaults) as Project
const demo = createDemo(base)
type Mode = 'studio' | 'player' | 'demo'
const readMode = (): Mode | null => {
  const value = location.hash.slice(1)
  return value === 'studio' || value === 'player' || value === 'demo' ? value : null
}
function LocalGame({ session, initial }: { session: Session | null; initial: Project }) {
  const [published,setPublished] = useState(session?.published.project || base)
  const revision = useRef(session?.published.revision ?? null)
  const hasPublished = useMemo(() => JSON.stringify(published) !== JSON.stringify(base),[published])
  const defaultMode = hasPublished ? 'player' : 'demo'
  const [mode,setMode] = useState<Mode>(() => readMode() || defaultMode)
  const draft = useDraft(initial,session)
  const changeMode = (next: Mode) => { history.replaceState(null,'','#' + next); setMode(next) }
  useEffect(() => {
    const handle = () => setMode(readMode() || defaultMode)
    window.addEventListener('hashchange',handle)
    return () => window.removeEventListener('hashchange',handle)
  },[defaultMode])
  const publish = async (project: Project) => {
    if (!session) throw new Error('本地写入接口暂不可用，请导出后应用到项目。')
    revision.current = await sendProject(session.token,'published',project,revision.current)
    setPublished(project)
  }
  if (mode === 'studio') return <Studio draft={draft} base={base} demo={demo} canPublish={!!session}
    exit={() => changeMode(defaultMode)} publish={publish} />
  const project = mode === 'player' ? published : demo
  return <Desktop key={mode} project={project} persistent={mode === 'player'}
    initialApp={project.apps.find(a => a.enabled && a.type === 'chat')?.id}
    topAction={<>{mode === 'demo' && <span className="demo-pill" title="此会话仅包含占位内容"><FlaskConical size={13} />测试会话</span>}
      <button className="studio-entry" onClick={() => changeMode('studio')}><PencilRuler size={14} /> ARG Studio</button></>} />
}
export function DevShell() {
  const [data,setData] = useState<{ session: Session | null; initial: Project } | null>(null)
  useEffect(() => {
    let mounted = true
    void getSession().then(session => {
      const project = session.published.project
      const initial = session.draft.project || (project && JSON.stringify(project) !== JSON.stringify(base) ? project : demo)
      if (mounted) setData({ session,initial })
    }).catch(async () => {
      const initial = await browserDraft().catch(() => undefined) || demo
      if (mounted) setData({ session:null,initial })
    })
    return () => { mounted = false }
  },[])
  return data ? <LocalGame {...data} /> : <div className="boot-screen" role="status">正在启动星屿 OS…</div>
}
