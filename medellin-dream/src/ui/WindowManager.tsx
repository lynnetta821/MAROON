import { useEffect, useRef, useState } from 'react'
import type { PointerEvent, ReactNode } from 'react'
import { Maximize2, Minus, Minimize2, X } from 'lucide-react'
import type { App, Theme } from '../game/types'

type Bounds = { x: number; y: number; w: number; h: number }
export type WindowState = Bounds & { id: string; hidden: boolean; max: boolean; z: number }
const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), Math.max(min, max))
const fit = (rect: Bounds, width: number, height: number) => {
  const w = Math.min(rect.w, width)
  const h = Math.min(rect.h, height)
  return {
    w, h,
    x: clamp(rect.x, Math.min(0, 132 - w), width - Math.min(w, 132)),
    y: clamp(rect.y, 0, height - Math.min(h, 48))
  }
}
export function useWindowManager(theme: Theme) {
  const area = useRef<HTMLDivElement>(null)
  const level = useRef(1)
  const [windows, setWindows] = useState<WindowState[]>([])
  const size = () => ({ w: area.current?.clientWidth || window.innerWidth, h: area.current?.clientHeight || window.innerHeight })
  const update = (id: string, patch: Partial<WindowState>) => setWindows(all => all.map(item => item.id === id ? { ...item, ...patch } : item))
  const focus = (id: string) => update(id, { z: ++level.current, hidden: false })
  const open = (app: App) => {
    const z = ++level.current
    const bounds = size()
    setWindows(all => {
      if (all.some(item => item.id === app.id)) return all.map(item => item.id === app.id ? { ...item, hidden: false, z } : item)
      const w = Math.min(app.type === 'unavailable' || !app.enabled ? 420 : theme.windowWidth, bounds.w - 16)
      const h = Math.min(app.type === 'unavailable' || !app.enabled ? 235 : theme.windowHeight, bounds.h - 15)
      const offset = (all.length % 5) * 24
      const x = Math.max(8, (bounds.w - w) / 2 + (bounds.w > 1110 && w > 500 ? 64 : 0) + offset)
      const y = Math.max(8, (bounds.h - h) * 0.43 + offset)
      return [...all, { ...fit({ x, y, w, h }, bounds.w, bounds.h), id: app.id, z, hidden: false, max: false }]
    })
  }
  const close = (id: string) => setWindows(all => all.filter(item => item.id !== id))
  useEffect(() => {
    const element = area.current
    if (!element) return
    const observer = new ResizeObserver(() => {
      setWindows(all => all.map(item => ({ ...item, ...fit(item, element.clientWidth, element.clientHeight) })))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return { area, windows, open, close, focus, update, size }
}
export type WindowManager = ReturnType<typeof useWindowManager>
export function AppWindow({ item, manager, title, icon, children }: {
  item: WindowState; manager: WindowManager; title: string; icon: ReactNode; children: ReactNode
}) {
  const gesture = useRef<{ x: number; y: number; box: Bounds; resize: boolean } | null>(null)
  const start = (event: PointerEvent<HTMLElement>, resize: boolean) => {
    if (item.max || event.button !== 0 || (event.target as HTMLElement).closest('button')) return
    event.currentTarget.setPointerCapture(event.pointerId)
    gesture.current = { x: event.clientX, y: event.clientY, box: item, resize }
  }
  const move = (event: PointerEvent<HTMLElement>) => {
    const active = gesture.current
    if (!active) return
    const { w, h } = manager.size()
    const dx = event.clientX - active.x
    const dy = event.clientY - active.y
    const { box } = active
    const next = active.resize
      ? { ...box, w: clamp(box.w + dx, Math.min(320, w), w), h: clamp(box.h + dy, Math.min(180, h), h) }
      : { ...box, x: box.x + dx, y: box.y + dy }
    manager.update(item.id, fit(next, w, h))
  }
  const clear = () => { gesture.current = null }
  const toggleMax = () => manager.update(item.id, { max: !item.max })
  return <section aria-label={title} className={`app-window ${item.max ? 'max' : ''}`} hidden={item.hidden}
    onPointerDown={() => manager.focus(item.id)}
    onFocus={() => { if (!item.hidden && manager.windows.some(other => !other.hidden && other.z > item.z)) manager.focus(item.id) }}
    style={{ left: item.max ? 0 : item.x, top: item.max ? 0 : item.y, width: item.max ? '100%' : item.w, height: item.max ? '100%' : item.h, zIndex: item.z }}>
    <header className="window-title" onPointerDown={e => start(e, false)} onPointerMove={move} onLostPointerCapture={clear} onDoubleClick={e => { if (!(e.target as HTMLElement).closest('button')) toggleMax() }}>
      <span className="title-icon">{icon}</span><strong>{title}</strong>
      <div className="window-controls">
        <button title="最小化" aria-label="最小化" onClick={() => manager.update(item.id, { hidden: true })}><Minus size={15} /></button>
        <button title={item.max ? '还原' : '最大化'} aria-label={item.max ? '还原' : '最大化'} onClick={toggleMax}>{item.max ? <Minimize2 size={13} /> : <Maximize2 size={13} />}</button>
        <button title="关闭窗口" aria-label="关闭窗口" onClick={() => manager.close(item.id)}><X size={16} /></button>
      </div>
    </header>
    <div className="window-body">{children}</div>
    {!item.max && <div className="resize-handle" aria-hidden="true" onPointerDown={e => start(e, true)} onPointerMove={move} onLostPointerCapture={clear} />}
  </section>
}
