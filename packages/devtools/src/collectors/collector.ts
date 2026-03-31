import type { DevtoolsEntry, EntryType, CollectorOptions } from '../types.ts'
import type EntryStore from '../storage/entry_store.ts'

/**
 * Base class for all collectors (the Telescope-like component).
 *
 * A collector listens to framework events and produces {@link DevtoolsEntry}
 * objects that are flushed to the {@link EntryStore} in batches.
 */
export default abstract class Collector {
  protected enabled: boolean
  protected queue: DevtoolsEntry[] = []

  constructor(
    protected store: EntryStore,
    protected options: CollectorOptions
  ) {
    this.enabled = options.enabled !== false
  }

  /** Register event listeners. Called once during DevtoolsManager boot. */
  abstract register(): void

  /** Remove event listeners. Called during teardown. */
  abstract teardown(): void

  /** Flush buffered entries to the store. */
  async flush(): Promise<void> {
    if (this.queue.length === 0) return
    const batch = this.queue.splice(0)
    try {
      await this.store.store(batch)
    } catch {
      // Devtools must never crash the app
    }
  }

  /** Create an entry and buffer it for storage. */
  protected record(
    type: EntryType,
    batchId: string,
    content: Record<string, unknown>,
    tags: string[] = [],
    familyHash: string | null = null
  ): void {
    if (!this.enabled) return

    this.queue.push({
      uuid: crypto.randomUUID(),
      batchId,
      type,
      familyHash,
      content,
      tags,
      createdAt: new Date(),
    })
  }

  /** Generate a simple hash for grouping similar entries (e.g. same SQL pattern). */
  protected hash(input: string): string {
    const hasher = new Bun.CryptoHasher('md5')
    hasher.update(input)
    return hasher.digest('hex')
  }
}
