export type Condition = { mode: 'all' | 'any'; rules: { kind: 'flag' | 'friend' | 'clue' | 'account'; target: string; value: boolean }[] }
export type ActionKind = 'none' | 'app' | 'card' | 'chat' | 'moments' | 'image' | 'file' | 'url' | 'modal' | 'clue' | 'flag' | 'unlock' | 'event'
export type Action = { kind: ActionKind; target: string; value?: boolean; when?: Condition }
export type Resource = { id: string }
export type AppType = 'chat' | 'browser' | 'trash' | 'notes' | 'unavailable'
export type IconColors = { plate?: string; border?: string; fill?: string; accent?: string; stroke?: string }
export type IconMode = 'plate' | 'original'
export type IconTheme = { size?: number; radius?: number; opacity?: number; scale?: number; glyphs?: Record<string,IconColors> }
export type App = Resource & { name: string; icon: string; iconMode?: IconMode; iconColors?: IconColors; type: AppType; enabled: boolean; dock: boolean; column: number; row: number; action?: Action }
export type Contact = Resource & {
  name: string; account: string; remark: string; avatar: string; color: string; signature: string; region: string; bio: string
  custom: { label: string; value: string; hidden: boolean }[]; hidden: string[]; initial: boolean; searchable: boolean
  unlock?: Condition; onAdd?: Action; cover: string
}
export type Message = Resource & {
  sender: string; type: 'text' | 'image' | 'system' | 'date' | 'link' | 'file'; text: string; time: string; media: string; url: string
  when?: Condition; action?: Action; onRead?: Action
}
export type Thread = Resource & {
  name: string; kind: 'direct' | 'group'; avatar: string; members: { contact: string; nickname: string }[]
  announcement: string; messages: Message[]; when?: Condition
}
export type Comment = Resource & { sender: string; text: string; replyTo: string }
export type Post = Resource & {
  author: string; text: string; time: string; location: string; images: string[]; layout: 'grid' | 'strip'
  likes: string[]; comments: Comment[]; when?: Condition; action?: Action; imageAction?: Action; hiddenClue: string
}
export type Asset = Resource & { name: string; category: string; mime: string; data: string }
export type Page = Resource & { title: string; url: string; body: string; kind: 'article' | 'student'; image: string; layout: 'article' | 'compact'; when?: Condition; action?: Action; actionLabel: string }
export type Search = Resource & { title: string; keywords: string; summary: string; thumbnail: string; page: string; order: number; when?: Condition }
export type Account = Resource & { name: string; username: string; password: string; page: string; when?: Condition; onLogin?: Action }
export type Entry = Resource & { title: string; body: string; date: string; asset: string; when?: Condition; action?: Action }
export type Named = Resource & { name: string }
export type StoryEvent = Named & { when?: Condition; actions: Action[] }
export type Theme = {
  icons?: IconTheme
  wallpaper: string; wallpaperMode?: 'image' | 'solid'; background: string; surface: string; text: string; accent: string; font: string; fontSize: number
  gap: number; border: string; radius: number; windowWidth: number; windowHeight: number; layout: 'grid' | 'column'
}
export type Project = {
  version: 1; theme: Theme; apps: App[]; contacts: Contact[]; threads: Thread[]; posts: Post[]; assets: Asset[]; pages: Page[]
  search: Search[]; accounts: Account[]; notes: Entry[]; trash: Entry[]; events: StoryEvent[]; flags: Named[]; clues: Named[]; home: string; notFound: string
}
export type PlayerState = { flags: string[]; friends: string[]; clues: string[]; accounts: string[]; read: string[] }
