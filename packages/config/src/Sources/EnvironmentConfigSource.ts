import type { ConfigSource } from '../Contracts/ConfigSource'
import type { ConfigData } from '../Types/ConfigData'

/**
 * System-level environment variable configuration source for deployment-specific configuration management.
 *
 * The EnvironmentConfigSource serves as the specialized configuration provider for environment
 * variable-based configuration data, implementing a string-preserving access strategy that
 * maintains the original format and values of system environment variables without any
 * automatic type conversion or parsing operations.
 *
 * This source is specifically designed to handle process environment variables and provides:
 * - Direct access to process.env with comprehensive variable enumeration
 * - String-only data preservation that maintains original environment variable formats
 * - Undefined value filtering to ensure clean configuration data structures
 * - Source metadata injection for configuration traceability and debugging
 * - Static configuration behavior suitable for deployment-time configuration
 * - Integration compatibility with containerized and serverless deployment environments
 *
 * Key architectural characteristics:
 * - Implements the Strategy pattern as a ConfigSource for environment-specific data access
 * - Maintains data integrity by avoiding automatic type conversion or value parsing
 * - Supports configuration composition through the broader source ecosystem
 * - Provides deterministic access behavior with predictable string-based output
 * - Enables deployment-specific configuration through environment variable injection
 * - Offers read-only access patterns suitable for immutable deployment configurations
 *
 * The source integrates seamlessly with EnvironmentConfigLoader instances and supports
 * various deployment scenarios including containerized environments, serverless platforms,
 * CI/CD pipelines, and traditional server deployments where configuration is provided
 * through environment variables during application startup or runtime initialization.
 *
 * Performance considerations:
 * - Single-pass environment variable enumeration for optimal startup performance
 * - Memory-efficient string-only storage without unnecessary object allocations
 * - No file system or network dependencies for maximum deployment reliability
 * - Immediate availability without asynchronous initialization requirements
 */
export class EnvironmentConfigSource implements ConfigSource {
  readonly type = 'env'
  readonly location = 'env:*'

  /**
   * Initializes a new environment variable configuration source instance.
   *
   * The constructor establishes the environment variable source without requiring any
   * configuration parameters or initialization options. The source is immediately ready
   * for use and provides direct access to the current process environment variables
   * through the resolve method.
   *
   * This parameterless initialization approach ensures consistent behavior across
   * different deployment environments and simplifies source instantiation within
   * configuration factories and service providers.
   */
  constructor() {
    // No configuration needed
  }

  /**
   * Resolves and retrieves all available environment variables as configuration data.
   *
   * This method performs comprehensive environment variable enumeration and transformation,
   * converting the process.env object into a structured ConfigData format while preserving
   * the original string values of all environment variables. The resolution process
   * implements strict string preservation to maintain data integrity and avoid unintended
   * type conversions that could alter configuration semantics.
   *
   * Core resolution logic:
   * - Enumerates all available environment variables from process.env
   * - Filters out undefined values to ensure clean configuration data structures
   * - Preserves all values as strings without any parsing or type conversion
   * - Injects source metadata for configuration traceability and debugging
   * - Provides timestamp information for configuration change tracking
   *
   * The method ensures deterministic behavior by maintaining consistent string-based
   * output regardless of the original environment variable content, enabling reliable
   * configuration processing in downstream loaders and services.
   *
   * @returns A Promise resolving to ConfigData containing all environment variables
   *          as string values, with source metadata for traceability
   * @throws No exceptions are thrown during normal operation as environment variable
   *         access is synchronous and always available in Node.js environments
   */
  async resolve(): Promise<ConfigData> {
    const configData: ConfigData = {}

    for (const [key, value] of Object.entries(process.env)) {
      // Skip undefined values
      if (value === undefined) continue

      // Keep all values as strings (no parsing)
      configData[key] = value
    }

    return {
      ...configData,
      __source: {
        type: this.type,
        location: this.location,
        lastModified: new Date().toISOString(),
      },
    }
  }

  /**
   * Attempts to establish change monitoring for environment variables.
   *
   * This method explicitly rejects watch functionality for environment variable sources
   * due to the static nature of environment variables in Node.js processes. Environment
   * variables are typically set during process initialization and remain constant
   * throughout the application lifecycle, making change monitoring both unnecessary
   * and technically infeasible within the standard Node.js runtime environment.
   *
   * The rejection of watch functionality serves several architectural purposes:
   * - Prevents inappropriate usage patterns that assume dynamic environment variable updates
   * - Maintains clear boundaries between static and dynamic configuration sources
   * - Ensures consistent behavior across different deployment environments
   * - Provides explicit feedback about source capabilities to configuration consumers
   *
   * Applications requiring dynamic configuration updates should utilize file-based
   * or HTTP-based configuration sources that support change monitoring capabilities.
   *
   * @param callback - The change notification callback (unused due to unsupported operation)
   * @returns Never returns as the method throws an exception
   * @throws Error Always throws with a descriptive message explaining the unsupported operation
   */
  watch(callback: (data: ConfigData) => void): () => void {
    throw new Error('Environment variables do not support watching')
  }

  /**
   * Indicates the change monitoring capabilities of environment variable sources.
   *
   * This method provides explicit capability information about environment variable
   * sources, returning false to indicate that change monitoring is not supported.
   * The method serves as a capability query mechanism for configuration systems
   * that need to determine source monitoring capabilities before attempting to
   * establish watch operations.
   *
   * The false return value is consistent with the static nature of environment
   * variables in Node.js processes and helps configuration consumers make
   * appropriate decisions about monitoring strategies.
   *
   * @returns false, indicating that environment variables do not support change monitoring
   */
  isWatchable(): boolean {
    return false
  }
}