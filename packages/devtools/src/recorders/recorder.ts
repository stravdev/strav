import type AggregateStore from '../storage/aggregate_store.ts'
import type { AggregateFunction, RecorderOptions } from '../types.ts'

/**
 * Base class for all recorders (the Pulse-like component).
 *
 * A recorder listens to the same framework events as collectors but
 * produces aggregated metrics instead of individual entries.
 */
export default abstract class Recorder {
  protected enabled: boolean
  protected threshold: number
  protected sampleRate: number

  constructor(
    protected store: AggregateStore,
    protected options: RecorderOptions
  ) {
    this.enabled = options.enabled !== false
    this.threshold = options.threshold ?? 1000
    this.sampleRate = options.sampleRate ?? 1.0
  }

  /** Register event listeners. Called once during DevtoolsManager boot. */
  abstract register(): void

  /** Remove event listeners. Called during teardown. */
  abstract teardown(): void

  /** Check if this event should be sampled (for high-traffic apps). */
  protected shouldSample(): boolean {
    if (this.sampleRate >= 1.0) return true
    return Math.random() < this.sampleRate
  }

  /** Record a metric value into the aggregate store. */
  protected async aggregate(
    type: string,
    key: string,
    value: number,
    aggregates: AggregateFunction[] = ['count', 'max', 'avg']
  ): Promise<void> {
    if (!this.enabled || !this.shouldSample()) return

    try {
      await this.store.record(type, key, value, aggregates)
    } catch {
      // Recorders must never crash the app
    }
  }
}
