import FlagManager from './flag_manager.ts'
import PendingScopedFeature from './pending_scope.ts'
import type { FeatureStore } from './feature_store.ts'
import type { Scopeable, FeatureResolver, FeatureClassConstructor, DriverConfig } from './types.ts'

/**
 * Flag helper — the primary convenience API.
 *
 * @example
 * import { flag } from '@stravigor/flag'
 *
 * flag.define('new-checkout', (scope) => scope.startsWith('User:'))
 *
 * if (await flag.active('new-checkout')) { ... }
 */
export const flag = {
  define(name: string, resolver: FeatureResolver | boolean): void {
    FlagManager.define(name, resolver)
  },

  defineClass(feature: FeatureClassConstructor): void {
    FlagManager.defineClass(feature)
  },

  active(feature: string, scope?: Scopeable | null): Promise<boolean> {
    return FlagManager.active(feature, scope)
  },

  inactive(feature: string, scope?: Scopeable | null): Promise<boolean> {
    return FlagManager.inactive(feature, scope)
  },

  value(feature: string, scope?: Scopeable | null): Promise<unknown> {
    return FlagManager.value(feature, scope)
  },

  when<A, I>(
    feature: string,
    onActive: (value: unknown) => A | Promise<A>,
    onInactive: () => I | Promise<I>,
    scope?: Scopeable | null
  ): Promise<A | I> {
    return FlagManager.when(feature, onActive, onInactive, scope)
  },

  for(scope: Scopeable): PendingScopedFeature {
    return FlagManager.for(scope)
  },

  activate(feature: string, value?: unknown, scope?: Scopeable | null): Promise<void> {
    return FlagManager.activate(feature, value, scope)
  },

  deactivate(feature: string, scope?: Scopeable | null): Promise<void> {
    return FlagManager.deactivate(feature, scope)
  },

  activateForEveryone(feature: string, value?: unknown): Promise<void> {
    return FlagManager.activateForEveryone(feature, value)
  },

  deactivateForEveryone(feature: string): Promise<void> {
    return FlagManager.deactivateForEveryone(feature)
  },

  values(features: string[], scope?: Scopeable | null): Promise<Map<string, unknown>> {
    return FlagManager.values(features, scope)
  },

  forget(feature: string, scope?: Scopeable | null): Promise<void> {
    return FlagManager.forget(feature, scope)
  },

  purge(feature: string): Promise<void> {
    return FlagManager.purge(feature)
  },

  purgeAll(): Promise<void> {
    return FlagManager.purgeAll()
  },

  load(features: string[], scopes: Scopeable[]): Promise<void> {
    return FlagManager.load(features, scopes)
  },

  store(name?: string): FeatureStore {
    return FlagManager.store(name)
  },

  extend(name: string, factory: (config: DriverConfig) => FeatureStore): void {
    FlagManager.extend(name, factory)
  },

  defined(): string[] {
    return FlagManager.defined()
  },

  stored(): Promise<string[]> {
    return FlagManager.stored()
  },

  flushCache(): void {
    FlagManager.flushCache()
  },

  ensureTables(): Promise<void> {
    return FlagManager.ensureTables()
  },
}
