import { resolve, join, basename } from 'node:path'
import { readdirSync } from 'node:fs'
import { inject } from '../core/inject.ts'
import Configuration from '../config/configuration.ts'
import { ConfigurationError } from '../exceptions/errors.ts'
import { dotGet } from './translator.ts'
import type { I18nConfig, Messages, LocaleDetection } from './types.ts'

// Default English validation messages (loaded as base layer)
import defaultValidation from './defaults/en/validation.json'

/**
 * Central i18n configuration hub.
 *
 * Resolved once via the DI container — reads the i18n config,
 * loads translation files from disk, and provides key resolution.
 *
 * @example
 * app.singleton(I18nManager)
 * app.resolve(I18nManager)
 * await I18nManager.load()
 */
@inject
export default class I18nManager {
  private static _config: I18nConfig
  private static _translations = new Map<string, Messages>()
  private static _loaded = false

  constructor(config: Configuration) {
    I18nManager._config = {
      default: config.get('i18n.default', 'en') as string,
      fallback: config.get('i18n.fallback', 'en') as string,
      supported: config.get('i18n.supported', ['en']) as string[],
      directory: config.get('i18n.directory', 'lang') as string,
      detect: config.get('i18n.detect', ['header']) as LocaleDetection[],
    }
  }

  static get config(): I18nConfig {
    if (!I18nManager._config) {
      throw new ConfigurationError(
        'I18nManager not configured. Resolve it through the container first.'
      )
    }
    return I18nManager._config
  }

  /** Whether translation files have been loaded. */
  static get isLoaded(): boolean {
    return I18nManager._loaded
  }

  /**
   * Load all translation files from the configured directory.
   * Merges built-in defaults as the base layer.
   */
  static async load(): Promise<void> {
    // Load built-in defaults first
    I18nManager.mergeMessages('en', { validation: defaultValidation as Messages })

    // Scan lang/ directory
    const langDir = resolve(I18nManager._config.directory)

    let locales: string[]
    try {
      locales = readdirSync(langDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name)
    } catch {
      // No lang directory — use defaults only
      I18nManager._loaded = true
      return
    }

    for (const locale of locales) {
      const localeDir = join(langDir, locale)
      let files: string[]
      try {
        files = readdirSync(localeDir).filter(f => f.endsWith('.json'))
      } catch {
        continue
      }

      for (const file of files) {
        const namespace = basename(file, '.json')
        const filePath = join(localeDir, file)
        const content = await Bun.file(filePath).json()
        I18nManager.mergeMessages(locale, { [namespace]: content as Messages })
      }
    }

    I18nManager._loaded = true
  }

  /**
   * Resolve a translation key for a specific locale.
   * Tries the requested locale, then the fallback locale.
   * Returns null if not found in either.
   */
  static resolve(locale: string, key: string): string | null {
    // Try requested locale
    const messages = I18nManager._translations.get(locale)
    if (messages) {
      const value = dotGet(messages, key)
      if (typeof value === 'string') return value
    }

    // Try fallback locale
    const fallback = I18nManager._config?.fallback ?? 'en'
    if (locale !== fallback) {
      const fallbackMessages = I18nManager._translations.get(fallback)
      if (fallbackMessages) {
        const value = dotGet(fallbackMessages, key)
        if (typeof value === 'string') return value
      }
    }

    return null
  }

  /** Register translations at runtime (useful for testing or dynamic loading). */
  static register(locale: string, messages: Messages): void {
    I18nManager.mergeMessages(locale, messages)
  }

  /** Reset all state (for testing). */
  static reset(): void {
    I18nManager._translations.clear()
    I18nManager._loaded = false
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private static mergeMessages(locale: string, messages: Messages): void {
    const existing = I18nManager._translations.get(locale) ?? {}
    I18nManager._translations.set(locale, deepMerge(existing, messages))
  }
}

function deepMerge(target: Messages, source: Messages): Messages {
  const result = { ...target }
  for (const [key, value] of Object.entries(source)) {
    if (
      typeof value === 'object' &&
      value !== null &&
      typeof result[key] === 'object' &&
      result[key] !== null
    ) {
      result[key] = deepMerge(result[key] as Messages, value as Messages)
    } else {
      result[key] = value
    }
  }
  return result
}
