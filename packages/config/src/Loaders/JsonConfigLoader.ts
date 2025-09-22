import type { ConfigLoader } from '../Contracts/ConfigLoader'
import type { ConfigSource } from '../Contracts/ConfigSource'
import { ConfigLoadException } from '../Exceptions/ConfigLoadException'
import { UnsupportedFormatException } from '../Exceptions/UnsupportedFormatException'
import type { ConfigData } from '../Types/ConfigData'
import { extname } from 'path'
import { readFile } from 'fs/promises'

/**
 * Specialized configuration loader for JSON file sources within the configuration system.
 *
 * The JsonConfigLoader serves as the dedicated processor for JSON-based configuration files,
 * implementing a robust parsing and validation strategy that ensures data integrity and
 * provides comprehensive error handling for various failure scenarios. This loader is
 * specifically designed to handle file-based JSON configuration sources with strict
 * validation requirements.
 *
 * This loader provides comprehensive functionality including:
 * - File extension-based source compatibility detection for JSON files
 * - Robust JSON parsing with syntax error detection and reporting
 * - Configuration object validation to ensure proper data structure
 * - Comprehensive file system error handling with specific error categorization
 * - Type safety through strict ConfigLoader interface compliance
 * - UTF-8 encoding support for international character sets
 *
 * Key architectural characteristics:
 * - Implements the Strategy pattern for JSON-specific configuration loading
 * - Maintains strict validation rules for configuration object structure
 * - Supports configuration composition through the broader loader ecosystem
 * - Provides deterministic parsing behavior with predictable object-based output
 * - Enables file-based configuration management with comprehensive error diagnostics
 *
 * The loader integrates seamlessly with FileConfigSource instances and supports
 * various deployment scenarios including local development, containerized environments,
 * and production deployments where configuration is provided through JSON files.
 * It handles complex nested objects, Unicode characters, and large configuration files
 * while maintaining performance and memory efficiency.
 */
export class JsonConfigLoader implements ConfigLoader {
  readonly supportedFormats = ['json']

  private readonly supportedExtensions = ['.json']

  /**
   * Determines compatibility with JSON file configuration sources through extension analysis.
   *
   * This method performs comprehensive source compatibility validation by examining both
   * the source type and file extension to ensure the loader only processes JSON files.
   * It serves as the primary compatibility check in the loader selection process,
   * preventing inappropriate usage with non-JSON sources and ensuring type safety
   * throughout the configuration loading pipeline.
   *
   * The compatibility check is strict and requires both a 'file' source type and a
   * '.json' file extension (case-insensitive), providing clear boundaries for loader
   * responsibility and enabling reliable loader selection by the configuration system.
   * This dual validation approach ensures that only legitimate JSON files are processed.
   *
   * @param source - The configuration source to evaluate for JSON file compatibility
   * @returns true if the source is a file with .json extension, false otherwise
   */
  canLoad(source: ConfigSource): boolean {
    if (source.type !== 'file') {
      return false
    }

    const extension = extname(source.location).toLowerCase()
    return this.supportedExtensions.includes(extension)
  }

  /**
   * Loads, parses, and validates JSON configuration data with comprehensive error handling.
   *
   * This method performs the core functionality of reading JSON configuration files,
   * parsing their content, and validating the resulting data structure to ensure it
   * meets configuration requirements. The loading process implements robust error
   * handling for various failure scenarios including file system errors, JSON syntax
   * errors, and data validation failures.
   *
   * The method handles multiple error categories with specific exception types and
   * detailed diagnostic information for troubleshooting. It ensures that only valid
   * configuration objects (non-null, non-array objects) are returned, maintaining
   * data integrity throughout the configuration system.
   *
   * Key processing steps include:
   * - Source compatibility validation with detailed error reporting
   * - File content reading with UTF-8 encoding support
   * - JSON parsing with syntax error detection and reporting
   * - Configuration object validation to ensure proper structure
   * - Comprehensive error categorization for file system and parsing failures
   * - Structured error handling with appropriate exception types and diagnostic information
   *
   * File system error handling includes specific detection and reporting for:
   * - File not found errors (ENOENT) with clear diagnostic messages
   * - Permission denied errors (EACCES) with access-specific guidance
   * - Other file system errors with generic fallback handling
   *
   * JSON parsing error handling includes:
   * - Syntax error detection with detailed error message preservation
   * - Data type validation to ensure configuration object requirements
   * - Structured validation for non-null, non-array object requirements
   *
   * @param source - The JSON file configuration source containing raw data
   * @returns Promise resolving to parsed and validated configuration data as an object
   * @throws UnsupportedFormatException when the source is not a compatible JSON file
   * @throws ConfigLoadException when file reading, parsing, or validation fails
   */
  async load(source: ConfigSource): Promise<ConfigData> {
    if (!this.canLoad(source)) {
      throw new UnsupportedFormatException(
        `JSON loader cannot handle source type: ${source.type}`,
        source.type
      )
    }

    try {
      // Read file content
      const fileContent = await readFile(source.location, 'utf8')
      
      // Parse JSON content
      const parsedData = JSON.parse(fileContent)
      
      // Validate that the parsed data is an object
      if (!this.isValidConfigObject(parsedData)) {
        throw new ConfigLoadException(
          `JSON file must contain a valid configuration object, got ${typeof parsedData}`,
          source.location
        )
      }

      // Return the parsed configuration data
      return parsedData as ConfigData

    } catch (error) {
      if (error instanceof ConfigLoadException || error instanceof UnsupportedFormatException) {
        throw error
      }

      // Handle file system errors
      if (error instanceof Error && 'code' in error) {
        const fsError = error as NodeJS.ErrnoException
        if (fsError.code === 'ENOENT') {
          throw new ConfigLoadException(
            `JSON configuration file not found: ${source.location}`,
            source.location
          )
        }
        if (fsError.code === 'EACCES') {
          throw new ConfigLoadException(
            `Permission denied reading JSON file: ${source.location}`,
            source.location
          )
        }
      }

      // Handle JSON parsing errors
      if (error instanceof SyntaxError) {
        throw new ConfigLoadException(
          `Invalid JSON syntax in configuration file: ${error.message}`,
          source.location
        )
      }

      // Handle any other errors
      const message = error instanceof Error ? error.message : 'Unknown error'
      throw new ConfigLoadException(
        `Failed to load JSON configuration from ${source.location}: ${message}`,
        source.location
      )
    }
  }

  /**
   * Validates that a value is a valid configuration object.
   * Configuration objects must be non-null objects (not arrays or primitives).
   */
  private isValidConfigObject(value: any): boolean {
    return (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value)
    )
  }
}