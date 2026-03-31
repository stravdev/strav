import { Context } from '@strav/http'
import type {
  DevtoolsEntry,
  EntryRecord,
  EntryType,
  AggregateRecord,
  AggregateFunction,
} from '../src/types.ts'

// ---------------------------------------------------------------------------
// Mock EntryStore — accumulates entries in memory
// ---------------------------------------------------------------------------

export class MockEntryStore {
  entries: DevtoolsEntry[] = []

  async ensureTable(): Promise<void> {}

  async store(entries: DevtoolsEntry[]): Promise<void> {
    this.entries.push(...entries)
  }

  async list(type?: EntryType, limit = 50, offset = 0): Promise<EntryRecord[]> {
    let filtered = type ? this.entries.filter(e => e.type === type) : this.entries
    filtered = filtered.slice(offset, offset + limit)
    return filtered.map((e, i) => ({ ...e, id: i + 1 }))
  }

  async find(uuid: string): Promise<EntryRecord | null> {
    const entry = this.entries.find(e => e.uuid === uuid)
    return entry ? { ...entry, id: 1 } : null
  }

  async batch(batchId: string): Promise<EntryRecord[]> {
    return this.entries.filter(e => e.batchId === batchId).map((e, i) => ({ ...e, id: i + 1 }))
  }

  async byTag(tag: string, limit = 50): Promise<EntryRecord[]> {
    return this.entries
      .filter(e => e.tags.includes(tag))
      .slice(0, limit)
      .map((e, i) => ({ ...e, id: i + 1 }))
  }

  async prune(hours: number): Promise<number> {
    const cutoff = Date.now() - hours * 3600 * 1000
    const before = this.entries.length
    this.entries = this.entries.filter(e => e.createdAt.getTime() >= cutoff)
    return before - this.entries.length
  }

  async count(type?: EntryType): Promise<number> {
    return type ? this.entries.filter(e => e.type === type).length : this.entries.length
  }

  reset(): void {
    this.entries = []
  }
}

// ---------------------------------------------------------------------------
// Mock AggregateStore — tracks record() calls
// ---------------------------------------------------------------------------

export interface AggregateCall {
  type: string
  key: string
  value: number
  aggregates: AggregateFunction[]
}

export class MockAggregateStore {
  calls: AggregateCall[] = []

  async ensureTable(): Promise<void> {}

  async record(
    type: string,
    key: string,
    value: number,
    aggregates: AggregateFunction[]
  ): Promise<void> {
    this.calls.push({ type, key, value, aggregates })
  }

  async query(): Promise<AggregateRecord[]> {
    return []
  }

  async topKeys(): Promise<AggregateRecord[]> {
    return []
  }

  async prune(): Promise<number> {
    return 0
  }

  reset(): void {
    this.calls = []
  }
}

// ---------------------------------------------------------------------------
// Context helper
// ---------------------------------------------------------------------------

export function ctx(
  url = 'http://localhost/',
  method = 'GET',
  headers?: Record<string, string>
): Context {
  const h = new Headers(headers)
  return new Context(new Request(url, { method, headers: h }))
}

// ---------------------------------------------------------------------------
// Mock Configuration
// ---------------------------------------------------------------------------

export function mockConfig(overrides: Record<string, unknown> = {}) {
  const data: Record<string, unknown> = {
    devtools: {
      enabled: true,
      storage: { pruneAfter: 24 },
      collectors: {
        request: { enabled: true, sizeLimit: 64 },
        query: { enabled: true, slow: 100 },
        exception: { enabled: true },
        log: { enabled: true, level: 'debug' },
        job: { enabled: true },
      },
      recorders: {
        slowRequests: { enabled: true, threshold: 1000, sampleRate: 1.0 },
        slowQueries: { enabled: true, threshold: 1000, sampleRate: 1.0 },
      },
      ...overrides,
    },
  }

  return {
    get(key: string, defaultValue?: unknown): unknown {
      const parts = key.split('.')
      let current: any = data
      for (const part of parts) {
        if (current === undefined || current === null) return defaultValue
        current = current[part]
      }
      return current !== undefined ? current : defaultValue
    },
  } as any
}

// ---------------------------------------------------------------------------
// Wait helper (flush microtasks)
// ---------------------------------------------------------------------------

export function wait(ms = 10): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
