# Session Middleware

Session middleware for [HonoJS](https://github.com/honojs/hono). This package offers a straightforward API for session management with [Cloudflare Workers KV](https://developers.cloudflare.com/kv/).

## Prerequisites

`hono-session` depends on `hono` and [Workers KV](https://developers.cloudflare.com/kv/get-started/).

## Installation

You can install `hono` and `hono-session` via npm.

```txt
npm i hono hono-session
```

## Usage

Hono Session simplifies persisting state across requests, enabling you to utilize session management with just a single method.

The simplest implementation is to attach the middleware to all requests.

```ts
app.use(sessionStart({ ... }))
```

However, Hono supports multiple ways to [register middleware](https://hono.dev/docs/guides/middleware).


```ts
app.use('/hello', sessionStart())

app.get('/hello', (c) => {
  const session = c.get('session')
  return c.json({
    name: session.data.name || 'John Doe',
  })
})
```

Or

```ts
app.post('/login', sessionStart(), async (c) => {
  // ...
  const session = c.get('session')
  session.data.lastLogin = new Date()
  await session.save()
  return c.redirect('/dashboard')
})

app.get('/last-login', sessionStart(), (c) => {
  const session = c.get('session')
  return c.json({
    last_login: session.data.lastLogin,
  })
})
```

### Session Start

You can configure the behavior of the middleware by passing options to the `sessionStart(opts?)` method.

```ts
import { Hono } from 'hono'
import { sessionStart } from 'hono-session'

const app = new Hono()

app.use(
  '/session',
  sessionStart({
    cookie_name: '__session',
    kvNamespace: 'SESSION_DATASTORE',
    prefix: 'session',
    ttl: 300, // 5 minutes
  })
)
```

#### Parameters

- `cookie_name`:
  - Type: `string`.
  - `Optional`.
  - The name of the cookie which is used to store the user's session id. Defaults to `__session`.
- `kvNamespace`:
  - Type: `string | KVNamespace`.
  - `Optional`.
  - The `kv_namespace` binding name from `wrangler.toml`, or the KVNamespace object itself (e.g. `c.env.SESSIONS`). Defaults to `c.env.SESSION_DATASTORE`.
- `prefix`:
  - Type: `string`.
  - `Optional`.
  - Prefix used for the session key. Keys are generated using `${prefix}:${session_id}`. Defaults to `session`. 
- `ttl`:
  - Type: `number`.
  - `Optional`.
  - The number of seconds after which an idle session will be destroyed. Must be between `60` and `34,560,000` (400 days). Defaults to `2,592,000` (30 days).
    > A session's idle time is defined as the time since last `save()`.

#### Session Flow

The session middleware runs before your Handler, and modifies the Context in two important ways.

1. Session ID is saved to the user's browser via a Cookie. The Response is updated on each Request to update the cookie's expiration.
2. Context is extended to add the `SessionObject`.

Session data is stored in  [Cloudflare Workers KV](https://developers.cloudflare.com/kv/). KV has both [free and paid tiers](https://developers.cloudflare.com/kv/platform/limits/). 
Data is wrapped in a `SessionObject`, accessed via `c.get('session')`.

- `SessionObject`:
  - Session object which can be used to preserve information across multiple Requests.
  - Type:
    ```
    {
      id: string
      data: {
        [key: string]: any
      }
      save: () => Promise<boolean>
      destroy: () => Promise<boolean>
    }
    ```
- `id`:
  - The session cookie value.
  - Type: `string`.
- `data`:
  - Session data. Information should only be read from and written to this object.
  - Type:
    ```
    {
      [key: string]: any
    }
    ```
- `save()`:
  - Asynchronous method to write `data` to session storage.
  - Return: `Promise<boolean>` resolves to `true` if data was saved successfully.
    > Data is not guaranteed to be saved until this method resolves to `true`.
- `destroy()`:
    - Asynchronous method to remove `data` from session storage, and delete the session cookie, effectively ending the session.
    - Return: `Promise<boolean>` resolves to `true` if the session ended successfully.

To access the session, use the `c.get` method within the callback of the HTTP request handler.

```ts
app.get('/visit', async (c) => {
  const session = c.get('session')
  session.data.visits = (session.data.visits || 0) + 1
  if (await session.save()) {
    return c.text(`You've visited ${session.data.visits} time(s).`)
  }

  throw new HTTPException(500, {
    message: 'Error saving session.',
  })
})
```

#### Destroy Session

```ts
app.get('/logout', async (c) => {
  const session = c.get('session')
  await session.destroy()

  c.redirect('/')
})
```


## Author

Das Nebula https://github.com/dasnebula

## License

MIT

## Contribute

If you want to add new features or solve some bugs please create an issue or make a PR.
