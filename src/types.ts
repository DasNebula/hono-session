export type SessionObject = {
  readonly id: string
  data: SessionData
  readonly save: () => Promise<boolean>
  readonly destroy: () => Promise<boolean>
  is_deleted: boolean
}

export type SessionData = {
  [key: string]: any
}
