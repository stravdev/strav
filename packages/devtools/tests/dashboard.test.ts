import { test, expect, describe } from 'bun:test'
import { compose } from '@stravigor/http'
import type { Handler, Middleware } from '@stravigor/http'
import { dashboardAuth } from '../src/dashboard/middleware.ts'
import { ctx } from './helpers.ts'

// ---------------------------------------------------------------------------
// Dashboard auth middleware
// ---------------------------------------------------------------------------

describe('dashboardAuth', () => {
  test('allows access in development environment', async () => {
    const original = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    const mw = dashboardAuth()
    const handler: Handler = c => c.json({ ok: true })

    const res = await compose([mw as Middleware], handler)(ctx())
    expect(res.status).toBe(200)

    process.env.NODE_ENV = original
  })

  test('allows access in local environment', async () => {
    const original = process.env.NODE_ENV
    const originalApp = process.env.APP_ENV
    delete process.env.NODE_ENV
    process.env.APP_ENV = 'local'

    const mw = dashboardAuth()
    const handler: Handler = c => c.json({ ok: true })

    const res = await compose([mw as Middleware], handler)(ctx())
    expect(res.status).toBe(200)

    process.env.NODE_ENV = original
    if (originalApp !== undefined) process.env.APP_ENV = originalApp
    else delete process.env.APP_ENV
  })

  test('denies access in production environment', async () => {
    const original = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    const mw = dashboardAuth()
    const handler: Handler = c => c.json({ ok: true })

    const res = await compose([mw as Middleware], handler)(ctx())
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'Unauthorized' })

    process.env.NODE_ENV = original
  })

  test('uses custom guard when provided', async () => {
    const original = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    // Guard that always allows
    const mw = dashboardAuth(() => true)
    const handler: Handler = c => c.json({ ok: true })

    const res = await compose([mw as Middleware], handler)(ctx())
    expect(res.status).toBe(200)

    process.env.NODE_ENV = original
  })

  test('custom guard can deny access', async () => {
    const mw = dashboardAuth(() => false)
    const handler: Handler = c => c.json({ ok: true })

    const res = await compose([mw as Middleware], handler)(ctx())
    expect(res.status).toBe(403)
  })

  test('custom guard receives context', async () => {
    let receivedPath: string | undefined

    const mw = dashboardAuth(c => {
      receivedPath = c.path
      return true
    })
    const handler: Handler = c => c.json({ ok: true })

    await compose([mw as Middleware], handler)(ctx('http://localhost/_devtools'))
    expect(receivedPath).toBe('/_devtools')
  })

  test('custom guard supports async', async () => {
    const mw = dashboardAuth(async () => {
      await Bun.sleep(1)
      return true
    })
    const handler: Handler = c => c.json({ ok: true })

    const res = await compose([mw as Middleware], handler)(ctx())
    expect(res.status).toBe(200)
  })
})
