import type { Logger } from './Logger'

/**
 * Describes a logger manager instance.
 */
export interface LoggerManager {
  /**
   * Get a logger instance for a specific channel.
   *
   * @param name The name of the channel.
   */
  channel(name: string): Logger
}
