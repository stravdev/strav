import type { DestinationStream } from 'pino'

/** Supported log severity levels, from most to least verbose. */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'silent'

/** Configuration object for a single log sink. */
export interface SinkConfig {
  /** Whether this sink is active. Disabled sinks are skipped by the Logger. */
  enabled: boolean
  /** Minimum severity level this sink will accept. Defaults to `"info"`. */
  level?: LogLevel
  [key: string]: unknown
}

/**
 * Abstract base class for log sinks.
 *
 * Subclasses implement {@link createStream} to provide a writable destination
 * (stdout, file, network, etc.) that the Logger combines via pino multistream.
 *
 * To add a new sink:
 * 1. Extend this class and implement `createStream()`.
 * 2. Register the class in the `sinkRegistry` inside `logger.ts`.
 * 3. Add a corresponding section in `config/logging.ts`.
 */
export abstract class LogSink {
  constructor(protected config: SinkConfig) {}

  /** Create the writable destination stream for this sink. */
  abstract createStream(): DestinationStream

  /** Minimum log level for this sink. Defaults to `"info"` when not configured. */
  get level(): LogLevel {
    return this.config.level ?? 'info'
  }
}
