/**
 * Options for HTTP-based sources.
 */
export interface HttpSourceOptions {
  /** Request headers */
  headers?: Record<string, string>

  /** Request timeout in milliseconds */
  timeout?: number

  /** Polling interval for changes (milliseconds) */
  pollInterval?: number
}
