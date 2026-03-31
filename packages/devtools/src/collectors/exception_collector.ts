import { Emitter } from '@stravigor/kernel'
import type { Listener } from '@stravigor/kernel'
import Collector from './collector.ts'
import type EntryStore from '../storage/entry_store.ts'
import type { CollectorOptions } from '../types.ts'

/**
 * Captures exceptions emitted by the ExceptionHandler.
 *
 * Listens to the `http:error` event added to the core ExceptionHandler.
 * Records exception class, message, stack trace, and request context.
 */
export default class ExceptionCollector extends Collector {
  private listener: Listener | null = null
  private getBatchId: () => string

  constructor(store: EntryStore, options: CollectorOptions, getBatchId: () => string) {
    super(store, options)
    this.getBatchId = getBatchId
  }

  register(): void {
    if (!this.enabled) return

    this.listener = (payload: { error: Error; ctx?: { path?: string; method?: string } }) => {
      const { error, ctx } = payload
      const batchId = this.getBatchId()

      const content: Record<string, unknown> = {
        class: error.constructor.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 20),
      }

      if (ctx) {
        content.method = ctx.method
        content.path = ctx.path
      }

      const tags = [error.constructor.name]
      const familyHash = this.hash(`${error.constructor.name}:${error.message}`)

      this.record('exception', batchId, content, tags, familyHash)
      this.flush()
    }

    Emitter.on('http:error', this.listener)
  }

  teardown(): void {
    if (this.listener) {
      Emitter.off('http:error', this.listener)
      this.listener = null
    }
  }
}
