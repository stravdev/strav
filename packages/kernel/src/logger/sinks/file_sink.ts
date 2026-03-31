import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import pino from 'pino'
import { LogSink, type SinkConfig } from './sink'

/** Configuration specific to the file sink. */
export interface FileSinkConfig extends SinkConfig {
  /** Path to the log file. Parent directories are created automatically. */
  path: string
}

/**
 * Log sink that writes structured JSON to a file using pino's optimised
 * {@link pino.destination | SonicBoom} writer with asynchronous flushing.
 */
export class FileSink extends LogSink {
  createStream() {
    const { path } = this.config as FileSinkConfig

    mkdirSync(dirname(path), { recursive: true })

    return pino.destination({ dest: path, sync: false })
  }
}
