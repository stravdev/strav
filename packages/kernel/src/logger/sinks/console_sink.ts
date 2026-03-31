import build from 'pino-pretty'
import { LogSink, type SinkConfig } from './sink'

/** Configuration specific to the console sink. */
export interface ConsoleSinkConfig extends SinkConfig {
  /** Enable ANSI colour output. Defaults to `true`. */
  colorize?: boolean
}

/**
 * Log sink that writes human-readable output to stdout via `pino-pretty`.
 *
 * Intended for local development; for structured JSON output in production
 * consider disabling this sink and using the file sink instead.
 */
export class ConsoleSink extends LogSink {
  createStream() {
    const config = this.config as ConsoleSinkConfig

    return build({
      colorize: config.colorize ?? true,
    })
  }
}
