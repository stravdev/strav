import { Emitter } from '@strav/kernel'
import type { Listener } from '@strav/kernel'
import Recorder from './recorder.ts'
import type AggregateStore from '../storage/aggregate_store.ts'
import type { RecorderOptions } from '../types.ts'

/**
 * Records aggregated metrics for slow HTTP requests.
 *
 * Listens to the `devtools:request` event emitted by the RequestCollector
 * after each request. Only records requests that exceed the configured threshold.
 */
export default class SlowRequestsRecorder extends Recorder {
  private listener: Listener | null = null

  constructor(store: AggregateStore, options: RecorderOptions) {
    super(store, options)
  }

  register(): void {
    if (!this.enabled) return

    this.listener = (payload: {
      path: string
      method: string
      duration: number
      status: number
    }) => {
      if (payload.duration < this.threshold) return

      const key = `${payload.method} ${payload.path}`
      this.aggregate('slow_request', key, payload.duration)
    }

    Emitter.on('devtools:request', this.listener)
  }

  teardown(): void {
    if (this.listener) {
      Emitter.off('devtools:request', this.listener)
      this.listener = null
    }
  }
}
