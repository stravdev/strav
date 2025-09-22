import type { Handler } from '../Contracts/Handler'
import type { LogRecord } from '../Types/LogRecord'
import { LogLevel } from '../Types/LogLevel'

/**
 * Abstract base handler class that all specific handlers will extend
 */
export abstract class AbstractHandler implements Handler {
  /**
   * The minimum log level this handler will process
   */
  protected minLevel: LogLevel = LogLevel.Debug

  /**
   * Set the minimum log level this handler will process
   */
  public setMinLevel(level: LogLevel): this {
    this.minLevel = level
    return this
  }

  /**
   * Get the minimum log level this handler will process
   */
  public getMinLevel(): LogLevel {
    return this.minLevel
  }

  /**
   * Check if the handler should handle this record based on its level
   */
  protected shouldHandle(record: LogRecord): boolean {
    // Compare numeric values of the enum
    return record.level >= this.minLevel
  }

  /**
   * Handle a log record
   */
  public handle(record: LogRecord): void {
    if (this.shouldHandle(record)) {
      this.process(record)
    }
  }

  /**
   * Process the log record
   * This method must be implemented by specific handlers
   */
  protected abstract process(record: LogRecord): void
}
