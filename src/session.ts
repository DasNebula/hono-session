// noinspection JSPotentiallyInvalidUsageOfClassThis

import {HTTPException} from 'hono/http-exception'
import {getRandomId} from './utils/getRandomId'
import {CookieWithContext} from './utils/cookieWithContext'
import {SessionData, SessionObject} from './types'

type SessionOptions = {
  cookie: CookieWithContext
  cookie_name: string
  kvNamespace: KVNamespace
  prefix: string
  ttl: number
}

const TTL_MIN = 60
const TTL_MAX = 400 * 24 * 60 * 60

export class Session {
  cookie: CookieWithContext
  cookie_name: string
  kvNamespace: KVNamespace
  prefix: string
  ttl: number
  id: string
  is_new: boolean
  data: Partial<SessionData> | undefined

  constructor({
                cookie,
                cookie_name,
                kvNamespace,
                prefix,
                ttl,
              }: SessionOptions) {
    this.cookie = cookie
    this.cookie_name = cookie_name
    this.kvNamespace = kvNamespace
    this.prefix = prefix
    this.ttl = ttl
    this.data = undefined
    this.id = ''
    this.is_new = true

    if (this.ttl < TTL_MIN || this.ttl > TTL_MAX) {
      throw new HTTPException(500, {
        message: 'Invalid TTL',
      })
    }

    this.initialize()
  }

  initialize() {
    const id = this.cookie.get(this.cookie_name)
    this.is_new = id === undefined
    this.id = id || getRandomId()

    this.updateCookie()
  }

  updateCookie() {
    this.cookie.set(this.cookie_name, this.id, {
      httpOnly: true,
      path: '/',
      maxAge: this.ttl,
    });
  }

  deleteCookie() {
    this.cookie.delete(this.cookie_name, {
      httpOnly: true,
      path: '/',
    });
  }

  getKey() {
    return `${this.prefix}:${this.id}`
  }

  async getData(): Promise<SessionObject> {
    const key = this.getKey()
    const datastore = this.kvNamespace
    const ttl = this.ttl
    const id = this.id
    const deleteCookie = this.deleteCookie.bind(this)
    this.data = {}
    if (!this.is_new) {
      try {
        this.data = JSON.parse(await datastore!.get(key) || '{}') || {}
      } catch (err) {
        console.error(`KV returned error: ${err}`);
      }
    }

    return {
      id: id,
      data: this.data as SessionData,
      save: async function (): Promise<boolean> {
        return await saveSession(key, this.data, datastore!, ttl)
      },
      destroy: async function (): Promise<boolean> {
        this.data = {}
        deleteCookie()
        return await destroySession(key, datastore!)
      }
    } as SessionObject
  }
}

async function saveSession(
  key: string,
  data: Partial<SessionData>,
  datastore: KVNamespace,
  ttl: number
): Promise<boolean> {
  const expiration = {
    expirationTtl: ttl,
  }
  try {
    await datastore.put(key, JSON.stringify(data), expiration)
  } catch (err) {
    console.error(`KV returned error: ${err}`);
    return false
  }
  return true
}

async function destroySession(
  key: string,
  datastore: KVNamespace,
): Promise<boolean> {
  try {
    await datastore.delete(key)
  } catch (err) {
    console.error(`KV returned error: ${err}`);
    return false
  }
  return true
}
