import pino from 'pino'
import Configuration from '../config/configuration.ts'
import { inject } from '../core/inject.ts'
import Emitter from '../events/emitter.ts'
import { LogSink, type SinkConfig } from './sinks/sink'
import { ConsoleSink } from './sinks/console_sink'
import { FileSink } from './sinks/file_sink'

type SinkConstructor = new (config: SinkConfig) => LogSink

/**
 * Maps sink names used in `config/logging.ts` to their implementing classes.
 * Register new sink types here so the Logger can instantiate them from config.
 */
const sinkRegistry: Record<string, SinkConstructor> = {
  console: ConsoleSink,
  file: FileSink,
}

/**
 * Structured logger backed by pino with configurable sinks.
 *
 * Sinks (console, file, …) are declared in `config/logging.ts` and combined
 * at construction time via `pino.multistream`. Each sink can define its own
 * minimum log level independently of the global level.
 *
 * @example
 * // Resolve via DI (Configuration is injected automatically):
 * container.singleton(Logger)
 * const logger = container.resolve(Logger)
 *
 * logger.info('server started', { port: 3000 })
 * logger.error('request failed', { statusCode: 500, path: '/api/users' })
 */
@inject
export default class Logger {
  private pino: pino.Logger

  constructor(protected config: Configuration) {
    const sinks = this.buildSinks()

    const streams = sinks.map(sink => ({
      stream: sink.createStream(),
      level: sink.level as pino.Level,
    }))

    const level = this.config.get('logging.level', 'info') as string satisfies string

    this.pino = streams.length > 0 ? pino({ level }, pino.multistream(streams)) : pino({ level })
  }

  /** Log at `trace` level (most verbose). */
  trace(msg: string, context?: Record<string, unknown>): void {
    context ? this.pino.trace(context, msg) : this.pino.trace(msg)
    this.emitLog('trace', msg, context)
  }

  /** Log at `debug` level. */
  debug(msg: string, context?: Record<string, unknown>): void {
    context ? this.pino.debug(context, msg) : this.pino.debug(msg)
    this.emitLog('debug', msg, context)
  }

  /** Log at `info` level. */
  info(msg: string, context?: Record<string, unknown>): void {
    context ? this.pino.info(context, msg) : this.pino.info(msg)
    this.emitLog('info', msg, context)
  }

  /** Log at `warn` level. */
  warn(msg: string, context?: Record<string, unknown>): void {
    context ? this.pino.warn(context, msg) : this.pino.warn(msg)
    this.emitLog('warn', msg, context)
  }

  /** Log at `error` level. */
  error(msg: string, context?: Record<string, unknown>): void {
    context ? this.pino.error(context, msg) : this.pino.error(msg)
    this.emitLog('error', msg, context)
  }

  /** Log at `fatal` level (most severe). */
  fatal(msg: string, context?: Record<string, unknown>): void {
    context ? this.pino.fatal(context, msg) : this.pino.fatal(msg)
    this.emitLog('fatal', msg, context)
  }

  /** Emit a log event for devtools/observability consumers. Fire-and-forget. */
  private emitLog(level: string, msg: string, context?: Record<string, unknown>): void {
    if (Emitter.listenerCount('log:entry') === 0) return
    Emitter.emit('log:entry', { level, msg, context }).catch(() => {})
  }

  /**
   * Read the `logging.sinks` configuration and instantiate every enabled sink
   * whose name matches an entry in {@link sinkRegistry}.
   */
  private buildSinks(): LogSink[] {
    const sinks: LogSink[] = []
    const sinksConfig = this.config.get('logging.sinks', {}) as Record<string, SinkConfig>

    for (const [name, sinkConfig] of Object.entries(sinksConfig)) {
      if (!sinkConfig.enabled) continue

      const SinkClass = sinkRegistry[name]
      if (SinkClass) {
        sinks.push(new SinkClass(sinkConfig))
      }
    }

    return sinks
  }
}
