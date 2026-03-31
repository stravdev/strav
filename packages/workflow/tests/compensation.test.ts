import { test, expect, describe } from 'bun:test'
import { Workflow } from '../src/workflow.ts'
import { CompensationError } from '../src/errors.ts'

describe('Workflow Compensation', () => {
  test('runs compensation in reverse order on failure', async () => {
    const compensated: string[] = []

    const wf = new Workflow('saga')
      .step('a', async () => 'result-a', {
        compensate: async () => {
          compensated.push('undo-a')
        },
      })
      .step('b', async () => 'result-b', {
        compensate: async () => {
          compensated.push('undo-b')
        },
      })
      .step('c', async () => {
        throw new Error('step C failed')
      })

    await expect(wf.run({})).rejects.toThrow('step C failed')
    expect(compensated).toEqual(['undo-b', 'undo-a'])
  })

  test('compensation receives context with results from completed steps', async () => {
    let capturedCtx: any

    const wf = new Workflow('saga')
      .step('charge', async () => ({ chargeId: 'ch_123' }), {
        compensate: async ctx => {
          capturedCtx = ctx
        },
      })
      .step('fail', async () => {
        throw new Error('boom')
      })

    await expect(wf.run({ orderId: 1 })).rejects.toThrow('boom')
    expect(capturedCtx.results.charge).toEqual({ chargeId: 'ch_123' })
    expect(capturedCtx.input.orderId).toBe(1)
  })

  test('does not compensate the failed step itself', async () => {
    const compensated: string[] = []

    const wf = new Workflow('saga')
      .step('a', async () => 'ok', {
        compensate: async () => {
          compensated.push('undo-a')
        },
      })
      .step(
        'fail',
        async () => {
          throw new Error('boom')
        },
        {
          compensate: async () => {
            compensated.push('undo-fail')
          },
        }
      )

    await expect(wf.run({})).rejects.toThrow('boom')
    // The failed step is NOT in the completed list, so its compensator doesn't run
    expect(compensated).toEqual(['undo-a'])
  })

  test('collects compensation errors and wraps in CompensationError', async () => {
    const wf = new Workflow('saga')
      .step('a', async () => 'ok', {
        compensate: async () => {
          throw new Error('undo-a failed')
        },
      })
      .step('b', async () => 'ok', {
        compensate: async () => {
          throw new Error('undo-b failed')
        },
      })
      .step('c', async () => {
        throw new Error('step C failed')
      })

    try {
      await wf.run({})
      expect.unreachable('should have thrown')
    } catch (err) {
      // When compensation itself fails, CompensationError is thrown instead of original
      expect(err).toBeInstanceOf(CompensationError)
      const ce = err as CompensationError
      expect(ce.originalError.message).toBe('step C failed')
      expect(ce.compensationErrors).toHaveLength(2)
      expect(ce.compensationErrors[0]!.step).toBe('b')
      expect(ce.compensationErrors[1]!.step).toBe('a')
    }
  })

  test('all compensations run even if some fail', async () => {
    const compensated: string[] = []

    const wf = new Workflow('saga')
      .step('a', async () => 'ok', {
        compensate: async () => {
          compensated.push('undo-a')
        },
      })
      .step('b', async () => 'ok', {
        compensate: async () => {
          compensated.push('undo-b-attempt')
          throw new Error('undo-b failed')
        },
      })
      .step('c', async () => 'ok', {
        compensate: async () => {
          compensated.push('undo-c')
        },
      })
      .step('d', async () => {
        throw new Error('step D failed')
      })

    try {
      await wf.run({})
    } catch {
      // All compensations attempted, even after undo-b failed
      expect(compensated).toEqual(['undo-c', 'undo-b-attempt', 'undo-a'])
    }
  })

  test('parallel step compensation runs for all entries with compensators', async () => {
    const compensated: string[] = []

    const wf = new Workflow('saga')
      .parallel('tasks', [
        {
          name: 'email',
          handler: async () => 'sent',
          compensate: async () => {
            compensated.push('undo-email')
          },
        },
        {
          name: 'sms',
          handler: async () => 'sent',
          // no compensate
        },
        {
          name: 'push',
          handler: async () => 'sent',
          compensate: async () => {
            compensated.push('undo-push')
          },
        },
      ])
      .step('fail', async () => {
        throw new Error('boom')
      })

    await expect(wf.run({})).rejects.toThrow('boom')
    // Both email and push compensated (sms has no compensator)
    expect(compensated).toContain('undo-email')
    expect(compensated).toContain('undo-push')
    expect(compensated).not.toContain('undo-sms')
  })

  test('no compensation error when steps have no compensators', async () => {
    const wf = new Workflow('saga')
      .step('a', async () => 'ok')
      .step('b', async () => {
        throw new Error('boom')
      })

    // Should throw original error, not CompensationError
    await expect(wf.run({})).rejects.toThrow('boom')
  })
})
