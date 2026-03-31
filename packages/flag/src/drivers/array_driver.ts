import type { FeatureStore } from '../feature_store.ts'
import type { ScopeKey, StoredFeature } from '../types.ts'

/** In-memory feature store for testing. */
export class ArrayDriver implements FeatureStore {
  readonly name = 'array'
  private data = new Map<string, { value: unknown; createdAt: Date; updatedAt: Date }>()

  private key(feature: string, scope: ScopeKey): string {
    return `${feature}\0${scope}`
  }

  async get(feature: string, scope: ScopeKey): Promise<unknown | undefined> {
    return this.data.get(this.key(feature, scope))?.value
  }

  async getMany(features: string[], scope: ScopeKey): Promise<Map<string, unknown>> {
    const result = new Map<string, unknown>()
    for (const feature of features) {
      const entry = this.data.get(this.key(feature, scope))
      if (entry !== undefined) result.set(feature, entry.value)
    }
    return result
  }

  async set(feature: string, scope: ScopeKey, value: unknown): Promise<void> {
    const existing = this.data.get(this.key(feature, scope))
    const now = new Date()
    this.data.set(this.key(feature, scope), {
      value,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    })
  }

  async setMany(
    entries: Array<{ feature: string; scope: ScopeKey; value: unknown }>
  ): Promise<void> {
    for (const e of entries) await this.set(e.feature, e.scope, e.value)
  }

  async forget(feature: string, scope: ScopeKey): Promise<void> {
    this.data.delete(this.key(feature, scope))
  }

  async purge(feature: string): Promise<void> {
    for (const key of this.data.keys()) {
      if (key.startsWith(`${feature}\0`)) this.data.delete(key)
    }
  }

  async purgeAll(): Promise<void> {
    this.data.clear()
  }

  async featureNames(): Promise<string[]> {
    const names = new Set<string>()
    for (const key of this.data.keys()) {
      names.add(key.split('\0')[0]!)
    }
    return [...names]
  }

  async allFor(feature: string): Promise<StoredFeature[]> {
    const results: StoredFeature[] = []
    for (const [key, entry] of this.data) {
      if (key.startsWith(`${feature}\0`)) {
        results.push({
          feature,
          scope: key.split('\0')[1]!,
          value: entry.value,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
        })
      }
    }
    return results
  }
}
