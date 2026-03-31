import { test, expect, describe } from 'bun:test'
import { Workflow } from '../src/workflow.ts'

describe('Workflow Loop', () => {
  test('runs until condition is met', async () => {
    let iterations = 0

    const result = await new Workflow('test')
      .loop(
        'improve',
        async input => {
          iterations++
          const score = (input as number) + 1
          return { score }
        },
        {
          maxIterations: 10,
          until: (result, iteration) => (result as { score: number }).score >= 5,
          feedback: result => (result as { score: number }).score,
          mapInput: ctx => ctx.input.startScore,
        }
      )
      .run({ startScore: 0 })

    expect((result.results.improve as { score: number }).score).toBe(5)
    expect(iterations).toBe(5)
  })

  test('stops at maxIterations even if until is not met', async () => {
    let iterations = 0

    const result = await new Workflow('test')
      .loop(
        'forever',
        async input => {
          iterations++
          return { value: (input as number) + 1 }
        },
        {
          maxIterations: 3,
          until: () => false, // never satisfied
          feedback: result => (result as { value: number }).value,
          mapInput: () => 0,
        }
      )
      .run({})

    expect(iterations).toBe(3)
    expect((result.results.forever as { value: number }).value).toBe(3)
  })

  test('uses ctx.input as default when no mapInput provided', async () => {
    const result = await new Workflow('test')
      .loop(
        'echo',
        async input => {
          return { received: input }
        },
        {
          maxIterations: 1,
        }
      )
      .run({ data: 'hello' })

    const received = (result.results.echo as { received: unknown }).received
    expect(received).toEqual({ data: 'hello' })
  })

  test('feedback transforms result into next iteration input', async () => {
    const inputs: unknown[] = []

    await new Workflow('test')
      .loop(
        'chain',
        async input => {
          inputs.push(input)
          return { next: (input as number) * 2 }
        },
        {
          maxIterations: 4,
          feedback: result => (result as { next: number }).next,
          mapInput: () => 1,
        }
      )
      .run({})

    expect(inputs).toEqual([1, 2, 4, 8])
  })

  test('loop result is available to subsequent steps', async () => {
    const result = await new Workflow('test')
      .loop('compute', async input => ({ value: (input as number) + 10 }), {
        maxIterations: 1,
        mapInput: () => 5,
      })
      .step('format', async ctx => {
        return `Got: ${(ctx.results.compute as { value: number }).value}`
      })
      .run({})

    expect(result.results.format).toBe('Got: 15')
  })

  test('loop handler can access context results', async () => {
    const result = await new Workflow('test')
      .step('init', async () => ({ base: 100 }))
      .loop(
        'add',
        async (input, ctx) => {
          const base = (ctx.results.init as { base: number }).base
          return { total: base + (input as number) }
        },
        {
          maxIterations: 1,
          mapInput: () => 5,
        }
      )
      .run({})

    expect((result.results.add as { total: number }).total).toBe(105)
  })
})
