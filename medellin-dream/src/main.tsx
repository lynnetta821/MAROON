import { createRoot } from 'react-dom/client'
import { Desktop } from './ui/Desktop'
import type { Project } from './game/types'
import './styles/desktop.css'
import './styles/chat.css'
import './styles/apps.css'

const root = createRoot(document.getElementById('root')!)
const renderPlayer = async () => {
  const { default: data } = await import('../data/published.json')
  const project = data as Project
  root.render(<Desktop project={project} persistent initialApp={project.apps.find(app => app.type === 'chat' && app.enabled)?.id} />)
}
if (__STUDIO_LOCAL__ && ['localhost','127.0.0.1','[::1]'].includes(location.hostname)) {
  void import('./studio/DevShell').then(({ DevShell }) => root.render(<DevShell />))
} else {
  void renderPlayer()
}
