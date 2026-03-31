import { Emitter } from '@strav/kernel'
import type { Listener } from '@strav/kernel'
import Recorder from './recorder.ts'
import type AggregateStore from '../storage/aggregate_store.ts'
import type { RecorderOptions } from '../types.ts'

/**
 * Records aggregated metrics for slow database queries.
 *
 * Listens to the `devtools:query` event emitted by the QueryCollector
 * after each query. Only records queries that exceed the configured threshold.
 */
export default class SlowQueriesRecorder extends Recorder {
  private listener: Listener | null = null

  constructor(store: AggregateStore, options: RecorderOptions) {
    super(store, options)
  }

  register(): void {
    if (!this.enabled) return

    this.listener = (payload: { sql: string; duration: number }) => {
      if (payload.duration < this.threshold) return

      // Normalize SQL for grouping (strip specific values)
      const normalized = payload.sql
        .replace(/\$\d+/g, '$?')
        .replace(/'[^']*'/g, "'?'")
        .slice(0, 200)

      this.aggregate('slow_query', normalized, payload.duration)
    }

    Emitter.on('devtools:query', this.listener)
  }

  teardown(): void {
    if (this.listener) {
      Emitter.off('devtools:query', this.listener)
      this.listener = null
    }
  }
}
