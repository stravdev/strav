import type { SQL } from 'bun'
import Collector from './collector.ts'
import DevtoolsManager from '../devtools_manager.ts'
import type EntryStore from '../storage/entry_store.ts'
import type { CollectorOptions } from '../types.ts'

interface QueryCollectorOptions extends CollectorOptions {
  slow?: number
}

/**
 * Captures SQL queries by proxying the Bun.sql tagged template call.
 *
 * When enabled, wraps the SQL connection with a Proxy that intercepts
 * tagged template literal calls to record query text, duration, and bindings.
 */
export default class QueryCollector extends Collector {
  private slowThreshold: number
  private originalSql: SQL | null = null
  private getBatchId: () => string

  constructor(store: EntryStore, options: QueryCollectorOptions, getBatchId: () => string) {
    super(store, options)
    this.slowThreshold = options.slow ?? 100
    this.getBatchId = getBatchId
  }

  register(): void {
    // Proxying is handled by installProxy()
  }

  teardown(): void {
    // Proxy removal is handled by DevtoolsManager
  }

  /**
   * Wrap a SQL connection with a Proxy that intercepts queries.
   * Returns the proxied SQL instance.
   */
  installProxy(sql: SQL): SQL {
    if (!this.enabled) return sql
    this.originalSql = sql

    const collector = this

    return new Proxy(sql, {
      apply(target, thisArg, args) {
        // Tagged template calls pass an array of strings as the first argument
        if (!Array.isArray(args[0])) {
          return Reflect.apply(target, thisArg, args)
        }

        const strings = args[0] as string[]
        const bindings = Array.prototype.slice.call(args, 1)

        // Build a normalized SQL string for hashing (replace values with $N)
        const sqlText = strings.reduce((acc: string, str: string, i: number) => {
          return i === 0 ? str : `${acc}$${i}${str}`
        }, '')

        const start = performance.now()
        const result = Reflect.apply(target, thisArg, args)

        // Handle async results (most queries return promises)
        if (result && typeof result.then === 'function') {
          return result.then((res: unknown) => {
            collector.recordQuery(sqlText, bindings, performance.now() - start)
            return res
          })
        }

        collector.recordQuery(sqlText, bindings, performance.now() - start)
        return result
      },
    }) as SQL
  }

  /** Get the original (unwrapped) SQL connection. */
  getOriginalSql(): SQL | null {
    return this.originalSql
  }

  private recordQuery(sql: string, bindings: unknown[], duration: number): void {
    const batchId = this.getBatchId()
    const durationRounded = Math.round(duration * 100) / 100

    const tags: string[] = []
    if (duration >= this.slowThreshold) tags.push('slow')

    // Exclude devtools' own queries
    if (sql.includes('_strav_devtools_')) return

    const content: Record<string, unknown> = {
      sql,
      duration: durationRounded,
      bindings: bindings.length > 0 ? bindings : undefined,
      slow: duration >= this.slowThreshold,
    }

    const familyHash = this.hash(sql)
    this.record('query', batchId, content, tags, familyHash)

    // Emit for recorders (slow queries aggregation)
    DevtoolsManager.emitQuery({ sql, duration: durationRounded })
  }
}
