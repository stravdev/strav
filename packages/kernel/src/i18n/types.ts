export interface I18nConfig {
  /** Default locale, e.g. 'en'. */
  default: string
  /** Fallback locale when a key is missing in the current locale. */
  fallback: string
  /** List of supported locale codes. */
  supported: string[]
  /** Path to the lang/ directory (relative to cwd). */
  directory: string
  /** Locale detection strategies, tried in order. */
  detect: LocaleDetection[]
}

export type LocaleDetection = 'header' | 'cookie' | 'query'

/** Nested translation messages — leaf values are strings. */
export type Messages = { [key: string]: string | Messages }
