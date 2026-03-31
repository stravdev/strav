import { test, expect, describe } from 'bun:test'
import { Workflow } from '../src/workflow.ts'
import { workflow } from '../src/helpers.ts'

describe('Workflow', () => {
  // ── Sequential Steps ────────────────────────────────────────────────────

  test('runs a single step', async () => {
    const result = await new Workflow('test')
      .step('greet', async ctx => {
        return `Hello, ${ctx.input.name}!`
      })
      .run({ name: 'World' })

    expect(result.results.greet).toBe('Hello, World!')
    expect(result.duration).toBeGreaterThan(0)
  })

  test('chains sequential steps with context passing', async () => {
    const result = await new Workflow('test')
      .step('double', async ctx => {
        return (ctx.input.value as number) * 2
      })
      .step('add-ten', async ctx => {
        return (ctx.results.double as number) + 10
      })
      .step('format', async ctx => {
        return `Result: ${ctx.results['add-ten']}`
      })
      .run({ value: 5 })

    expect(result.results.double).toBe(10)
    expect(result.results['add-ten']).toBe(20)
    expect(result.results.format).toBe('Result: 20')
  })

  test('step can return objects', async () => {
    const result = await new Workflow('test')
      .step('fetch', async () => {
        return { id: 1, name: 'Test', items: [1, 2, 3] }
      })
      .step('process', async ctx => {
        const data = ctx.results.fetch as { id: number; name: string; items: number[] }
        return { total: data.items.length, label: data.name }
      })
      .run({})

    expect(result.results.process).toEqual({ total: 3, label: 'Test' })
  })

  // ── Parallel Steps ────────────────────────────────────────────────────

  test('runs parallel steps concurrently', async () => {
    const order: string[] = []

    const result = await new Workflow('test')
      .parallel('tasks', [
        {
          name: 'fast',
          handler: async () => {
            order.push('fast-start')
            await Bun.sleep(10)
            order.push('fast-end')
            return 'fast-done'
          },
        },
        {
          name: 'slow',
          handler: async () => {
            order.push('slow-start')
            await Bun.sleep(30)
            order.push('slow-end')
            return 'slow-done'
          },
        },
      ])
      .run({})

    expect(result.results.fast).toBe('fast-done')
    expect(result.results.slow).toBe('slow-done')
    // Both start before either finishes (concurrent)
    expect(order[0]).toBe('fast-start')
    expect(order[1]).toBe('slow-start')
  })

  test('parallel steps can read previous results', async () => {
    const result = await new Workflow('test')
      .step('init', async () => 42)
      .parallel('compute', [
        {
          name: 'doubled',
          handler: async ctx => (ctx.results.init as number) * 2,
        },
        {
          name: 'tripled',
          handler: async ctx => (ctx.results.init as number) * 3,
        },
      ])
      .run({})

    expect(result.results.doubled).toBe(84)
    expect(result.results.tripled).toBe(126)
  })

  // ── Route Steps ───────────────────────────────────────────────────────

  test('routes to the correct branch', async () => {
    const result = await new Workflow('test')
      .step('classify', async () => ({ category: 'billing' }))
      .route('handle', ctx => (ctx.results.classify as { category: string }).category, {
        billing: async () => 'handled by billing',
        shipping: async () => 'handled by shipping',
      })
      .run({})

    expect(result.results.handle).toBe('handled by billing')
  })

  test('route step completes silently when no branch matches', async () => {
    const result = await new Workflow('test')
      .route('handle', () => 'unknown', {
        billing: async () => 'billing',
      })
      .run({})

    expect(result.results.handle).toBeUndefined()
  })

  test('route resolver can be async', async () => {
    const result = await new Workflow('test')
      .route(
        'handle',
        async () => {
          await Bun.sleep(5)
          return 'a'
        },
        {
          a: async () => 'branch-a',
          b: async () => 'branch-b',
        }
      )
      .run({})

    expect(result.results.handle).toBe('branch-a')
  })

  // ── Workflow helper ───────────────────────────────────────────────────

  test('workflow() helper creates a Workflow instance', async () => {
    const result = await workflow('test')
      .step('ping', async () => 'pong')
      .run({})

    expect(result.results.ping).toBe('pong')
  })

  // ── Error Propagation ─────────────────────────────────────────────────

  test('throws step error when no compensation defined', async () => {
    const wf = new Workflow('test')
      .step('ok', async () => 'fine')
      .step('fail', async () => {
        throw new Error('step failed')
      })

    await expect(wf.run({})).rejects.toThrow('step failed')
  })

  test('subsequent steps are not executed after failure', async () => {
    const executed: string[] = []

    const wf = new Workflow('test')
      .step('a', async () => {
        executed.push('a')
        return 'ok'
      })
      .step('b', async () => {
        executed.push('b')
        throw new Error('boom')
      })
      .step('c', async () => {
        executed.push('c')
        return 'ok'
      })

    await expect(wf.run({})).rejects.toThrow('boom')
    expect(executed).toEqual(['a', 'b'])
  })
})
