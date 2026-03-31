// ── Scope ────────────────────────────────────────────────────────────────

/** Any object that can be used as a feature flag scope. */
export interface Scopeable {
  id: string | number
  /** Optional type discriminator. Defaults to constructor.name. */
  featureScope?: () => string
}

/** Serialized scope string, e.g. 'User:42', '__global__'. */
export type ScopeKey = string

/** The global scope sentinel. */
export const GLOBAL_SCOPE = '__global__'

// ── Feature definitions ──────────────────────────────────────────────────

/** A closure that resolves a feature value for the given scope. */
export type FeatureResolver<T = unknown> = (scope: ScopeKey) => T | Promise<T>

/** A class-based feature with a `resolve` method. */
export interface FeatureClass {
  readonly key?: string
  resolve(scope: ScopeKey): unknown | Promise<unknown>
}

export interface FeatureClassConstructor {
  key?: string
  new (): FeatureClass
}

// ── Stored values ────────────────────────────────────────────────────────

export interface StoredFeature {
  feature: string
  scope: ScopeKey
  value: unknown
  createdAt: Date
  updatedAt: Date
}

// ── Configuration ────────────────────────────────────────────────────────

export interface FlagConfig {
  default: string
  drivers: Record<string, DriverConfig>
}

export interface DriverConfig {
  driver: string
  [key: string]: unknown
}
