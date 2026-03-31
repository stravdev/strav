import DevtoolsManager from './devtools_manager.ts'
import type { Middleware } from '@strav/http'
import type { EntryRecord, AggregateRecord, EntryType, AggregateFunction } from './types.ts'

/**
 * Devtools helper — the primary convenience API.
 *
 * @example
 * import { devtools } from '@strav/devtools'
 *
 * // Add the middleware to capture requests
 * router.use(devtools.middleware())
 *
 * // Query entries
 * const requests = await devtools.entries('request', 50)
 * const entry = await devtools.find(uuid)
 * const related = await devtools.batch(batchId)
 */
export const devtools = {
  /** Returns the request-tracking middleware. */
  middleware(): Middleware {
    return DevtoolsManager.middleware()
  },

  /** Create storage tables (idempotent). */
  async ensureTables(): Promise<void> {
    return DevtoolsManager.ensureTables()
  },

  /** List entries, optionally filtered by type. */
  async entries(type?: EntryType, limit = 50, offset = 0): Promise<EntryRecord[]> {
    return DevtoolsManager.entryStore.list(type, limit, offset)
  },

  /** Find a single entry by UUID. */
  async find(uuid: string): Promise<EntryRecord | null> {
    return DevtoolsManager.entryStore.find(uuid)
  },

  /** Find all entries belonging to a batch. */
  async batch(batchId: string): Promise<EntryRecord[]> {
    return DevtoolsManager.entryStore.batch(batchId)
  },

  /** Search entries by tag. */
  async byTag(tag: string, limit = 50): Promise<EntryRecord[]> {
    return DevtoolsManager.entryStore.byTag(tag, limit)
  },

  /** Query aggregated metrics. */
  async aggregates(
    type: string,
    period: number,
    aggregate: AggregateFunction,
    limit = 24
  ): Promise<AggregateRecord[]> {
    return DevtoolsManager.aggregateStore.query(type, period, aggregate, limit)
  },

  /** Top keys by aggregated value. */
  async topKeys(
    type: string,
    period: number,
    aggregate: AggregateFunction,
    limit = 10
  ): Promise<AggregateRecord[]> {
    return DevtoolsManager.aggregateStore.topKeys(type, period, aggregate, limit)
  },

  /** Prune old entries and aggregates. */
  async prune(hours?: number): Promise<{ entries: number; aggregates: number }> {
    const h = hours ?? DevtoolsManager.config.storage.pruneAfter
    const entries = await DevtoolsManager.entryStore.prune(h)
    const aggregates = await DevtoolsManager.aggregateStore.prune(h)
    return { entries, aggregates }
  },

  /** Count entries, optionally by type. */
  async count(type?: EntryType): Promise<number> {
    return DevtoolsManager.entryStore.count(type)
  },
}
