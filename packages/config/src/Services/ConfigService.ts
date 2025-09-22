import type { ConfigService as ConfigServiceContract } from '../Contracts/ConfigService'
import type { ConfigChange } from '../Types/ConfigChange'
import type { ConfigData } from '../Types/ConfigData'
import type { ConfigSource } from '../Contracts/ConfigSource'
import type { ConfigServiceOptions } from '../Types/ConfigServiceOptions'
import { ConfigNotLoadedException } from '../Exceptions/ConfigNotLoadedException'
import { ConfigReadOnlyException } from '../Exceptions/ConfigReadOnlyException'

/**
 * Default implementation of the ConfigService contract.
 *
 * This service provides the main business logic for configuration management,
 * including loading from sources, watching for changes, and providing a
 * unified interface for configuration access.
 */
export class ConfigService implements ConfigServiceContract {
  private configData: ConfigData = {}
  private sources: ConfigSource[] = []
  private loaded = false
  private frozen = false
  private strict = false
  private reloadOnChange = false
  private watchers: Array<{
    path?: string
    callback: (changes: ConfigChange[]) => void
  }> = []
  private sourceWatchers: Array<() => void> = []

  constructor(options: ConfigServiceOptions = {}) {
    this.strict = options.strict ?? false
    this.reloadOnChange = options.reloadOnChange ?? false
    this.frozen = options.frozen ?? false
  }

  /**
   * Loads configuration data from one or more sources.
   * 
   * This method initializes the configuration service by loading data from the provided
   * sources. If multiple sources are provided, their data will be merged with later
   * sources taking precedence over earlier ones. After loading, the service will be
   * marked as loaded and optional features like source watching and freezing will be
   * activated based on the service options.
   * 
   * @param sources - A single ConfigSource or array of ConfigSources to load from
   * @throws Will throw an error if any source fails to resolve
   */
  async load(sources: ConfigSource | ConfigSource[]): Promise<void> {
    this.sources = Array.isArray(sources) ? sources : [sources]

    // Load data from all sources
    const allData: ConfigData = {}

    for (const source of this.sources) {
      const sourceData = await source.resolve()
      this.mergeData(allData, sourceData)
    }

    this.configData = allData
    this.loaded = true

    // Set up watchers if reloadOnChange is enabled
    if (this.reloadOnChange) {
      this.setupSourceWatchers()
    }

    // Freeze if requested
    if (this.frozen) {
      this.deepFreeze(this.configData)
    }
  }

  /**
   * Reloads configuration data from all previously loaded sources.
   * 
   * This method re-fetches data from all sources that were used in the initial load
   * operation. It compares the new data with the existing configuration and notifies
   * any registered watchers of changes that occurred during the reload.
   * 
   * @throws ConfigNotLoadedException if the service hasn't been loaded yet
   */
  async reload(): Promise<void> {
    if (!this.loaded) {
      throw new ConfigNotLoadedException('Cannot reload configuration before initial load')
    }

    const oldData = { ...this.configData }
    await this.load(this.sources)

    // Notify watchers of changes
    const changes = this.detectChanges(oldData, this.configData)
    if (changes.length > 0) {
      this.notifyWatchers(changes)
    }
  }

  /**
   * Checks whether the configuration service has been loaded.
   * 
   * @returns True if the service has been successfully loaded, false otherwise
   */
  isLoaded(): boolean {
    return this.loaded
  }

  /**
   * Retrieves a configuration value by its path.
   * 
   * This method supports dot-notation paths to access nested configuration values.
   * If the service is in strict mode and not loaded, or if a required key is missing,
   * it will throw an error. Otherwise, it returns the default value when the key
   * is not found.
   * 
   * @param path - The dot-notation path to the configuration value
   * @param defaultValue - The value to return if the path is not found
   * @returns The configuration value at the specified path, or the default value
   * @throws ConfigNotLoadedException in strict mode when service is not loaded
   * @throws Error in strict mode when a required key is not found
   */
  get<T = any>(path: string, defaultValue?: T): T {
    if (!this.loaded) {
      if (this.strict) {
        throw new ConfigNotLoadedException(`Configuration not loaded when accessing path: ${path}`)
      }
      return defaultValue as T
    }

    const value = this.getNestedValue(this.configData, path)

    if (value === undefined) {
      if (this.strict && defaultValue === undefined) {
        throw new Error(`Configuration key '${path}' not found`)
      }
      return defaultValue as T
    }

    return value as T
  }

  /**
   * Retrieves all configuration data.
   * 
   * Returns a copy of the entire configuration object. If the service is frozen,
   * it returns the original frozen object for performance. In strict mode, throws
   * an error if the service hasn't been loaded yet.
   * 
   * @returns A copy of all configuration data, or empty object if not loaded in non-strict mode
   * @throws ConfigNotLoadedException in strict mode when service is not loaded
   */
  getAll(): ConfigData {
    if (!this.loaded) {
      if (this.strict) {
        throw new ConfigNotLoadedException('Configuration not loaded')
      }
      return {}
    }

    if (this.frozen) {
      return this.configData
    }

    return { ...this.configData }
  }

  /**
   * Checks if a configuration key exists at the specified path.
   * 
   * This method uses dot-notation to check for the existence of nested configuration
   * values. Returns false if the service is not loaded in non-strict mode.
   * 
   * @param path - The dot-notation path to check
   * @returns True if the path exists in the configuration, false otherwise
   */
  has(path: string): boolean {
    if (!this.loaded) {
      return false
    }

    return this.getNestedValue(this.configData, path) !== undefined
  }

  /**
   * Sets a configuration value at the specified path.
   * 
   * This method supports dot-notation paths to set nested configuration values.
   * It will create intermediate objects as needed. After setting the value,
   * it notifies any registered watchers of the change.
   * 
   * @param path - The dot-notation path where to set the value
   * @param value - The value to set
   * @throws ConfigReadOnlyException if the service is frozen
   * @throws ConfigNotLoadedException if the service is not loaded
   */
  set(path: string, value: any): void {
    if (this.frozen) {
      throw new ConfigReadOnlyException(`Cannot set '${path}': configuration is frozen`)
    }

    if (!this.loaded) {
      throw new ConfigNotLoadedException('Configuration not loaded')
    }

    const oldValue = this.getNestedValue(this.configData, path)
    this.setNestedValue(this.configData, path, value)

    // Notify watchers
    const change: ConfigChange = {
      path,
      oldValue,
      newValue: value,
      timestamp: new Date(),
    }

    this.notifyWatchers([change])
  }

  /**
   * Merges new configuration data with the existing configuration.
   * 
   * This method performs a deep merge of the provided data into the current
   * configuration. It detects changes and notifies watchers of any modifications
   * that occurred during the merge operation.
   * 
   * @param data - The configuration data to merge
   * @throws ConfigReadOnlyException if the service is frozen
   * @throws ConfigNotLoadedException if the service is not loaded
   */
  merge(data: ConfigData): void {
    if (this.frozen) {
      throw new ConfigReadOnlyException('Cannot merge: configuration is frozen')
    }

    if (!this.loaded) {
      throw new ConfigNotLoadedException('Configuration not loaded')
    }

    const oldData = { ...this.configData }
    this.mergeData(this.configData, data)

    // Detect and notify changes
    const changes = this.detectChanges(oldData, this.configData)
    if (changes.length > 0) {
      this.notifyWatchers(changes)
    }
  }

  /**
   * Registers a watcher for all configuration changes.
   * 
   * @param callback - Function called with an array of all changes
   * @returns Function to unregister this watcher
   */
  watch(callback: (changes: ConfigChange[]) => void): () => void
  /**
   * Registers a watcher for changes to a specific configuration path.
   * 
   * @param path - The dot-notation path to watch for changes
   * @param callback - Function called for each relevant change
   * @returns Function to unregister this watcher
   */
  watch(path: string, callback: (change: ConfigChange) => void): () => void
  /**
   * Registers a configuration change watcher.
   * 
   * This method supports two modes:
   * 1. Global watcher: Receives all configuration changes as an array
   * 2. Path-specific watcher: Receives individual changes for a specific path and its children
   * 
   * The returned function can be called to unregister the watcher.
   */
  watch(
    pathOrCallback: string | ((changes: ConfigChange[]) => void),
    callback?: (change: ConfigChange) => void
  ): () => void {
    if (typeof pathOrCallback === 'string') {
      // Path-specific watcher
      const watcher = {
        path: pathOrCallback,
        callback: (changes: ConfigChange[]) => {
          const relevantChanges = changes.filter(
            (change) =>
              change.path === pathOrCallback || change.path.startsWith(`${pathOrCallback}.`)
          )
          // For path-specific watchers, call callback for each relevant change
          if (relevantChanges.length > 0 && callback) {
            relevantChanges.forEach((change) => callback(change))
          }
        },
      }
      this.watchers.push(watcher)

      return () => {
        const index = this.watchers.indexOf(watcher)
        if (index > -1) {
          this.watchers.splice(index, 1)
        }
      }
    } else {
      // Global watcher
      const watcher = {
        callback: pathOrCallback as (changes: ConfigChange[]) => void,
      }
      this.watchers.push(watcher)

      return () => {
        const index = this.watchers.indexOf(watcher)
        if (index > -1) {
          this.watchers.splice(index, 1)
        }
      }
    }
  }

  /**
   * Disposes of the configuration service and cleans up all resources.
   * 
   * This method removes all watchers, cleans up source watchers, and resets
   * the service to its initial state. After calling dispose, the service
   * will need to be reloaded before it can be used again.
   */
  dispose(): void {
    // Clean up source watchers
    this.sourceWatchers.forEach((unwatch) => unwatch())
    this.sourceWatchers = []

    // Clear all watchers
    this.watchers = []

    // Reset state
    this.configData = {}
    this.sources = []
    this.loaded = false
  }

  // Private helper methods
  /**
   * Retrieves a nested value from an object using dot-notation path.
   * 
   * @param obj - The object to traverse
   * @param path - The dot-notation path to the desired value
   * @returns The value at the specified path, or undefined if not found
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && typeof current === 'object' ? current[key] : undefined
    }, obj)
  }

  /**
   * Sets a nested value in an object using dot-notation path.
   * 
   * Creates intermediate objects as needed to establish the full path.
   * 
   * @param obj - The object to modify
   * @param path - The dot-notation path where to set the value
   * @param value - The value to set
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.')
    const lastKey = keys.pop()!

    const target = keys.reduce((current, key) => {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {}
      }
      return current[key]
    }, obj)

    target[lastKey] = value
  }

  /**
   * Performs a deep merge of source data into target data.
   * 
   * Recursively merges objects while preserving the structure. Arrays and
   * primitive values are replaced rather than merged.
   * 
   * @param target - The target object to merge into
   * @param source - The source object to merge from
   */
  private mergeData(target: ConfigData, source: ConfigData): void {
    for (const [key, value] of Object.entries(source)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        if (!target[key] || typeof target[key] !== 'object') {
          target[key] = {}
        }
        this.mergeData(target[key] as ConfigData, value as ConfigData)
      } else {
        target[key] = value
      }
    }
  }

  /**
   * Detects changes between old and new configuration data.
   * 
   * Compares all paths in both data objects and creates ConfigChange objects
   * for any differences found.
   * 
   * @param oldData - The previous configuration data
   * @param newData - The new configuration data
   * @returns Array of detected changes
   */
  private detectChanges(oldData: ConfigData, newData: ConfigData): ConfigChange[] {
    const changes: ConfigChange[] = []
    const allPaths = new Set([...this.getAllPaths(oldData), ...this.getAllPaths(newData)])

    for (const path of allPaths) {
      const oldValue = this.getNestedValue(oldData, path)
      const newValue = this.getNestedValue(newData, path)

      if (oldValue !== newValue) {
        changes.push({
          path,
          oldValue,
          newValue,
          timestamp: new Date(),
        })
      }
    }

    return changes
  }

  /**
   * Recursively extracts all dot-notation paths from an object.
   * 
   * @param obj - The object to extract paths from
   * @param prefix - The current path prefix for nested objects
   * @returns Array of all dot-notation paths in the object
   */
  private getAllPaths(obj: any, prefix = ''): string[] {
    const paths: string[] = []

    for (const [key, value] of Object.entries(obj)) {
      const currentPath = prefix ? `${prefix}.${key}` : key
      paths.push(currentPath)

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        paths.push(...this.getAllPaths(value, currentPath))
      }
    }

    return paths
  }

  /**
   * Notifies all registered watchers of configuration changes.
   * 
   * Safely calls each watcher callback, catching and collecting any errors
   * to prevent one failing watcher from affecting others. If errors occur,
   * throws an aggregated exception after all callbacks are processed.
   * 
   * @param changes - Array of changes to notify watchers about
   * @throws ConfigNotLoadedException if callback errors occur during notification
   */
  private notifyWatchers(changes: ConfigChange[]): void {
    const errors: Error[] = []
    
    for (const watcher of this.watchers) {
      try {
        watcher.callback(changes)
      } catch (error) {
        // Collect callback errors to maintain isolation between watchers
        errors.push(error instanceof Error ? error : new Error(String(error)))
      }
    }
    
    // If there were callback errors, throw an aggregated exception
    if (errors.length > 0) {
      throw new ConfigNotLoadedException(
        `${errors.length} watcher callback error(s) occurred during configuration change notification: ${errors.map(e => e.message).join('; ')}`
      )
    }
  }

  /**
   * Sets up watchers for configuration sources that support watching.
   * 
   * Cleans up any existing source watchers and creates new ones for sources
   * that implement the watch method. When a source change is detected,
   * it automatically triggers a reload of the configuration.
   */
  private setupSourceWatchers(): void {
    // Clean up existing watchers
    this.sourceWatchers.forEach((unwatch) => unwatch())
    this.sourceWatchers = []

    // Set up new watchers for sources that support it
    for (const source of this.sources) {
      if (typeof source.watch === 'function') {
        const unwatch = source.watch(() => {
          this.reload().catch((error) => {
            // Create a structured exception for reload errors
            throw new ConfigNotLoadedException(
              `Failed to reload configuration from source: ${error instanceof Error ? error.message : String(error)}`
            )
          })
        })
        this.sourceWatchers.push(unwatch)
      }
    }
  }

  /**
   * Recursively freezes an object and all its nested properties.
   * 
   * This method makes the configuration data immutable by freezing the object
   * and all nested objects, preventing any modifications.
   * 
   * @param obj - The object to freeze recursively
   */
  private deepFreeze(obj: any): void {
    Object.getOwnPropertyNames(obj).forEach((prop) => {
      const value = obj[prop]
      if (value && typeof value === 'object') {
        this.deepFreeze(value)
      }
    })

    Object.freeze(obj)
  }
}
