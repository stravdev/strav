import { Emitter } from '@stravigor/kernel'
import type { Listener } from '@stravigor/kernel'
import Collector from './collector.ts'
import type EntryStore from '../storage/entry_store.ts'
import type { CollectorOptions } from '../types.ts'

/**
 * Captures queue job lifecycle events.
 *
 * Listens to:
 * - `queue:dispatched` — when a job is pushed onto the queue
 * - `queue:processed` — when a job completes successfully
 * - `queue:failed` — when a job fails after max attempts
 */
export default class JobCollector extends Collector {
  private dispatchedListener: Listener | null = null
  private processedListener: Listener | null = null
  private failedListener: Listener | null = null
  private getBatchId: () => string

  constructor(store: EntryStore, options: CollectorOptions, getBatchId: () => string) {
    super(store, options)
    this.getBatchId = getBatchId
  }

  register(): void {
    if (!this.enabled) return

    this.dispatchedListener = (payload: {
      id: number
      name: string
      queue: string
      payload: unknown
    }) => {
      const batchId = this.getBatchId()

      this.record(
        'job',
        batchId,
        {
          status: 'dispatched',
          jobId: payload.id,
          name: payload.name,
          queue: payload.queue,
          payload: payload.payload,
        },
        [payload.name, 'dispatched']
      )
      this.flush()
    }

    this.processedListener = (payload: {
      job: string
      id: number
      queue: string
      duration: number
    }) => {
      const batchId = this.getBatchId()

      this.record(
        'job',
        batchId,
        {
          status: 'processed',
          jobId: payload.id,
          name: payload.job,
          queue: payload.queue,
          duration: Math.round(payload.duration * 100) / 100,
        },
        [payload.job, 'processed']
      )
      this.flush()
    }

    this.failedListener = (payload: {
      job: string
      id: number
      queue: string
      error: string
      duration: number
    }) => {
      const batchId = this.getBatchId()

      this.record(
        'job',
        batchId,
        {
          status: 'failed',
          jobId: payload.id,
          name: payload.job,
          queue: payload.queue,
          error: payload.error,
          duration: Math.round(payload.duration * 100) / 100,
        },
        [payload.job, 'failed']
      )
      this.flush()
    }

    Emitter.on('queue:dispatched', this.dispatchedListener)
    Emitter.on('queue:processed', this.processedListener)
    Emitter.on('queue:failed', this.failedListener)
  }

  teardown(): void {
    if (this.dispatchedListener) {
      Emitter.off('queue:dispatched', this.dispatchedListener)
      this.dispatchedListener = null
    }
    if (this.processedListener) {
      Emitter.off('queue:processed', this.processedListener)
      this.processedListener = null
    }
    if (this.failedListener) {
      Emitter.off('queue:failed', this.failedListener)
      this.failedListener = null
    }
  }
}
