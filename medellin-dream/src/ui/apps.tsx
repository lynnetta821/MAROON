import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, ImageOff, X } from 'lucide-react'
import type { App } from '../game/types'
import { useGame } from '../game/context'
import type { ModalView } from '../game/context'
import { imageUrl } from '../game/state'
import { Chat, DirectCard } from './Chat'
import { Browser } from './Browser'
import { Entries } from './Entries'

export function AppContent({ app, active }: { app: App; active: boolean }) {
  if (app.type === 'chat') return <Chat active={active} />
  if (app.type === 'browser') return <Browser />
  if (app.type === 'notes' || app.type === 'trash') return <Entries kind={app.type} />
  return null
}
export function GameDialog({ dialog, close }: { dialog: ModalView; close: () => void }) {
  const game = useGame()
  const panel = useRef<HTMLElement>(null)
  const [index, setIndex] = useState(dialog.index ?? 0)
  const images = dialog.images || [dialog.target]
  const asset = game.project.assets.find(a => a.id === dialog.target)
  const contact = game.project.contacts.find(c => c.id === dialog.target)
  const move = (offset: number) => setIndex(i => (i + offset + images.length) % images.length)
  useEffect(() => { setIndex(dialog.index ?? 0) }, [dialog])
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    panel.current?.focus()
    return () => previous?.focus()
  }, [])
  let title = '系统提示'
  if (dialog.kind === 'card') title = '好友名片'
  if (dialog.kind === 'image') title = '图片查看器'
  if (dialog.kind === 'file') title = asset?.name || '文件'
  if (dialog.kind === 'about') title = '关于Aurora'
  return <div className="modal-backdrop" onClick={close}>
    <section ref={panel} tabIndex={-1} className={`game-dialog ${dialog.kind === 'image' ? 'image-dialog' : ''}`} role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()} onKeyDown={e => {
      if (e.key === 'Escape') close()
      if (dialog.kind === 'image' && e.key === 'ArrowLeft') move(-1)
      if (dialog.kind === 'image' && e.key === 'ArrowRight') move(1)
      if (e.key === 'Tab') {
        const focusable = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], audio, input, [tabindex="0"]') || [])
        const first = focusable.at(0)
        const last = focusable.at(-1)
        if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { e.preventDefault(); last?.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
      }
    }}>
      <header className="dialog-heading"><h2>{title}</h2><button className="icon-button" aria-label="关闭弹窗" onClick={close}><X size={19} /></button></header>
      {dialog.kind === 'card' ? (contact ? <DirectCard key={contact.id} contact={contact} /> : <p>找不到该联系人。</p>) :
        dialog.kind === 'image' ? <>
          {imageUrl(game.project, images[index]) ? <img className="viewer-image" src={imageUrl(game.project, images[index])} alt={`图片 ${index + 1}`} /> : <p><ImageOff size={16} /> 图片不可用</p>}
          {images.length > 1 && <div className="viewer-controls">
            <button className="icon-button" aria-label="上一张" onClick={() => move(-1)}><ChevronLeft size={20} /></button>{index + 1} / {images.length}
            <button className="icon-button" aria-label="下一张" onClick={() => move(1)}><ChevronRight size={20} /></button>
          </div>}
        </> : dialog.kind === 'file' ? asset ? <div className="file-preview">
          {asset.mime.startsWith('image/') && <img className="viewer-image" src={asset.data} alt={asset.name} />}
          {asset.mime.startsWith('audio/') && <audio src={asset.data} controls />}
          {asset.mime === 'text/plain' && <TextFile data={asset.data} />}
          <a download={asset.name} href={asset.data}><Download size={16} /> 保存游戏内附件</a>
        </div> : <p>附件不可用。</p> : <>
          <p>{dialog.kind === 'about' ? '《麦德林之梦》是一款虚构 ARG。桌面、通讯、网页、人物和账号均为游戏内容。游戏内浏览器仅打开预设的虚构页面。请输入游戏中提供的虚构账号。' : dialog.target}</p>
          <button className="primary-button" onClick={close}>确定</button>
        </>}
    </section>
  </div>
}
function TextFile({ data }: { data: string }) {
  try {
    const bytes = Uint8Array.from(atob(data.split(',')[1]), character => character.charCodeAt(0))
    return <pre>{new TextDecoder().decode(bytes)}</pre>
  } catch { return <p>文本附件不可读。</p> }
}
