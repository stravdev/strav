import type { ConfigData, ConfigurationLoader } from '../types'

/**
 * Abstract base class for configuration loaders.
 *
 * Subclasses declare the file extensions they handle via {@link extensions} and
 * implement {@link load} to parse a specific file format. Shared helpers for
 * extension matching and environment-based config extraction are provided here.
 */
export abstract class BaseConfigurationLoader implements ConfigurationLoader {
  /** File extensions this loader can handle (without the leading dot). */
  protected extensions: string[] = []

  /**
   * Load and parse a configuration file.
   *
   * @param filePath - Absolute path to the configuration file.
   * @param environment - Optional environment key (e.g. `"production"`) used
   *   to select a nested section from the loaded config.
   * @returns The parsed configuration data, or `null` if the file does not exist.
   */
  abstract load(filePath: string, environment?: string): Promise<ConfigData>

  /**
   * Check whether this loader supports the given file path based on its
   * extension.
   *
   * @param filePath - Path to test.
   * @returns `true` if the file's extension is in {@link extensions}.
   */
  supports(filePath: string): boolean {
    const ext = this.getFileExtension(filePath)
    return this.extensions.includes(ext)
  }

  /**
   * Extract the lowercase file extension from a path.
   *
   * @param filePath - The file path to inspect.
   * @returns The extension without a leading dot, or an empty string if none.
   */
  protected getFileExtension(filePath: string): string {
    return filePath.split('.').pop()?.toLowerCase() || ''
  }

  /**
   * Return the environment-specific subset of a configuration object.
   *
   * If `environment` is provided and the config object contains a matching
   * top-level key, that nested value is returned. Otherwise the full config
   * is returned unchanged.
   *
   * @param config - The full configuration object.
   * @param environment - Optional environment key to look up.
   * @returns The environment subset, or the original config if no match.
   */
  protected extractEnvironmentConfig(config: any, environment?: string): any {
    if (!environment || typeof config !== 'object' || config === null) {
      return config
    }

    // Check if config has environment-specific sections
    if (config[environment]) {
      return config[environment]
    }

    return config
  }
}
