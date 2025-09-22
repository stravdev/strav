import { LogLevel } from '../Types/LogLevel'

/**
 * Describes a logger instance.
 */
export interface Logger {
  /**
   * Adds a log record.
   *
   * @param level The log level.
   * @param message The log message.
   * @param context The log context.
   */
  log(level: LogLevel, message: string, context?: Record<string, any>): void

  /**
   * Adds a debug log record.
   *
   * @param message The log message.
   * @param context The log context.
   */
  debug(message: string, context?: Record<string, any>): void

  /**
   * Adds an info log record.
   *
   * @param message The log message.
   * @param context The log context.
   */
  info(message: string, context?: Record<string, any>): void

  /**
   * Adds a notice log record.
   *
   * @param message The log message.
   * @param context The log context.
   */
  notice(message: string, context?: Record<string, any>): void

  /**
   * Adds a warning log record.
   *
   * @param message The log message.
   * @param context The log context.
   */
  warning(message: string, context?: Record<string, any>): void

  /**
   * Adds an error log record.
   *
   * @param message The log message.
   * @param context The log context.
   */
  error(message: string, context?: Record<string, any>): void

  /**
   * Adds a critical log record.
   *
   * @param message The log message.
   * @param context The log context.
   */
  critical(message: string, context?: Record<string, any>): void

  /**
   * Adds an alert log record.
   *
   * @param message The log message.
   * @param context The log context.
   */
  alert(message: string, context?: Record<string, any>): void

  /**
   * Adds an emergency log record.
   *
   * @param message The log message.
   * @param context The log context.
   */
  emergency(message: string, context?: Record<string, any>): void
}
