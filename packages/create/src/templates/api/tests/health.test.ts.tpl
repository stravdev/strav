import { test, expect } from 'bun:test'
import { TestCase } from '@stravigor/testing'

const t = await TestCase.boot({
  routes: () => import('../start/routes'),
})

test('health check returns ok', async () => {
  const res = await t.get('/health')
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ status: 'ok' })
})
