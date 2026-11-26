import { createContext, useContext } from 'react'
import type { Action, Contact, PlayerState, Project } from './types'

export type ChatRoute = { view: 'thread' | 'moments'; target: string; serial: number }
export type BrowserRoute = { url: string; serial: number }
export type ModalView = { kind: 'card' | 'image' | 'file' | 'modal' | 'about'; target: string; images?: string[]; index?: number }
export type GameContextValue = {
  project: Project
  state: PlayerState
  chatRoute: ChatRoute | null
  browserRoute: BrowserRoute | null
  entryRequest?: string
  messageRequest?: string
  act: (action?: Action) => void
  modal: (modal: ModalView | null) => void
  add: (contact: Contact) => boolean
  read: (id: string, action?: Action) => void
  login: (id: string) => void
}
export const GameContext = createContext<GameContextValue | null>(null)
export function useGame() {
  const game = useContext(GameContext)
  if (!game) throw new Error('GameContext is required')
  return game
}
