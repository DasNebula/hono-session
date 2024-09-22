import type {MiddlewareHandler} from 'hono'
import {env} from 'hono/adapter'
import {HTTPException} from 'hono/http-exception'
import {Session} from './session'
import {CookieWithContext} from './utils/cookieWithContext'

export function sessionStart(options?: {
  cookie_name?: string
  kvNamespace?: KVNamespace | string
  prefix?: string
  ttl?: number
}): MiddlewareHandler {
  return async (c, next) => {
    const cookie = new CookieWithContext(c)
    const opts = options || {}
    let kv = opts.kvNamespace || 'SESSION_DATASTORE'
    if (typeof kv === 'string') {
      try {
        kv = env(c)[kv]
      } catch (err) {
        console.error(err)
        throw new HTTPException(500, {
          message: 'Session datastore was not found.',
        })
      }
    }

    // Create new Session instance
    const session = new Session({
      cookie: cookie,
      cookie_name: opts.cookie_name || '__session',
      kvNamespace: kv as KVNamespace,
      prefix: opts.prefix || 'session',
      ttl: opts.ttl || 2592000 // 30 days
    })

    // Retrieve data from session
    const sessionObject = await session.getData()

    // Set return info
    c.set('session', sessionObject)

    await next()
  }
}
