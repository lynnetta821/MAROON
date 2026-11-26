import type { App, Asset, IconTheme, Project } from '../game/types'
import { makeId } from '../game/state'
import { builtinIcons } from '../icons/registry.mjs'

type AppIconConfig = Pick<App,'id' | 'icon' | 'iconMode' | 'iconColors'>
export type IconThemeFile = {
  format: 'maroon-icon-theme'
  version: 1
  theme: IconTheme
  apps: AppIconConfig[]
  assets: Asset[]
}

export function exportIconTheme(project: Project): IconThemeFile {
  const apps = project.apps.map(({ id,icon,iconMode,iconColors }) => ({ id,icon,iconMode,iconColors }))
  const ids = new Set(apps.map(app => app.icon))
  return {
    format:'maroon-icon-theme',
    version:1,
    theme:project.theme.icons ?? {},
    apps,
    assets:project.assets.filter(asset => ids.has(asset.id))
  }
}

export function applyIconTheme(project: Project, file: IconThemeFile): Project {
  const configs = new Map(file.apps.map(app => [app.id,app]))
  const used = new Set(project.apps.map(app => configs.get(app.id)?.icon))
  const assets = [...project.assets]
  const replacements = new Map<string,string>()
  const taken = new Set([
    ...project.apps,...assets,...project.contacts,...project.threads,...project.posts,...project.pages,...project.search,
    ...project.accounts,...project.notes,...project.trash,...project.events,...project.flags,...project.clues,
    ...project.threads.flatMap(thread => thread.messages),...project.posts.flatMap(post => post.comments)
  ].map(item => item.id))
  taken.add('self')
  for (const id of builtinIcons) taken.add(id)
  for (const asset of file.assets) {
    if (!used.has(asset.id)) continue
    const existing = assets.find(item => item.id === asset.id)
    if (existing?.data === asset.data && existing.mime === asset.mime) continue
    // Preserve every existing reference when an imported ID already belongs to the project.
    const id = taken.has(asset.id) || asset.id.startsWith('demo-') ? makeId() : asset.id
    taken.add(id)
    replacements.set(asset.id,id)
    assets.push({ ...asset,id })
  }
  const apps = project.apps.map(app => {
    const config = configs.get(app.id)
    return config ? { ...app,icon:replacements.get(config.icon) ?? config.icon,
      iconMode:config.iconMode,iconColors:config.iconColors } : app
  })
  return { ...project,apps,assets,theme:{ ...project.theme,icons:file.theme } }
}

export function defaultAppIcon(app: App, defaults: Project) {
  return { ...app,icon:defaults.apps.find(item => item.id === app.id)?.icon ??
    (app.type === 'unavailable' ? 'files' : app.type),iconMode:undefined,iconColors:undefined }
}
