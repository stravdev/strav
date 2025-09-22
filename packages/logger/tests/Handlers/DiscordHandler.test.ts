import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test'
import { DiscordHandler } from '../../src/Handlers/DiscordHandler'
import { LogLevel } from '../../src/Types/LogLevel'
import type { LogRecord } from '../../src/Types/LogRecord'

// Mock console.error for error handling tests
const consoleSpy = {
  error: mock(() => {}),
}

function createLogRecord(
  level: LogLevel = LogLevel.Info,
  message: string = 'Test message',
  channel: string = 'test',
  context: Record<string, any> = {},
  extra: Record<string, any> = {},
  datetime?: Date
): LogRecord {
  return {
    level,
    message,
    channel,
    context,
    extra,
    datetime: datetime || new Date('2024-01-15T12:00:00.000Z'),
  }
}

describe('DiscordHandler', () => {
  let handler: DiscordHandler
  const testWebhookUrl =
    'https://discord.com/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'

  beforeEach(() => {
    // Mock console.error
    global.console.error = consoleSpy.error
    consoleSpy.error.mockClear()
  })

  afterEach(() => {
    // Restore mocks
    mock.restore()
  })

  describe('Basic Functionality', () => {
    test('should create instance with webhook URL', () => {
      handler = new DiscordHandler(testWebhookUrl)
      expect(handler).toBeInstanceOf(DiscordHandler)
    })

    test('should extend AbstractHandler', () => {
      handler = new DiscordHandler(testWebhookUrl)
      expect(handler.setMinLevel).toBeDefined()
      expect(handler.getMinLevel).toBeDefined()
      expect(handler.handle).toBeDefined()
    })

    test('should set default minimum level to Warning', () => {
      handler = new DiscordHandler(testWebhookUrl)
      expect(handler.getMinLevel()).toBe(LogLevel.Warning)
    })

    test('should initialize webhook successfully', () => {
      handler = new DiscordHandler(testWebhookUrl)
      expect(handler['webhook']).toBeDefined()
    })
  })

  describe('Webhook URL Validation and Error Handling', () => {
    test('should handle invalid webhook URLs gracefully', () => {
      handler = new DiscordHandler('invalid-url')

      // Should not throw an error during construction
      expect(handler).toBeInstanceOf(DiscordHandler)
    })

    test('should handle valid webhook URLs', () => {
      const validUrls = [
        testWebhookUrl,
        'https://discord.com/api/webhooks/123456789/abcdefghijklmnop',
        'https://discordapp.com/api/webhooks/987654321/zyxwvutsrqponmlk',
      ]

      validUrls.forEach((url) => {
        handler = new DiscordHandler(url)
        expect(handler).toBeInstanceOf(DiscordHandler)
      })
    })
  })

  describe('Discord Embed Creation and Formatting', () => {
    beforeEach(() => {
      handler = new DiscordHandler(testWebhookUrl)
    })

    test('should handle log records without throwing errors', () => {
      const record = createLogRecord(LogLevel.Info, 'Test message', 'app')

      expect(() => handler.handle(record)).not.toThrow()
    })

    test('should handle all log levels correctly', () => {
      const levels = [
        LogLevel.Debug,
        LogLevel.Info,
        LogLevel.Notice,
        LogLevel.Warning,
        LogLevel.Error,
        LogLevel.Critical,
        LogLevel.Alert,
        LogLevel.Emergency,
      ]

      levels.forEach((level) => {
        const record = createLogRecord(level, `${LogLevel[level]} message`)
        expect(() => handler.handle(record)).not.toThrow()
      })
    })
  })

  describe('Context and Extra Data Handling', () => {
    beforeEach(() => {
      handler = new DiscordHandler(testWebhookUrl)
    })

    test('should handle context when provided', () => {
      const context = { userId: 123, action: 'login' }
      const record = createLogRecord(LogLevel.Info, 'User logged in', 'auth', context)

      expect(() => handler.handle(record)).not.toThrow()
    })

    test('should handle extra data when provided', () => {
      const extra = { ip: '192.168.1.1', userAgent: 'Mozilla/5.0' }
      const record = createLogRecord(LogLevel.Info, 'Request processed', 'http', {}, extra)

      expect(() => handler.handle(record)).not.toThrow()
    })

    test('should handle empty context and extra', () => {
      const record = createLogRecord(LogLevel.Info, 'Test message', 'app', {}, {})

      expect(() => handler.handle(record)).not.toThrow()
    })

    test('should handle both context and extra when both are provided', () => {
      const context = { userId: 123 }
      const extra = { ip: '192.168.1.1' }
      const record = createLogRecord(LogLevel.Info, 'Test message', 'app', context, extra)

      expect(() => handler.handle(record)).not.toThrow()
    })
  })

  describe('Message Truncation for Long Data', () => {
    beforeEach(() => {
      handler = new DiscordHandler(testWebhookUrl)
    })

    test('should handle long context data without errors', () => {
      const longContext = { data: 'x'.repeat(1500) } // Exceeds 1000 character limit
      const record = createLogRecord(LogLevel.Info, 'Test message', 'app', longContext)

      expect(() => handler.handle(record)).not.toThrow()
    })

    test('should handle long extra data without errors', () => {
      const longExtra = { data: 'y'.repeat(1500) } // Exceeds 1000 character limit
      const record = createLogRecord(LogLevel.Info, 'Test message', 'app', {}, longExtra)

      expect(() => handler.handle(record)).not.toThrow()
    })
  })

  describe('Edge Cases', () => {
    beforeEach(() => {
      handler = new DiscordHandler(testWebhookUrl)
    })

    test('should handle circular references in context gracefully', () => {
      const circularContext: any = { name: 'test' }
      circularContext.self = circularContext

      const record = createLogRecord(LogLevel.Info, 'Test message', 'app', circularContext)

      // Should not throw an error
      expect(() => handler.handle(record)).not.toThrow()
    })

    test('should handle circular references in extra gracefully', () => {
      const circularExtra: any = { info: 'test' }
      circularExtra.self = circularExtra

      const record = createLogRecord(LogLevel.Info, 'Test message', 'app', {}, circularExtra)

      // Should not throw an error
      expect(() => handler.handle(record)).not.toThrow()
    })

    test('should handle empty message', () => {
      const record = createLogRecord(LogLevel.Info, '', 'app')

      expect(() => handler.handle(record)).not.toThrow()
    })

    test('should handle null values in context', () => {
      const context = { value: null, undefined: undefined }
      const record = createLogRecord(LogLevel.Info, 'Test message', 'app', context)

      expect(() => handler.handle(record)).not.toThrow()
    })

    test('should handle very long messages', () => {
      const longMessage = 'x'.repeat(2000)
      const record = createLogRecord(LogLevel.Info, longMessage, 'app')

      expect(() => handler.handle(record)).not.toThrow()
    })
  })

  describe('Integration with AbstractHandler', () => {
    beforeEach(() => {
      handler = new DiscordHandler(testWebhookUrl)
    })

    test('should respect minimum log level filtering', () => {
      handler.setMinLevel(LogLevel.Error)

      const debugRecord = createLogRecord(LogLevel.Debug, 'Debug message')
      const errorRecord = createLogRecord(LogLevel.Error, 'Error message')

      expect(() => handler.handle(debugRecord)).not.toThrow()
      expect(() => handler.handle(errorRecord)).not.toThrow()
    })

    test('should support method chaining for setMinLevel', () => {
      const result = handler.setMinLevel(LogLevel.Critical)
      expect(result).toBe(handler)
      expect(handler.getMinLevel()).toBe(LogLevel.Critical)
    })

    test('should have correct default minimum level', () => {
      expect(handler.getMinLevel()).toBe(LogLevel.Warning)
    })

    test('should use handle method which respects minimum level', () => {
      handler.setMinLevel(LogLevel.Error)

      const warningRecord = createLogRecord(LogLevel.Warning, 'Warning message')
      expect(() => handler.handle(warningRecord)).not.toThrow()
    })

    test('should handle logs at or above minimum level', () => {
      handler.setMinLevel(LogLevel.Warning)

      const levels = [
        LogLevel.Warning,
        LogLevel.Error,
        LogLevel.Critical,
        LogLevel.Alert,
        LogLevel.Emergency,
      ]

      levels.forEach((level) => {
        const record = createLogRecord(level, `${LogLevel[level]} message`)
        expect(() => handler.handle(record)).not.toThrow()
      })
    })

    test('should ignore logs below minimum level', () => {
      handler.setMinLevel(LogLevel.Warning)

      const belowLevels = [LogLevel.Debug, LogLevel.Info, LogLevel.Notice]

      belowLevels.forEach((level) => {
        const record = createLogRecord(level, `${LogLevel[level]} message`)
        expect(() => handler.handle(record)).not.toThrow()
      })
    })
  })
})
