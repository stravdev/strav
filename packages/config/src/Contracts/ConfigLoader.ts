import type { ConfigData } from '../Types/ConfigData'
import type { ConfigSource } from './ConfigSource'

/**
 * Configuration loader interface that defines the contract for parsing and transforming
 * raw configuration data from various sources into structured ConfigData objects.
 * 
 * Loaders are responsible for:
 * - Format detection and validation based on source characteristics
 * - Parsing and transformation of raw data into structured configuration objects
 * - Error handling for malformed or invalid configuration data
 * - Type safety and data validation during the loading process
 * 
 * Each loader implementation specializes in handling specific configuration formats
 * such as JSON files, TypeScript/JavaScript modules, or environment variables.
 * The loader system supports extensibility through custom implementations that
 * follow this contract.
 */
export interface ConfigLoader {
  /** 
   * Array of supported format identifiers that this loader can handle.
   * Used for loader discovery and selection based on configuration source format.
   * Common formats include 'json', 'ts', 'js', 'mjs', 'env', 'environment'.
   */
  readonly supportedFormats: string[]

  /** 
   * Determines whether this loader can handle the specified configuration source.
   * Implementations typically check source type, file extensions, or other
   * characteristics to determine compatibility. This method enables the loader
   * selection process and prevents inappropriate loader usage.
   * 
   * @param source - The configuration source to evaluate for compatibility
   * @returns true if this loader can process the source, false otherwise
   */
  canLoad(source: ConfigSource): boolean

  /** 
   * Loads, parses, and transforms configuration data from the specified source.
   * This method performs the core functionality of reading raw data from the source,
   * parsing it according to the format-specific rules, and returning structured
   * ConfigData. Implementations should handle format-specific parsing, validation,
   * error handling, and any necessary data transformations.
   * 
   * @param source - The configuration source containing raw data to load
   * @returns Promise resolving to parsed and structured configuration data
   * @throws UnsupportedFormatException when the source format is not supported
   * @throws ConfigLoadException when parsing or loading fails due to malformed data
   */
  load(source: ConfigSource): Promise<ConfigData>
}
