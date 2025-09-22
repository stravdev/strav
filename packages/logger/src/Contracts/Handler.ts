import type { LogRecord } from "../Types/LogRecord";

/**
 * Interface for all log handlers.
 */
export interface Handler {
  /**
   * Handles a log record.
   *
   * @param record The log record to handle.
   */
  handle(record: LogRecord): void
}
