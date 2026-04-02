import { describe, test, expect } from 'bun:test'
import { TestCase } from '../src/test_case'
import { Router } from '@strav/http'

describe('TestCase Subdomain Support', () => {
  test('should handle subdomain routing', async () => {
    const t = new TestCase({ domain: 'example.com' })
    await t.setup()

    // Set up subdomain routes
    t.router.subdomain('api', (r) => {
      r.get('/users', (ctx) => ctx.json({ message: 'API users', subdomain: ctx.subdomain }))
    })

    // Test subdomain route
    const res = await t.onSubdomain('api').get('/users')
    expect(res.status).toBe(200)

    const data = await res.json() as any
    expect(data.message).toBe('API users')
    expect(data.subdomain).toBe('api')

    await t.teardown()
  })

  test('should handle dynamic subdomain parameters', async () => {
    const t = new TestCase({ domain: 'example.com' })
    await t.setup()

    // Set up dynamic subdomain routes
    t.router.subdomain(':tenant', (r) => {
      r.get('/dashboard', (ctx) => {
        return ctx.json({
          tenant: ctx.params.tenant,
          subdomain: ctx.subdomain
        })
      })
    })

    // Test with different tenant subdomains
    const acmeRes = await t.onSubdomain('acme').get('/dashboard')
    expect(acmeRes.status).toBe(200)

    const acmeData = await acmeRes.json() as any
    expect(acmeData.tenant).toBe('acme')
    expect(acmeData.subdomain).toBe('acme')

    const corpRes = await t.onSubdomain('corp').get('/dashboard')
    expect(corpRes.status).toBe(200)

    const corpData = await corpRes.json() as any
    expect(corpData.tenant).toBe('corp')
    expect(corpData.subdomain).toBe('corp')

    await t.teardown()
  })

  test('should handle main domain without subdomain', async () => {
    const t = new TestCase({ domain: 'example.com' })
    await t.setup()

    // Set up main domain route
    t.router.get('/health', (ctx) => {
      return ctx.json({
        status: 'ok',
        subdomain: ctx.subdomain || 'none'
      })
    })

    // Test main domain (no subdomain)
    const res = await t.get('/health')
    expect(res.status).toBe(200)

    const data = await res.json() as any
    expect(data.status).toBe('ok')
    expect(data.subdomain).toBe('none')

    await t.teardown()
  })

  test('should clear subdomain state between requests', async () => {
    const t = new TestCase({ domain: 'example.com' })
    await t.setup()

    // Set up routes on both subdomain and main domain
    t.router.subdomain('api', (r) => {
      r.get('/data', (ctx) => ctx.json({ location: 'subdomain' }))
    })

    t.router.get('/data', (ctx) => ctx.json({ location: 'main' }))

    // Test subdomain first
    const subdomainRes = await t.onSubdomain('api').get('/data')
    expect(subdomainRes.status).toBe(200)

    let data = await subdomainRes.json() as any
    expect(data.location).toBe('subdomain')

    // Clear subdomain and test main domain
    const mainRes = await t.withoutSubdomain().get('/data')
    expect(mainRes.status).toBe(200)

    data = await mainRes.json() as any
    expect(data.location).toBe('main')

    await t.teardown()
  })

  test('should support chaining with headers', async () => {
    const t = new TestCase({ domain: 'example.com' })
    await t.setup()

    // Set up subdomain route that checks headers
    t.router.subdomain('api', (r) => {
      r.get('/profile', (ctx) => {
        const auth = ctx.header('Authorization')
        return ctx.json({
          authenticated: !!auth,
          subdomain: ctx.subdomain
        })
      })
    })

    // Test header + subdomain chaining
    t.withHeaders({ 'Authorization': 'Bearer test-token' })
    const res = await t.onSubdomain('api').get('/profile')
    expect(res.status).toBe(200)

    const data = await res.json() as any
    expect(data.authenticated).toBe(true)
    expect(data.subdomain).toBe('api')

    await t.teardown()
  })

  test('should default to localhost domain when not specified', async () => {
    const t = new TestCase() // No domain specified
    await t.setup()

    // Set up route to check domain handling
    t.router.get('/domain-test', (ctx) => {
      return ctx.json({ subdomain: ctx.subdomain || 'none' })
    })

    const res = await t.get('/domain-test')
    expect(res.status).toBe(200)

    const data = await res.json() as any
    expect(data.subdomain).toBe('none')

    await t.teardown()
  })
})