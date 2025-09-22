import type { ConfigLoader } from './ConfigLoader'

/**
 * Factory interface for creating and managing configuration loaders.
 *
 * The ConfigLoaderFactory serves as a central registry and factory for configuration loaders,
 * implementing the Factory pattern to provide a unified interface for loader management.
 * It abstracts the complexity of loader selection and instantiation, allowing the configuration
 * system to dynamically choose appropriate loaders based on file formats or configuration types.
 *
 * This factory enables:
 * - Dynamic loader registration for extensibility
 * - Format-based loader selection and retrieval
 * - Centralized management of all available loaders
 * - Runtime discovery of supported configuration formats
 *
 * The factory works in conjunction with ConfigLoader implementations such as:
 * - JsonConfigLoader for .json files
 * - TypeScriptConfigLoader for .ts/.js modules
 * - EnvironmentConfigLoader for environment variables
 */
export interface ConfigLoaderFactory {
  /**
   * Retrieves a configuration loader for the specified format.
   *
   * This method performs format-based lookup to find an appropriate loader
   * that can handle the requested configuration format. The format parameter
   * typically corresponds to file extensions (e.g., 'json', 'ts', 'js') or
   * configuration types (e.g., 'env' for environment variables).
   *
   * @param format - The configuration format identifier (e.g., 'json', 'ts', 'env')
   * @returns The ConfigLoader instance capable of handling the format, or null if no suitable loader is found
   *
   * @example
   * ```typescript
   * const jsonLoader = factory.getLoader('json');
   * const tsLoader = factory.getLoader('ts');
   * const envLoader = factory.getLoader('env');
   * ```
   */
  getLoader(format: string): ConfigLoader | null

  /**
   * Registers a new configuration loader for a specific format.
   *
   * This method allows dynamic registration of loaders, enabling the factory
   * to support new configuration formats at runtime. The registration associates
   * a format identifier with a loader instance, making it available for future
   * retrieval via getLoader().
   *
   * @param format - The format identifier to associate with the loader (e.g., 'yaml', 'xml')
   * @param loader - The ConfigLoader instance that handles the specified format
   *
   * @throws {Error} May throw if the format is already registered or if the loader is invalid
   */
  registerLoader(format: string, loader: ConfigLoader): void

  /**
   * Retrieves all currently supported configuration formats.
   *
   * This method returns an array of format identifiers for all registered loaders,
   * providing a way to discover available configuration formats at runtime.
   * Useful for validation, UI generation, or dynamic configuration processing.
   *
   * @returns Array of supported format identifiers (e.g., ['json', 'ts', 'env'])
   */
  getSupportedFormats(): string[]
}
