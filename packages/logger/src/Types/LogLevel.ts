/**
 * Describes the different log levels.
 *
 * The levels are ordered by severity, from least severe to most severe.
 */
export enum LogLevel {
  /**
   * Detailed debug information.
   */
  Debug = 100,

  /**
   * Interesting events.
   *
   * Examples: User logs in, SQL logs.
   */
  Info = 200,

  /**
   * Normal but significant events.
   */
  Notice = 250,

  /**
   * Exceptional occurrences that are not errors.
   *
   * Examples: Use of deprecated APIs, poor use of an API,
   * undesirable things that are not necessarily wrong.
   */
  Warning = 300,

  /**
   * Runtime errors that do not require immediate action but should typically
   * be logged and monitored.
   */
  Error = 400,

  /**
   * Critical conditions.
   *
   * Example: Application component unavailable, unexpected exception.
   */
  Critical = 500,

  /**
   * Action must be taken immediately.
   *
   * Example: Entire website down, database unavailable, etc.
   * This should trigger the SMS alerts and wake you up.
   */
  Alert = 550,

  /**
   * System is unusable.
   */
  Emergency = 600,
}