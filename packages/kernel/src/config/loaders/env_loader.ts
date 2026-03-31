import { BaseConfigurationLoader } from './base_loader'
import { dirname, join } from 'node:path'

/**
 * Configuration loader for `.env` files.
 *
 * Loads the base `.env` file first, then merges values from an
 * environment-specific file (e.g. `.env.test`, `.env.production`) on top,
 * so environment-specific values override the base ones.
 *
 * @example
 * // .env
 * DB_HOST=localhost
 * DB_PORT=5432
 *
 * // .env.production
 * DB_HOST=db.example.com
 *
 * // Result when environment is "production":
 * // { DB_HOST: "db.example.com", DB_PORT: "5432" }
 */
export default class EnvLoader extends BaseConfigurationLoader {
  protected override extensions = ['env']

  /**
   * Load a `.env` file and optionally merge an environment-specific override
   * file on top.
   *
   * Given a `filePath` of `/app/config/.env`, this will:
   * 1. Parse `/app/config/.env` (if it exists)
   * 2. Parse `/app/config/.env.{environment}` (if `environment` is provided and the file exists)
   * 3. Return the merged result, with environment-specific values taking precedence.
   *
   * @param filePath - Absolute path to the base `.env` file.
   * @param environment - Optional environment name (e.g. `"test"`, `"production"`).
   * @returns The merged key-value pairs, or `null` if the base file does not exist.
   * @throws If a file exists but cannot be read or parsed.
   */
  async load(filePath: string, environment?: string): Promise<any> {
    const baseConfig = await this.parseEnvFile(filePath)

    if (baseConfig === null) {
      return null
    }

    if (!environment) {
      return baseConfig
    }

    const dir = dirname(filePath)
    const envFilePath = join(dir, `.env.${environment}`)
    const envConfig = await this.parseEnvFile(envFilePath)

    if (envConfig === null) {
      return baseConfig
    }

    return { ...baseConfig, ...envConfig }
  }

  /**
   * Parse a single `.env` file into a key-value object.
   *
   * Supports:
   * - `KEY=value` pairs
   * - Quoted values (single and double quotes are stripped)
   * - Comments (lines starting with `#`)
   * - Blank lines (ignored)
   *
   * @param filePath - Absolute path to the `.env` file.
   * @returns The parsed key-value pairs, or `null` if the file does not exist.
   */
  private async parseEnvFile(filePath: string): Promise<Record<string, string> | null> {
    const file = Bun.file(filePath)

    if (!(await file.exists())) {
      return null
    }

    const content = await file.text()
    const result: Record<string, string> = {}

    for (const line of content.split('\n')) {
      const trimmed = line.trim()

      // Skip empty lines and comments
      if (trimmed === '' || trimmed.startsWith('#')) {
        continue
      }

      const separatorIndex = trimmed.indexOf('=')
      if (separatorIndex === -1) {
        continue
      }

      const key = trimmed.slice(0, separatorIndex).trim()
      let value = trimmed.slice(separatorIndex + 1).trim()

      // Strip surrounding quotes
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }

      result[key] = value
    }

    return result
  }
}
