import type { ConfigSourceFactory as ConfigSourceFactoryContract } from '../Contracts/ConfigSourceFactory'
import type { ConfigSource } from '../Contracts/ConfigSource'
import type { FileSourceOptions } from '../Types/FileSourceOptions'
import type { HttpSourceOptions } from '../Types/HttpSourceOptions'

import { FileConfigSource } from '../Sources/FileConfigSource'
import { HttpConfigSource } from '../Sources/HttpConfigSource'
import { EnvironmentConfigSource } from '../Sources/EnvironmentConfigSource'

/**
 * Default implementation of the ConfigSourceFactory contract.
 *
 * This factory provides concrete implementations for creating different types of
 * configuration sources. It handles the instantiation and configuration of
 * file-based, HTTP-based, and environment variable sources with their respective
 * options and validation.
 */
export class ConfigSourceFactory implements ConfigSourceFactoryContract {
  /**
   * Create a file-based configuration source.
   *
   * Creates a FileConfigSource instance that reads configuration from the local
   * file system. The source supports file watching for automatic change detection
   * and provides validation for file accessibility.
   *
   * @param path - The file path to load configuration from (relative or absolute)
   * @param options - Optional file source configuration (encoding, watching, etc.)
   * @returns A ConfigSource instance for reading from the specified file
   */
  createFileSource(path: string, options?: FileSourceOptions): ConfigSource {
    return new FileConfigSource(path, options)
  }

  /**
   * Create an HTTP-based configuration source.
   *
   * Creates an HttpConfigSource instance that fetches configuration from remote
   * URLs. The source supports polling for changes and customizable request options
   * including headers, timeout, and polling intervals.
   *
   * @param url - The URL to fetch configuration from
   * @param options - Optional HTTP request options (headers, timeout, polling, etc.)
   * @returns A ConfigSource instance for fetching from the specified URL
   */
  createHttpSource(url: string, options?: HttpSourceOptions): ConfigSource {
    return new HttpConfigSource(url, options)
  }

  /**
   * Create an environment variable configuration source.
   *
   * Creates an EnvironmentConfigSource instance that reads configuration from
   * process environment variables.
   *
   * @returns A ConfigSource instance for reading from environment variables
   */
  createEnvironmentSource(): ConfigSource {
    return new EnvironmentConfigSource()
  }
}
