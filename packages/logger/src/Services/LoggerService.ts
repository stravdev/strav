import { Channel } from '../Channel/Channel'
import type { LoggerManager } from '../Contracts/LoggerManager'
import type { Logger } from '../Contracts/Logger'
import type { Handler } from '../Contracts/Handler'

/**
 * LoggerService class that implements the LoggerManager interface
 */
export class LoggerService implements LoggerManager {
  /**
   * The channels registered with this logger service
   */
  protected channels: Map<string, Channel> = new Map()

  /**
   * The default channel name
   */
  protected defaultChannel: string = 'app'

  /**
   * The default handlers to apply to new channels
   */
  protected defaultHandlers: Handler[] = []

  /**
   * Get a logger channel instance
   */
  public channel(name?: string): Logger {
    const channelName = name || this.defaultChannel

    // Create the channel if it doesn't exist
    if (!this.channels.has(channelName)) {
      this.channels.set(channelName, new Channel(channelName, [...this.defaultHandlers]))
    }

    return this.channels.get(channelName)!
  }

  /**
   * Set the default channel name
   */
  public setDefaultChannel(name: string): this {
    this.defaultChannel = name
    return this
  }

  /**
   * Get the default channel name
   */
  public getDefaultChannel(): string {
    return this.defaultChannel
  }

  /**
   * Add a default handler to be applied to all new channels
   */
  public addDefaultHandler(handler: Handler): this {
    this.defaultHandlers.push(handler)
    return this
  }

  /**
   * Get all registered channels
   */
  public getChannels(): Map<string, Channel> {
    return this.channels
  }

  /**
   * Add a handler to a specific channel
   */
  public addHandler(handler: Handler, channelName?: string): this {
    const channel = this.channel(channelName) as Channel
    channel.addHandler(handler)
    return this
  }
}
