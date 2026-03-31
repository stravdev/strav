import { readdirSync } from 'node:fs'
import { basename, join } from 'node:path'
import EnvLoader from './loaders/env_loader'
import TypescriptLoader from './loaders/typescript_loader'
import type { ConfigData, ConfigurationLoader } from './types'

export default class Configuration {
  private data: ConfigData = {}
  private configPath: string
  private environment?: string
  private loaders: ConfigurationLoader[] = [new EnvLoader(), new TypescriptLoader()]

  constructor(configPath: string = './config', environment?: string) {
    this.configPath = configPath
    this.environment = environment
  }

  /**
   * Scan the config directory and load every supported file.
   * Each file is stored under a key derived from its name
   * (e.g. `database.ts` → `"database"`).
   */
  async load(): Promise<void> {
    let files: string[]
    try {
      files = readdirSync(this.configPath)
    } catch {
      return
    }

    for (const file of files) {
      const filePath = join(this.configPath, file)
      const loader = this.loaders.find(l => l.supports(filePath))
      if (!loader) continue

      const config = await loader.load(filePath, this.environment)
      if (config === null) continue

      let key = basename(file, '.' + file.split('.').pop())
      // Handle dotfiles like .env where basename strips the entire name
      if (!key) key = file.replace(/^\./, '')
      this.data[key] = config
    }
  }

  /**
   * Retrieve a config value using dot notation.
   *
   * @example
   * config.get('database.host')       // value of data.database.host
   * config.get('database.port', 3306) // with fallback
   */
  get(key: string, defaultValue?: any): any {
    const parts = key.split('.')
    let current: any = this.data

    for (const part of parts) {
      if (current === undefined || current === null || typeof current !== 'object') {
        return defaultValue
      }
      current = current[part]
    }

    return current !== undefined ? current : defaultValue
  }

  /** Check whether a key exists (even if its value is `undefined`). */
  has(key: string): boolean {
    const parts = key.split('.')
    let current: any = this.data

    for (const part of parts) {
      if (current === undefined || current === null || typeof current !== 'object') {
        return false
      }
      if (!(part in current)) {
        return false
      }
      current = current[part]
    }

    return true
  }

  /** Set a config value using dot notation. */
  set(key: string, value: any): void {
    const parts = key.split('.')
    const last = parts.pop()!
    let current: any = this.data

    for (const part of parts) {
      if (current[part] === undefined || typeof current[part] !== 'object') {
        current[part] = {}
      }
      current = current[part]
    }

    current[last] = value
  }

  /** Return all loaded config data. */
  all(): ConfigData {
    return this.data
  }
}
