import type { Condition, PlayerState, Project } from './types'

export const emptyPlayer = (): PlayerState => ({ flags: [], friends: [], clues: [], accounts: [], read: [] })
const keys = { flag: 'flags', friend: 'friends', clue: 'clues', account: 'accounts' } as const
export const playerKey = 'medellin:player:v1'
export function restorePlayer(): PlayerState {
  const defaults = emptyPlayer()
  try {
    const saved = JSON.parse(localStorage.getItem(playerKey) || '{}')
    for (const key of Object.keys(defaults) as (keyof PlayerState)[]) {
      if (Array.isArray(saved?.[key])) defaults[key] = saved[key].filter((item: unknown) => typeof item === 'string')
    }
  } catch { /* The game can run when storage is unavailable. */ }
  return defaults
}
export function matches(when: Condition | undefined, state: PlayerState, project: Project): boolean {
  if (!when?.rules.length) return true
  const test = (rule: Condition['rules'][number]) => {
    const found = state[keys[rule.kind]].includes(rule.target) ||
      (rule.kind === 'friend' && project.contacts.some(c => c.id === rule.target && c.initial))
    return found === rule.value
  }
  return when.mode === 'all' ? when.rules.every(test) : when.rules.some(test)
}
export function setMembership(list: string[], id: string, value = true) {
  return value ? (list.includes(id) ? list : [...list, id]) : list.filter(item => item !== id)
}
export const makeId = () => globalThis.crypto.randomUUID()
export const assetUrl = (project: Project, id: string) => project.assets.find(a => a.id === id)?.data || ''
export const imageUrl = (project: Project, id: string) => project.assets.find(a => a.id === id && a.mime.startsWith('image/'))?.data || ''
export const normalizeUrl = (value: string) => value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '')
