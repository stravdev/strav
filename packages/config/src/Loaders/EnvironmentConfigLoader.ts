import type { ConfigLoader } from '../Contracts/ConfigLoader'
import type { ConfigSource } from '../Contracts/ConfigSource'
import { ConfigLoadException } from '../Exceptions/ConfigLoadException'
import { UnsupportedFormatException } from '../Exceptions/UnsupportedFormatException'
import type { ConfigData } from '../Types/ConfigData'

/**
 * Specialized configuration loader for environment variable sources within the configuration system.
 *
 * The EnvironmentConfigLoader serves as the dedicated processor for environment variable-based
 * configuration data, implementing a string-preserving loading strategy that maintains the
 * original format and values of environment variables without any type conversion or parsing.
 *
 * This loader is specifically designed to handle environment variable sources and provides:
 * - String-only data processing that preserves original environment variable formats
 * - Undefined value filtering to ensure clean configuration data structures
 * - Source metadata preservation for configuration traceability and debugging
 * - Robust error handling with detailed exception reporting for loading failures
 * - Type safety through strict ConfigLoader interface compliance
 *
 * Key architectural characteristics:
 * - Implements the Strategy pattern for environment-specific configuration loading
 * - Maintains data integrity by avoiding automatic type conversion or parsing
 * - Supports configuration composition through the broader loader ecosystem
 * - Provides deterministic loading behavior with predictable string-based output
 * - Enables deployment-specific configuration through environment variable injection
 *
 * The loader integrates seamlessly with EnvironmentConfigSource instances and supports
 * various deployment scenarios including containerized environments, serverless platforms,
 * and traditional server deployments where configuration is provided through environment variables.
 */
export class EnvironmentConfigLoader implements ConfigLoader {
  readonly supportedFormats = ['env', 'environment']

  /**
   * Determines compatibility with environment variable configuration sources.
   *
   * This method performs source type validation to ensure the loader only processes
   * environment variable sources. It serves as the primary compatibility check in the
   * loader selection process, preventing inappropriate usage with non-environment sources
   * and ensuring type safety throughout the configuration loading pipeline.
   *
   * The compatibility check is strict and only accepts sources with type 'env',
   * providing clear boundaries for loader responsibility and enabling reliable
   * loader selection by the configuration system.
   *
   * @param source - The configuration source to evaluate for environment variable compatibility
   * @returns true if the source type is 'env', false for all other source types
   */
  canLoad(source: ConfigSource): boolean {
    return source.type === 'env'
  }

  /**
   * Loads and processes environment variable configuration data with string preservation.
   *
   * This method performs the core functionality of retrieving environment variable data
   * from the source, filtering undefined values, and returning structured configuration
   * data while maintaining all values as strings. The loading process preserves the
   * original format and content of environment variables without any type conversion,
   * parsing, or transformation.
   *
   * The method handles source metadata extraction and preservation, ensuring that
   * configuration traceability is maintained throughout the loading process. It implements
   * comprehensive error handling with specific exception types for different failure
   * scenarios, providing clear diagnostic information for troubleshooting.
   *
   * Key processing steps include:
   * - Source compatibility validation with detailed error reporting
   * - Raw data retrieval through the source's resolve method
   * - Metadata extraction and preservation for configuration tracking
   * - Undefined value filtering to ensure clean data structures
   * - String type preservation without any automatic conversion
   * - Structured error handling with appropriate exception types
   *
   * @param source - The environment variable configuration source containing raw data
   * @returns Promise resolving to structured configuration data with all values as strings
   * @throws UnsupportedFormatException when the source type is not 'env'
   * @throws ConfigLoadException when data retrieval or processing fails
   */
  async load(source: ConfigSource): Promise<ConfigData> {
    if (!this.canLoad(source)) {
      throw new UnsupportedFormatException(
        `Environment loader cannot handle source type: ${source.type}`,
        source.type
      )
    }

    try {
      // Get the raw data from the environment source
      const rawData = await source.resolve()
      
      // Extract the actual environment data (excluding __source metadata)
      const { __source, ...envData } = rawData
      
      // Filter out undefined values
      const filteredData: Record<string, string> = {}
      for (const [key, value] of Object.entries(envData)) {
        if (value !== undefined) {
          filteredData[key] = value as string
        }
      }
      
      // Return environment data as-is (all values remain as strings)
      return {
        ...filteredData,
        __source
      }

    } catch (error) {
      if (error instanceof ConfigLoadException || error instanceof UnsupportedFormatException) {
        throw error
      }

      const message = error instanceof Error ? error.message : 'Unknown error'
      throw new ConfigLoadException(
        `Failed to load environment configuration: ${message}`,
        source.location
      )
    }
  }
}