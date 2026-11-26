import { createElement } from 'react'
import type { CSSProperties } from 'react'
import { imageUrl } from '../game/state'
import type { App, Project } from '../game/types'
import { iconDefaults, iconRegistry } from '../icons/registry.mjs'
import '../styles/icons.css'

type Props = {
  project: Project
  icon: string
  app?: App
  context?: 'desktop' | 'dock' | 'title' | 'gallery'
  active?: boolean
}

export function AppIcon({ project, icon, app, context = 'desktop', active = false }: Props) {
  const source = app || !Object.hasOwn(iconRegistry,icon) ? imageUrl(project,icon) : ''
  const builtin = Object.hasOwn(iconRegistry,icon) ? icon as keyof typeof iconRegistry : 'files'
  const theme = project.theme.icons
  const colors = { ...iconDefaults, ...(source ? undefined : theme?.glyphs?.[builtin]), ...app?.iconColors }
  const style = {
    '--icon-size': (theme?.size ?? iconDefaults.size) + 'px',
    '--icon-radius': (theme?.radius ?? iconDefaults.radius) + 'px',
    '--icon-alpha': (theme?.opacity ?? iconDefaults.opacity) / 100,
    '--icon-scale': (theme?.scale ?? iconDefaults.scale) / 100,
    '--icon-plate': colors.plate,
    '--icon-border': colors.border,
    '--icon-fill': colors.fill,
    '--icon-accent': colors.accent,
    '--icon-stroke': colors.stroke
  } as CSSProperties
  const original = Boolean(source && app?.iconMode !== 'plate')
  const unavailable = app && (!app.enabled || app.type === 'unavailable')
  return <span className="app-icon" data-context={context} data-original={original || undefined}
    data-unavailable={unavailable || undefined} data-active={active || undefined} style={style} aria-hidden="true">
    {!original && <svg className="app-icon-vector" viewBox="0 0 64 64" focusable="false">
      <rect className="app-icon-plate" x=".5" y=".5" width="63" height="63" />
      {!source && <g className="app-icon-glyph">
        {iconRegistry[builtin].shapes.map(([tag, attributes], index) => createElement(tag as string, { ...attributes as object, key:index }))}
      </g>}
    </svg>}
    {source && <img className="app-icon-image" src={source} alt="" draggable={false} />}
  </span>
}
