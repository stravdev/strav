/**
 * Options for file-based sources.
 */
export interface FileSourceOptions {
  /** File encoding (default: 'utf8') */
  encoding?: string

  /** Whether to watch for file changes */
  watch?: boolean
}
