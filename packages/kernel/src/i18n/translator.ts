import I18nManager from './i18n_manager.ts'
import type { Messages } from './types.ts'

/**
 * Resolve a dot-notated key from a nested messages object.
 *
 * @example
 * dotGet({ auth: { failed: 'Invalid' } }, 'auth.failed')  // 'Invalid'
 */
export function dotGet(messages: Messages, key: string): string | Messages | undefined {
  const parts = key.split('.')
  let current: string | Messages | undefined = messages

  for (const part of parts) {
    if (typeof current !== 'object' || current === null) return undefined
    current = (current as Messages)[part]
  }

  return current
}

/**
 * Replace `:key` placeholders with values from the replacements object.
 *
 * @example
 * interpolate('Hello, :name!', { name: 'Alice' })  // 'Hello, Alice!'
 */
export function interpolate(
  message: string,
  replacements: Record<string, string | number>
): string {
  let result = message
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replaceAll(`:${key}`, String(value))
  }
  return result
}

/**
 * Resolve a translation key and interpolate replacements.
 * Falls back to the fallback locale, then returns the key itself.
 */
export function translate(
  locale: string,
  key: string,
  replacements?: Record<string, string | number>
): string {
  const raw = I18nManager.resolve(locale, key)
  if (raw === null) return key

  return replacements ? interpolate(raw, replacements) : raw
}

// Plural category order used by Intl.PluralRules
const PLURAL_CATEGORIES = ['zero', 'one', 'two', 'few', 'many', 'other'] as const

/**
 * Pluralize a translation based on count.
 *
 * The translation value uses `|` to separate plural forms:
 * - 2 forms: `"one apple|:count apples"` → `Intl.PluralRules` picks one vs other
 * - 6 forms: mapped to `zero|one|two|few|many|other`
 *
 * `:count` is automatically added to replacements.
 */
export function translateChoice(
  locale: string,
  key: string,
  count: number,
  replacements?: Record<string, string | number>
): string {
  const raw = I18nManager.resolve(locale, key)
  if (raw === null) return key

  const segments = raw.split('|')
  const merged = { count, ...replacements }

  let chosen: string

  if (segments.length === 1) {
    chosen = segments[0]!
  } else if (segments.length === 2) {
    // Simple singular/plural
    const rules = new Intl.PluralRules(locale)
    const category = rules.select(count)
    chosen = category === 'one' ? segments[0]! : segments[1]!
  } else {
    // Map to plural categories
    const rules = new Intl.PluralRules(locale)
    const category = rules.select(count)
    const index = PLURAL_CATEGORIES.indexOf(category)
    chosen = segments[Math.min(index, segments.length - 1)]!
  }

  return interpolate(chosen.trim(), merged)
}
