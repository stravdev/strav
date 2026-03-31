import { AsyncLocalStorage } from 'node:async_hooks'
import I18nManager from './i18n_manager.ts'
import { translate, translateChoice, interpolate } from './translator.ts'

/**
 * Request-scoped locale storage.
 * The i18n middleware sets the locale per-request via `localeStorage.run()`.
 */
export const localeStorage = new AsyncLocalStorage<string>()

// Hardcoded English fallbacks for validation rules when i18n is not configured
const VALIDATION_DEFAULTS: Record<string, string> = {
  'validation.required': 'This field is required',
  'validation.string': 'Must be a string',
  'validation.integer': 'Must be an integer',
  'validation.number': 'Must be a number',
  'validation.boolean': 'Must be a boolean',
  'validation.min.number': 'Must be at least :min',
  'validation.min.string': 'Must be at least :min characters',
  'validation.max.number': 'Must be at most :max',
  'validation.max.string': 'Must be at most :max characters',
  'validation.email': 'Must be a valid email address',
  'validation.url': 'Must be a valid URL',
  'validation.regex': 'Invalid format',
  'validation.enum': 'Must be one of: :values',
  'validation.array': 'Must be an array',
}

/**
 * Get the current locale from the request context, or the default locale.
 *
 * @example
 * locale()  // 'en'
 */
export function locale(): string {
  return localeStorage.getStore() ?? I18nManager.config.default
}

/**
 * Translate a key with optional replacements.
 * Uses the current request locale (from AsyncLocalStorage).
 *
 * If i18n is not configured, returns English fallbacks for validation
 * keys and the raw key for everything else.
 *
 * @example
 * t('auth.failed')                           // "Invalid credentials"
 * t('messages.welcome', { name: 'Alice' })   // "Welcome, Alice!"
 */
export function t(key: string, replacements?: Record<string, string | number>): string {
  if (!I18nManager.isLoaded) {
    // Fallback: return hardcoded English default or the key itself
    const fallback = VALIDATION_DEFAULTS[key]
    if (fallback) return replacements ? interpolate(fallback, replacements) : fallback
    return key
  }

  return translate(locale(), key, replacements)
}

/**
 * Pluralized translation based on count.
 *
 * @example
 * choice('messages.apple', 1)  // "one apple"
 * choice('messages.apple', 5)  // "5 apples"
 */
export function choice(
  key: string,
  count: number,
  replacements?: Record<string, string | number>
): string {
  if (!I18nManager.isLoaded) return key

  return translateChoice(locale(), key, count, replacements)
}
