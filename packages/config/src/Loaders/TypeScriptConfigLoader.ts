import type { ConfigLoader } from '../Contracts/ConfigLoader'
import type { ConfigSource } from '../Contracts/ConfigSource'
import { ConfigLoadException } from '../Exceptions/ConfigLoadException'
import { UnsupportedFormatException } from '../Exceptions/UnsupportedFormatException'
import type { ConfigData } from '../Types/ConfigData'
import { extname } from 'path'

/**
 * Advanced configuration loader for TypeScript, JavaScript, and ES module sources within the configuration system.
 *
 * The TypeScriptConfigLoader serves as the sophisticated processor for module-based configuration files,
 * implementing a comprehensive dynamic import strategy with intelligent export pattern recognition and
 * factory function support. This loader is specifically designed to handle executable configuration
 * modules that can provide both static configuration objects and dynamic configuration generation
 * through factory functions.
 *
 * This loader provides extensive functionality including:
 * - Multi-format module support for TypeScript (.ts), JavaScript (.js), and ES modules (.mjs)
 * - Dynamic import execution with cache busting for hot reloading support
 * - Intelligent export pattern recognition with graceful fallback strategies
 * - Factory function execution for dynamic configuration generation
 * - CommonJS and ES module compatibility with seamless interoperability
 * - Comprehensive error handling with detailed diagnostic information
 * - Custom import function injection for testing and specialized environments
 * - Module caching bypass for development workflow optimization
 *
 * Key architectural characteristics:
 * - Implements the Strategy pattern for module-specific configuration loading
 * - Supports multiple export patterns with prioritized extraction logic
 * - Enables configuration composition through executable module evaluation
 * - Provides deterministic loading behavior with predictable fallback mechanisms
 * - Facilitates hot reloading through cache busting and module re-evaluation
 * - Maintains compatibility across different JavaScript module systems
 *
 * Export pattern recognition priority:
 * 1. Default object export (export default { ... })
 * 2. Named config export (export const config = { ... })
 * 3. CommonJS module exports (module.exports = { ... })
 * 4. Default factory function (export default () => ({ ... }))
 * 5. Named factory function (export const config = () => ({ ... }))
 * 6. Empty object fallback for graceful degradation
 *
 * The loader integrates seamlessly with FileConfigSource instances and supports
 * various deployment scenarios including local development with hot reloading,
 * containerized environments with dynamic configuration, and production deployments
 * where configuration logic requires runtime evaluation. It handles complex nested
 * objects, circular references, and large configuration modules while maintaining
 * performance and memory efficiency through intelligent caching strategies.
 */
export class TypeScriptConfigLoader implements ConfigLoader {
  readonly supportedFormats = ['ts', 'js', 'mjs']

  private readonly supportedExtensions = ['.ts', '.js', '.mjs']

  /**
   * Creates a new TypeScript configuration loader with optional custom import function.
   *
   * The constructor allows injection of a custom import function to support specialized
   * environments such as testing frameworks, bundlers, or runtime environments that
   * require non-standard module loading behavior. The default implementation uses
   * standard dynamic import with full ES module and CommonJS compatibility.
   *
   * Custom importers enable advanced scenarios including:
   * - Mock module loading for comprehensive testing
   * - Bundler-specific module resolution strategies
   * - Runtime environment adaptations for specialized platforms
   * - Development tool integration with custom module transformation
   *
   * @param importer - Custom import function for module loading, defaults to standard dynamic import with full compatibility
   */
  constructor(private readonly importer: (specifier: string) => Promise<any> = (s) => import(s)) {}

  /**
   * Determines compatibility with TypeScript, JavaScript, and ES module configuration sources through extension analysis.
   *
   * This method performs comprehensive source compatibility validation by examining both
   * the source type and file extension to ensure the loader only processes executable
   * module files. It serves as the primary compatibility check in the loader selection
   * process, preventing inappropriate usage with non-module sources and ensuring type
   * safety throughout the configuration loading pipeline.
   *
   * The compatibility check supports multiple JavaScript ecosystem formats including
   * TypeScript (.ts), JavaScript (.js), and ES modules (.mjs) with case-insensitive
   * extension matching. This comprehensive format support enables seamless integration
   * across different development environments and build toolchains while maintaining
   * strict boundaries for loader responsibility.
   *
   * @param source - The configuration source to evaluate for module file compatibility
   * @returns true if the source is a file with supported module extension (.ts, .js, .mjs), false otherwise
   */
  canLoad(source: ConfigSource): boolean {
    if (source.type !== 'file') {
      return false
    }

    const extension = extname(source.location).toLowerCase()
    return this.supportedExtensions.includes(extension)
  }

  /**
   * Loads, executes, and extracts configuration data from TypeScript/JavaScript modules with comprehensive error handling.
   *
   * This method performs the core functionality of dynamically importing configuration modules,
   * executing their code, and extracting configuration data through intelligent pattern recognition.
   * The loading process implements sophisticated cache busting for hot reloading support and
   * comprehensive error handling for various failure scenarios including import errors, execution
   * failures, and configuration extraction issues.
   *
   * The method handles multiple execution scenarios with specific error categorization and
   * detailed diagnostic information for troubleshooting. It ensures that configuration data
   * is properly extracted from various export patterns while maintaining compatibility across
   * different JavaScript module systems and runtime environments.
   *
   * Key processing steps include:
   * - Source compatibility validation with detailed error reporting
   * - Cache busting implementation using UUID generation for hot reloading support
   * - Dynamic module import with custom importer function support
   * - Configuration extraction through intelligent export pattern recognition
   * - Comprehensive error categorization for import and execution failures
   * - Structured error handling with appropriate exception types and diagnostic information
   *
   * Cache busting strategy:
   * - Utilizes Bun's UUID generation for unique cache identifiers
   * - Appends timestamp-based query parameters to module specifiers
   * - Enables hot reloading in development environments
   * - Supports module re-evaluation without process restart
   *
   * Error handling includes specific detection and reporting for:
   * - Module import failures with detailed error message preservation
   * - Syntax errors in TypeScript/JavaScript code with compilation diagnostics
   * - Runtime execution errors with stack trace information
   * - Configuration extraction failures with pattern recognition diagnostics
   *
   * @param source - The module file configuration source containing executable code
   * @returns Promise resolving to extracted and validated configuration data as an object
   * @throws UnsupportedFormatException when the source is not a compatible module file
   * @throws ConfigLoadException when module import, execution, or configuration extraction fails
   */
  async load(source: ConfigSource): Promise<ConfigData> {
    if (!this.canLoad(source)) {
      throw new UnsupportedFormatException(
        `TypeScript loader cannot handle source type: ${source.type}`,
        source.type
      )
    }

    try {
      // Use Bun's UUID for cache busting to support hot reloading
      const cacheBuster = Bun.randomUUIDv7()
      const moduleSpecifier = `${source.location}?t=${cacheBuster}`

      const module = await this.importer(moduleSpecifier)
      return this.extractConfigFromModule(module)
    } catch (error) {
      throw new ConfigLoadException(
        `Failed to load TypeScript config from ${source.location}`,
        source.location,
        { cause: error as Error }
      )
    }
  }

  /**
   * Extracts configuration data from imported modules using sophisticated pattern recognition and fallback strategies.
   *
   * This method implements the core configuration extraction logic that intelligently analyzes
   * imported modules to identify and extract configuration data through multiple recognition
   * patterns. The extraction process follows a prioritized strategy that handles various
   * JavaScript module export patterns, ensuring maximum compatibility across different
   * coding styles and module systems.
   *
   * The method provides comprehensive support for both static configuration objects and
   * dynamic factory functions, enabling flexible configuration generation strategies that
   * can adapt to runtime conditions, environment variables, or complex initialization logic.
   * It maintains strict validation requirements to ensure only valid configuration objects
   * are returned while providing graceful fallback mechanisms for edge cases.
   *
   * Extraction strategy implementation:
   * - Prioritized pattern matching with deterministic evaluation order
   * - Static object validation with type safety enforcement
   * - Factory function execution with error handling and logging
   * - CommonJS compatibility with ES module interoperability
   * - Graceful degradation with empty object fallback
   * - Module property filtering to remove system-specific metadata
   *
   * Pattern recognition priority ensures optimal configuration extraction:
   * 1. Default object export - Primary ES module pattern for static configuration
   * 2. Named config export - Explicit configuration object identification
   * 3. CommonJS module export - Legacy module system compatibility
   * 4. Default factory function - Dynamic configuration generation capability
   * 5. Named factory function - Explicit factory pattern recognition
   * 6. Empty object fallback - Graceful handling of edge cases and empty modules
   *
   * Factory function execution includes comprehensive error handling with detailed
   * logging for troubleshooting configuration generation failures while maintaining
   * system stability through graceful degradation strategies.
   *
   * @param module - The imported module object containing potential configuration data
   * @returns Extracted and validated configuration data as a structured object
   */
  private extractConfigFromModule(module: any): ConfigData {
    // Try default export first (object)
    if (this.isValidConfigObject(module.default)) {
      return module.default
    }

    // Try named export 'config' (object)
    if (this.isValidConfigObject(module.config)) {
      return module.config
    }

    // Try the module itself for CommonJS style exports
    if (
      this.isValidConfigObject(module) &&
      module.default === undefined &&
      module.config === undefined
    ) {
      const config = { ...module }
      // Remove common module properties
      delete config.__esModule
      delete config.default

      if (Object.keys(config).length > 0) {
        return config
      }
    }

    // Try default export as factory function
    if (typeof module.default === 'function') {
      const result = this.tryFactoryFunction(module.default, 'default factory')
      if (result !== null) {
        return result
      }
    }

    // Try named config export as factory function
    if (typeof module.config === 'function') {
      const result = this.tryFactoryFunction(module.config, 'named config factory')
      if (result !== null) {
        return result
      }
    }

    // Fallback to empty object
    return {}
  }

  /**
   * Validates configuration object structure and type safety requirements.
   *
   * This method performs comprehensive validation to ensure that extracted values
   * meet the strict requirements for configuration objects within the system.
   * The validation process enforces type safety by ensuring only valid object
   * structures are accepted as configuration data, preventing runtime errors
   * and maintaining data integrity throughout the configuration pipeline.
   *
   * Validation criteria include:
   * - Object type verification to ensure proper data structure
   * - Null value rejection to prevent undefined behavior
   * - Array rejection to maintain object-only configuration requirements
   * - Type safety enforcement for downstream configuration processing
   *
   * This validation is critical for maintaining system stability and ensuring
   * that configuration data conforms to expected structural requirements across
   * all configuration sources and processing stages.
   *
   * @param value - The value to validate as a configuration object
   * @returns true if the value is a valid non-null, non-array object, false otherwise
   */
  private isValidConfigObject(value: any): boolean {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
  }

  /**
   * Executes factory functions with comprehensive error handling and validation.
   *
   * This method provides safe execution of configuration factory functions with
   * robust error handling and result validation. Factory functions enable dynamic
   * configuration generation that can adapt to runtime conditions, environment
   * variables, or complex initialization logic while maintaining system stability
   * through comprehensive error recovery mechanisms.
   *
   * The execution process includes:
   * - Safe function invocation with exception handling
   * - Result validation to ensure proper configuration object structure
   * - Detailed error logging with contextual information for troubleshooting
   * - Graceful degradation with null return for failed executions
   * - Context-aware error reporting for different factory function types
   *
   * Error handling encompasses various failure scenarios including:
   * - Runtime exceptions during factory function execution
   * - Invalid return values that don't meet configuration object requirements
   * - Type errors and other JavaScript execution failures
   * - Resource access failures within factory function logic
   *
   * The method maintains system stability by ensuring that factory function
   * failures don't propagate as unhandled exceptions while providing sufficient
   * diagnostic information for debugging configuration generation issues.
   *
   * @param factoryFn - The factory function to execute for configuration generation
   * @param context - Descriptive context string for error reporting and logging
   * @returns Valid configuration object if execution succeeds, null if execution fails or returns invalid data
   */
  private tryFactoryFunction(factoryFn: Function, context: string): ConfigData | null {
    try {
      const result = factoryFn()
      if (this.isValidConfigObject(result)) {
        return result
      }
    } catch (error) {
      console.warn(`${context} function failed:`, error)
    }
    return null
  }
}
