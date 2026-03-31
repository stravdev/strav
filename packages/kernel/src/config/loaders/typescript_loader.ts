import { BaseConfigurationLoader } from './base_loader'
import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

/**
 * Configuration loader for TypeScript and JavaScript files.
 *
 * Dynamically imports `.ts` and `.js` configuration files using Bun's native
 * TypeScript support, and optionally extracts an environment-specific section
 * from the exported config object.
 *
 * Config files should default-export a configuration object. When an
 * `environment` is provided, the loader looks for a matching top-level key
 * and returns that subset instead of the full object.
 *
 * @example
 * // config/database.ts
 * export default {
 *   development: { host: 'localhost', port: 5432 },
 *   production:  { host: 'db.example.com', port: 5432 },
 * }
 */
export default class TypescriptLoader extends BaseConfigurationLoader {
  protected override extensions = ['ts', 'js']

  /**
   * Load and evaluate a TypeScript or JavaScript configuration file.
   *
   * @param filePath - Absolute path to the config file.
   * @param environment - Optional environment key (e.g. `"production"`) used
   *   to extract a nested section from the config object.
   * @returns The resolved configuration object, the environment-specific
   *   subset if found, or `null` if the file does not exist.
   * @throws If the file exists but cannot be imported or evaluated.
   */
  async load(filePath: string, environment?: string): Promise<any> {
    if (!existsSync(filePath)) {
      return null
    }

    try {
      // Convert to file URL for dynamic import
      const fileUrl = pathToFileURL(filePath).href
      const module = await import(fileUrl + '?t=' + Date.now())

      let config = module.default || module

      // Extract environment-specific config
      config = this.extractEnvironmentConfig(config, environment)

      return config
    } catch (error) {
      throw new Error(`Failed to load TypeScript/JavaScript config from ${filePath}: ${error}`)
    }
  }
}
