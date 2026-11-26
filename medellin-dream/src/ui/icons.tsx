import { CalendarDays, Earth, Folder, Images, MessageCircle, Monitor, Music2, NotebookPen, Settings, Trash2 } from 'lucide-react'
import { imageUrl } from '../game/state'
import type { Project } from '../game/types'

export const icons = { chat: MessageCircle, browser: Earth, trash: Trash2, notes: NotebookPen, computer: Monitor, photos: Images, music: Music2, calendar: CalendarDays, settings: Settings, files: Folder }
export function AppIcon({ icon, project }: { icon: string; project: Project }) {
  const builtin = Object.hasOwn(icons,icon)
  const Glyph = builtin ? icons[icon as keyof typeof icons] : Folder
  const art = imageUrl(project, icon)
  return <span className={`app-icon icon-${builtin ? icon : 'custom'}`} aria-hidden="true">
    {art ? <img src={art} alt="" /> : <Glyph size={23} strokeWidth={1.75} />}
  </span>
}
