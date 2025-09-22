import { LogLevel } from './LogLevel'

/**
 * Describes a log record.
 */
export interface LogRecord {
  /**
   * The log message.
   */
  message: string

  /**
   * The log level.
   */
  level: LogLevel

  /**
   * The log channel.
   */
  channel: string

  /**
   * The date and time of the log record.
   */
  datetime: Date

  /**
   * The log context.
   */
  context: Record<string, any>

  /**
   * The extra data.
   */
  extra: Record<string, any>
}
