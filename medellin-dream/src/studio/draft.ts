import { useCallback, useEffect, useRef, useState } from 'react'
import type { Project } from '../game/types'
import { maxProject, parseProject } from '../game/schema.mjs'

export type Saved = { project: Project | null; revision: string | null }
export type Session = { token: string; draft: Saved; published: Saved }
export async function getSession(): Promise<Session> {
  const response = await fetch('./__arg_studio/project', { cache:'no-store' })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || '无法读取项目文件')
  return data
}
export async function sendProject(token: string, target: 'draft' | 'published', project: Project, revision: string | null): Promise<string> {
  const body = JSON.stringify({ target,project,revision })
  if (new Blob([body]).size > maxProject) throw new Error('项目超过 36 MiB。请减小素材或删除不用的文件。')
  const res = await fetch('./__arg_studio/project', { method:'PUT',headers:{ 'content-type':'application/json','x-arg-studio':token },body })
  const result = await res.json()
  if (!res.ok) throw Object.assign(new Error(result.error || '项目文件保存失败'), { status:res.status })
  return result.revision
}
function historyDb(): Promise<IDBDatabase> {
  return new Promise((resolve,reject) => {
    const request = indexedDB.open('medellin-studio',1)
    request.onupgradeneeded = () => request.result.createObjectStore('draft')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}
export async function browserDraft(project?: Project): Promise<Project | undefined> {
  const db = await historyDb()
  try {
    return await new Promise((resolve,reject) => {
      const tx = db.transaction('draft',project ? 'readwrite' : 'readonly')
      const store = tx.objectStore('draft')
      const request = project ? store.put(project,'project') : store.get('project')
      tx.oncomplete = () => {
        try { resolve(project || (request.result ? parseProject(request.result) as Project : undefined)) }
        catch (error) { reject(error) }
      }
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally { db.close() }
}
export function useDraft(initial: Project, session: Session | null) {
  const [project,setProject] = useState(initial)
  const initialStatus = session?.draft.project ? '已读取项目草稿' : session ? '尚未保存草稿' : '离线草稿 · 通过导出应用到项目'
  const savedStatus = session ? '项目草稿已保存' : '浏览器草稿已保存 · 待导出应用'
  const [status,setStatus] = useState(initialStatus)
  const [error,setError] = useState('')
  const past = useRef<Project[]>([])
  const future = useRef<Project[]>([])
  const now = useRef(initial)
  const saved = useRef(initial)
  const revision = useRef(session?.draft.revision || null)
  const pending = useRef(Promise.resolve(true))
  const conflict = useRef(false)
  const edited = useRef(false)
  const committed = useRef(Boolean(session?.draft.project))
  const replace = (value: Project) => {
    edited.current = true
    now.current = value
    setProject(value)
    if (!conflict.current) { setError(''); setStatus('有未保存更改') }
  }
  const update = (fn: (project: Project) => Project) => {
    const next = fn(now.current)
    if (next === now.current) return
    past.current = [...past.current.slice(-49),now.current]
    future.current = []
    replace(next)
  }
  const undo = () => {
    const value = past.current.pop()
    if (!value) return
    future.current.push(now.current)
    replace(value)
  }
  const redo = () => {
    const value = future.current.pop()
    if (!value) return
    past.current.push(now.current)
    replace(value)
  }
  const save = useCallback((force = false) => {
    const snapshot = now.current
    const operation = pending.current.then(async () => {
      if (conflict.current) return false
      if (!force && saved.current === snapshot) {
        if (now.current === snapshot) setStatus(committed.current ? savedStatus : initialStatus)
        return true
      }
      setStatus('正在保存…')
      try {
        if (session) revision.current = await sendProject(session.token,'draft',snapshot,revision.current)
        else await browserDraft(parseProject(snapshot) as Project)
        saved.current = snapshot
        committed.current = true
        setError('')
        setStatus(now.current === snapshot ? savedStatus : '有未保存更改')
        return true
      } catch (error) {
        conflict.current = (error as { status?: number }).status === 409
        setStatus('保存失败')
        setError((error as Error).message)
        return false
      }
    })
    pending.current = operation
    return operation
  }, [session,savedStatus,initialStatus])
  useEffect(() => {
    if (!edited.current || conflict.current) return
    const timeout = window.setTimeout(() => void save(),650)
    return () => window.clearTimeout(timeout)
  },[project,save])
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (now.current !== saved.current) { event.preventDefault(); event.returnValue = '' }
    }
    window.addEventListener('beforeunload',guard)
    return () => window.removeEventListener('beforeunload',guard)
  },[])
  return { project,status,error,update,save,undo,redo,canUndo:!!past.current.length,canRedo:!!future.current.length }
}
