/**
 * Configuration options for service initialization.
 */
export interface ConfigServiceOptions {
  /** Whether to throw on missing keys vs return undefined */
  strict?: boolean

  /** Whether to automatically reload on source changes */
  reloadOnChange?: boolean

  /** Whether to make config immutable after load */
  frozen?: boolean
}
