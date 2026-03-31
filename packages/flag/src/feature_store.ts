import type { ScopeKey, StoredFeature } from './types.ts'

/** Contract that every feature flag storage driver must implement. */
export interface FeatureStore {
  readonly name: string

  /** Retrieve the stored value. Returns `undefined` if not yet resolved. */
  get(feature: string, scope: ScopeKey): Promise<unknown | undefined>

  /** Retrieve stored values for multiple features for a single scope. */
  getMany(features: string[], scope: ScopeKey): Promise<Map<string, unknown>>

  /** Store a resolved value (upsert). */
  set(feature: string, scope: ScopeKey, value: unknown): Promise<void>

  /** Store multiple resolved values at once. */
  setMany(entries: Array<{ feature: string; scope: ScopeKey; value: unknown }>): Promise<void>

  /** Remove the stored value for a feature+scope pair. */
  forget(feature: string, scope: ScopeKey): Promise<void>

  /** Remove ALL stored values for a feature (all scopes). */
  purge(feature: string): Promise<void>

  /** Remove all stored values for all features. */
  purgeAll(): Promise<void>

  /** List all distinct feature names that have stored values. */
  featureNames(): Promise<string[]>

  /** List all stored records for a feature. */
  allFor(feature: string): Promise<StoredFeature[]>
}
