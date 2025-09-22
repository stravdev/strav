import type { Handler } from '../Contracts/Handler'
import type { Logger } from '../Contracts/Logger'
import type { LogRecord } from '../Types/LogRecord'
import { LogLevel } from '../Types/LogLevel'

/**
 * Channel class for handling logs for a specific channel
 */
export class Channel implements Logger {
  /**
   * The name of the channel
   */
  protected name: string

  /**
   * The handlers registered for this channel
   */
  protected handlers: Handler[] = []

  /**
   * Create a new channel instance
   */
  constructor(name: string, handlers: Handler[] = []) {
    this.name = name
    this.handlers = handlers
  }

  /**
   * Add a handler to the channel
   */
  public addHandler(handler: Handler): this {
    this.handlers.push(handler)
    return this
  }

  /**
   * Get the handlers for this channel
   */
  public getHandlers(): Handler[] {
    return [...this.handlers]
  }

  /**
   * Get the name of the channel
   */
  public getName(): string {
    return this.name
  }

  /**
   * Log a message with the specified level
   */
  public log(
    level: LogLevel,
    message: string,
    context: Record<string, any> = {},
    extra: Record<string, any> = {}
  ): void {
    const record: LogRecord = {
      message,
      level,
      channel: this.name,
      datetime: new Date(),
      context,
      extra,
    }

    this.processRecord(record)
  }

  /**
   * Process a log record through all handlers
   */
  protected processRecord(record: LogRecord): void {
    for (const handler of this.handlers) {
      handler.handle(record)
    }
  }

  /**
   * Log a debug message
   */
  public debug(
    message: string,
    context: Record<string, any> = {},
    extra: Record<string, any> = {}
  ): void {
    this.log(LogLevel.Debug, message, context, extra)
  }

  /**
   * Log an info message
   */
  public info(
    message: string,
    context: Record<string, any> = {},
    extra: Record<string, any> = {}
  ): void {
    this.log(LogLevel.Info, message, context, extra)
  }

  /**
   * Log a notice message
   */
  public notice(
    message: string,
    context: Record<string, any> = {},
    extra: Record<string, any> = {}
  ): void {
    this.log(LogLevel.Notice, message, context, extra)
  }

  /**
   * Log a warning message
   */
  public warning(
    message: string,
    context: Record<string, any> = {},
    extra: Record<string, any> = {}
  ): void {
    this.log(LogLevel.Warning, message, context, extra)
  }

  /**
   * Log an error message
   */
  public error(
    message: string,
    context: Record<string, any> = {},
    extra: Record<string, any> = {}
  ): void {
    this.log(LogLevel.Error, message, context, extra)
  }

  /**
   * Log a critical message
   */
  public critical(
    message: string,
    context: Record<string, any> = {},
    extra: Record<string, any> = {}
  ): void {
    this.log(LogLevel.Critical, message, context, extra)
  }

  /**
   * Log an alert message
   */
  public alert(
    message: string,
    context: Record<string, any> = {},
    extra: Record<string, any> = {}
  ): void {
    this.log(LogLevel.Alert, message, context, extra)
  }

  /**
   * Log an emergency message
   */
  public emergency(
    message: string,
    context: Record<string, any> = {},
    extra: Record<string, any> = {}
  ): void {
    this.log(LogLevel.Emergency, message, context, extra)
  }
}
