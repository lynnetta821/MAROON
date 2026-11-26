import { useRef } from 'react'
import { Download, RotateCcw, Upload } from 'lucide-react'
import { builtinIcons, iconAssetMimes, iconDefaults, iconRanges, iconRegistry } from '../icons/registry.mjs'
import { maxProject, parseIconTheme } from '../game/schema.mjs'
import type { App, IconColors, IconMode, IconTheme, Project } from '../game/types'
import { imageUrl } from '../game/state'
import { AppIcon } from '../ui/icons'
import { ChoiceField, Fold, NumberField, TextField, choice, choiceList, readAsset, useStudio } from './controls'
import { applyIconTheme, defaultAppIcon, exportIconTheme } from './iconTheme'
import type { IconThemeFile } from './iconTheme'
import '../styles/icon-manager.css'

const iconChoices = builtinIcons.map(id => choice(id,iconRegistry[id as keyof typeof iconRegistry].name))

const colorFields = [
  ['fill','主体填充色'],['stroke','主体线条色'],['plate','底板色'],['border','底板边框色'],['accent','辅助填充色']
] as const
const sizes = [['size','桌面尺寸（px）'],['radius','底板圆角'],['opacity','不透明度（%）'],['scale','主体比例（%）']] as const

export function IconLibrary({ selected, select }: { selected: string; select: (value:string) => void }) {
  const { project } = useStudio()
  const tab = selected.startsWith('builtin:') ? 'builtins' : 'apps'
  const chooseTab = (next: typeof tab) => {
    if (next !== tab) select(next === 'apps' ? 'app:' + (project.apps[0]?.id || '') : 'builtin:' + builtinIcons[0])
  }
  const items = tab === 'apps' ? project.apps.map(app => ({ id:'app:' + app.id, name:app.name,icon:app.icon, app })) :
    iconChoices.map(item => ({ id:'builtin:' + item.value,name:item.label,icon:item.value,app:undefined }))
  return <section className="icon-library" aria-label="图标资源库">
    <div className="icon-library-tabs">
      <button className="studio-small" aria-pressed={tab === 'apps'} onClick={() => chooseTab('apps')}>应用图标</button>
      <button className="studio-small" aria-pressed={tab === 'builtins'} onClick={() => chooseTab('builtins')}>内置图标</button>
    </div>
    <div className="icon-library-grid">{items.map((item,index) => <button key={item.id} type="button" className="icon-library-item"
      aria-pressed={selected ? selected === item.id : index === 0} title={item.name} onClick={() => select(item.id)}>
      <AppIcon project={project} icon={item.icon} app={item.app} context="gallery" /><span>{item.name}</span>
    </button>)}</div>
    {!items.length && <p className="studio-hint">桌面应用面板中还没有配置应用。</p>}
  </section>
}

export function IconFields({ selected, defaults }: { selected: string; defaults: Project }) {
  const { project,update,report } = useStudio()
  const theme = project.theme.icons ?? {}
  const builtin = selected.startsWith('builtin:') ? selected.slice(8) : ''
  const app = !builtin ? project.apps.find(item => item.id === selected.slice(4)) || project.apps[0] : undefined
  const icon = app?.icon || builtin
  const isCustom = Boolean(app && imageUrl(project,app.icon))
  const colors = { ...iconDefaults, ...(isCustom ? undefined : theme.glyphs?.[icon]), ...app?.iconColors }
  const input = useRef<HTMLInputElement>(null)
  const patchTheme = (patch: IconTheme) => update(p => ({ ...p,theme:{ ...p.theme,icons:{ ...p.theme.icons,...patch } } }))
  const patchApp = (app: App, changes: Partial<App>) => update(p => ({ ...p,apps:p.apps.map(a => a.id === app.id ? { ...a,...changes } : a) }))
  const setColor = (key: keyof IconColors, value: string) => {
    if (app) {
      update(p => ({ ...p,apps:p.apps.map(item => item.id === app.id ? { ...item,iconColors:{ ...item.iconColors,[key]:value } } : item) }))
      return
    }
    if (builtin) patchTheme({ glyphs:{ ...theme.glyphs,[builtin]:{ ...theme.glyphs?.[builtin],[key]:value } } })
  }
  const restoreSingle = () => {
    if (app) {
      update(p => ({ ...p,apps:p.apps.map(item => item.id === app.id ? defaultAppIcon(item,defaults) : item) }))
    } else if (builtin) {
      const glyphs = { ...theme.glyphs }
      delete glyphs[builtin]
      patchTheme({ glyphs })
    }
    report('已恢复选中图标的默认设计。')
  }
  const restoreAll = () => {
    update(p => ({ ...p,theme:{ ...p.theme,icons:undefined },apps:p.apps.map(item => defaultAppIcon(item,defaults)) }))
    report('已恢复全局默认图标。可按撤销恢复。')
  }
  const uploadIcon = async (file: File | undefined, app: App) => {
    if (!file) return
    try {
      const asset = await readAsset(file,true)
      if (!iconAssetMimes.includes(asset.mime)) throw new Error('图标上传仅支持 SVG、PNG 和 WebP。')
      update(p => {
        if (!p.apps.some(item => item.id === app.id)) return p
        return { ...p,assets:[...p.assets,{ ...asset,category:'图标' }],
          apps:p.apps.map(item => item.id === app.id ? { ...item,icon:asset.id,iconMode:item.iconMode ?? 'plate' } : item) }
      })
      report('图标已加入素材库并应用到选中应用。')
    } catch (error) { report((error as Error).message) }
  }
  const downloadTheme = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(exportIconTheme(project),null,2) + '\n'],{type:'application/json'}))
    const link = document.createElement('a')
    link.href = url
    link.download = 'maroon-icon-theme.json'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url),5000)
  }
  const importTheme = async (file?: File) => {
    if (!file) return
    try {
      if (file.size > maxProject) throw new Error('图标主题文件超过 36 MiB。')
      const config = parseIconTheme(JSON.parse(await file.text())) as unknown as IconThemeFile
      const matched = config.apps.filter(item => project.apps.some(a => a.id === item.id)).length
      update(p => {
        const next = applyIconTheme(p,config)
        if (new Blob([JSON.stringify(next)]).size > maxProject) throw new Error('导入后项目会超过 36 MiB。')
        return next
      })
      report(matched < config.apps.length ?
        `已导入图标主题。已匹配 ${matched} 个应用，${config.apps.length - matched} 个应用在此项目中不存在。` : '已导入图标主题及其素材。')
    } catch (error) { report('导入图标主题失败 · ' + (error as Error).message) }
  }
  return <div className="icon-manager-fields">
    <Fold title="全局图标外观" defaultOpen>
      <div className="studio-pair">{sizes.map(([key,label]) => <NumberField key={key} label={label}
        min={iconRanges[key][0]} max={iconRanges[key][1]} value={theme[key] ?? iconDefaults[key]}
        onChange={value => patchTheme({ [key]:Math.min(iconRanges[key][1],Math.max(iconRanges[key][0],Math.round(value))) })} />)}</div>
    </Fold>
    {icon && <section className="icon-selection">
      <header>
        <AppIcon project={project} icon={icon} app={app} context="gallery" />
        <div><small>{app ? '应用图标' : '内置图标'}</small><h3>{app?.name || iconChoices.find(item => item.value === builtin)?.label}</h3></div>
      </header>
      {app && <>
        <ChoiceField label="替换应用图标" value={app.icon} empty="默认文件夹" onChange={icon => patchApp(app,{icon})}
          options={[...iconChoices,...choiceList(project.assets.filter(asset => asset.mime.startsWith('image/')),asset => asset.name)]} />
        {isCustom && <ChoiceField label="自定义图标显示模式" value={app.iconMode ?? 'original'} onChange={iconMode => patchApp(app,{iconMode:iconMode as IconMode})}
          options={[choice('plate','系统统一底板'),choice('original','使用图片原始外观')]} />}
        <label className="file-label"><Upload size={14} />上传图标<input type="file" aria-label="上传图标" accept={iconAssetMimes.join(',')}
          onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; void uploadIcon(file,app) }} /></label>
      </>}
      <div className="icon-color-fields">{colorFields.map(([key,label]) => <TextField key={key} label={label}
        type="color" value={colors[key]} onChange={value => setColor(key,value)} />)}</div>
      {isCustom && <p className="studio-hint">原图保留自身色彩。选择系统底板后，底板色和边框色会应用到图标。</p>}
      <button className="studio-small" onClick={restoreSingle}><RotateCcw size={14} />恢复此图标默认</button>
    </section>}
    <Fold title="图标主题文件" defaultOpen>
      <div className="icon-theme-buttons">
        <button className="studio-small" onClick={() => input.current?.click()}><Upload size={14} />导入图标主题</button>
        <button className="studio-small" onClick={downloadTheme}><Download size={14} />导出图标主题</button>
        <button className="studio-small" onClick={restoreAll}><RotateCcw size={14} />恢复全局默认</button>
      </div>
      <p className="studio-hint">通过上方「保存草稿」持久化。通过「发布」写入正式内容。</p>
    </Fold>
    <input ref={input} type="file" accept=".json,application/json" aria-label="导入图标主题文件" hidden
      onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; void importTheme(file) }} />
  </div>
}
