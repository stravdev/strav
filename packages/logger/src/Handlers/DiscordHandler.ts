import { AbstractHandler } from './AbstractHandler'
import type { LogRecord } from '../Types/LogRecord'
import { LogLevel } from '../Types/LogLevel'
// @ts-ignore - discord-webhook-node doesn't have proper TypeScript declarations
import { Webhook, MessageBuilder } from 'discord-webhook-node'

/**
 * Discord handler for sending logs to Discord via webhook
 */
export class DiscordHandler extends AbstractHandler {
  /**
   * The Discord webhook instance
   */
  protected webhook: any | null = null

  /**
   * Create a new Discord handler
   */
  constructor(webhookUrl: string) {
    super()
    try {
      this.webhook = new Webhook(webhookUrl)
      // Set default minimum level to warning for Discord
      this.setMinLevel(LogLevel.Warning)
    } catch (error) {
      console.error('Failed to initialize Discord webhook:', error)
      this.webhook = null
    }
  }

  /**
   * Process a log record
   */
  public process(record: LogRecord): void {
    if (!this.shouldHandle(record) || !this.webhook) {
      return
    }

    try {
      const levelColors: Record<LogLevel, number> = {
        [LogLevel.Debug]: 0x7289da, // Discord Blurple
        [LogLevel.Info]: 0x3498db, // Blue
        [LogLevel.Notice]: 0x2ecc71, // Green
        [LogLevel.Warning]: 0xf1c40f, // Yellow
        [LogLevel.Error]: 0xe74c3c, // Red
        [LogLevel.Critical]: 0x992d22, // Dark Red
        [LogLevel.Alert]: 0x9b59b6, // Purple
        [LogLevel.Emergency]: 0x71368a, // Dark Purple
      }

      const levelName = LogLevel[record.level]
      const color = levelColors[record.level] || 0x7289da

      // Create the Discord embed
      const embed = new MessageBuilder()
        .setTitle(`${levelName}: ${record.message}`)
        .setColor(color)
        .setDescription(`Channel: ${record.channel}`)
        .setTimestamp()

      // Add context if available
      if (Object.keys(record.context).length > 0) {
        const contextString = JSON.stringify(record.context, null, 2)
        // Discord has a 1024 character limit for field values
        const truncatedContext =
          contextString.length > 1000 ? contextString.substring(0, 1000) + '...' : contextString
        embed.addField('Context', '```json\n' + truncatedContext + '\n```')
      }

      // Add extra data if available
      if (Object.keys(record.extra).length > 0) {
        const extraString = JSON.stringify(record.extra, null, 2)
        // Discord has a 1024 character limit for field values
        const truncatedExtra =
          extraString.length > 1000 ? extraString.substring(0, 1000) + '...' : extraString
        embed.addField('Extra', '```json\n' + truncatedExtra + '\n```')
      }

      // Send the webhook asynchronously
      this.webhook.send(embed).catch((error: any) => {
        console.error('Failed to send Discord webhook:', error)
        console.error(`Log record: ${levelName} - ${record.message}`)
      })
    } catch (error: any) {
      // Fallback to console if Discord webhook fails
      console.error('Failed to send Discord webhook:', error)
      console.error(`Log record: ${LogLevel[record.level]} - ${record.message}`)
    }
  }
}
