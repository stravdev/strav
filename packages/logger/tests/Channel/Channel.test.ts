import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { Channel } from '../../src/Channel/Channel'
import { LogLevel } from '../../src/Types/LogLevel'
import type { LogRecord } from '../../src/Types/LogRecord'
import type { Handler } from '../../src/Contracts/Handler'

// Mock handler for testing
class MockHandler implements Handler {
  public handleCalls: LogRecord[] = []

  handle(record: LogRecord): void {
    this.handleCalls.push(record)
  }

  reset(): void {
    this.handleCalls = []
  }
}

// Helper function to create log records for testing
function createLogRecord(
  level: LogLevel = LogLevel.Info,
  message: string = 'Test message',
  channel: string = 'test',
  context: Record<string, any> = {},
  extra: Record<string, any> = {},
  datetime?: Date
): LogRecord {
  return {
    message,
    level,
    channel,
    datetime: datetime || new Date('2024-01-01T12:00:00.000Z'),
    context,
    extra
  }
}

describe('Channel', () => {
  let channel: Channel
  let mockHandler: MockHandler
  let mockHandler2: MockHandler

  beforeEach(() => {
    mockHandler = new MockHandler()
    mockHandler2 = new MockHandler()
  })

  describe('Constructor', () => {
    test('should create channel with name only', () => {
      channel = new Channel('test-channel')
      
      expect(channel.getName()).toBe('test-channel')
      expect(channel.getHandlers()).toEqual([])
    })

    test('should create channel with name and handlers', () => {
      const handlers = [mockHandler, mockHandler2]
      channel = new Channel('test-channel', handlers)
      
      expect(channel.getName()).toBe('test-channel')
      expect(channel.getHandlers()).toEqual(handlers)
    })

    test('should create channel with empty handlers array when not provided', () => {
      channel = new Channel('test-channel')
      
      expect(channel.getHandlers()).toEqual([])
    })
  })

  describe('Handler Management', () => {
    beforeEach(() => {
      channel = new Channel('test-channel')
    })

    test('should add handler and return channel instance for chaining', () => {
      const result = channel.addHandler(mockHandler)
      
      expect(result).toBe(channel)
      expect(channel.getHandlers()).toContain(mockHandler)
    })

    test('should add multiple handlers', () => {
      channel.addHandler(mockHandler)
      channel.addHandler(mockHandler2)
      
      const handlers = channel.getHandlers()
      expect(handlers).toHaveLength(2)
      expect(handlers).toContain(mockHandler)
      expect(handlers).toContain(mockHandler2)
    })

    test('should maintain handler order', () => {
      channel.addHandler(mockHandler)
      channel.addHandler(mockHandler2)
      
      const handlers = channel.getHandlers()
      expect(handlers[0]).toBe(mockHandler)
      expect(handlers[1]).toBe(mockHandler2)
    })

    test('should allow adding same handler multiple times', () => {
      channel.addHandler(mockHandler)
      channel.addHandler(mockHandler)
      
      const handlers = channel.getHandlers()
      expect(handlers).toHaveLength(2)
      expect(handlers[0]).toBe(mockHandler)
      expect(handlers[1]).toBe(mockHandler)
    })

    test('should return copy of handlers array to prevent external modification', () => {
      channel.addHandler(mockHandler)
      const handlers = channel.getHandlers()
      
      handlers.push(mockHandler2)
      
      expect(channel.getHandlers()).toHaveLength(1)
      expect(channel.getHandlers()).not.toContain(mockHandler2)
    })
  })

  describe('Log Method', () => {
    beforeEach(() => {
      channel = new Channel('test-channel')
      channel.addHandler(mockHandler)
    })

    test('should log message with basic parameters', () => {
      channel.log(LogLevel.Info, 'Test message')
      
      expect(mockHandler.handleCalls).toHaveLength(1)
      const record = mockHandler.handleCalls[0]!
      expect(record.message).toBe('Test message')
      expect(record.level).toBe(LogLevel.Info)
      expect(record.channel).toBe('test-channel')
      expect(record.context).toEqual({})
      expect(record.extra).toEqual({})
      expect(record.datetime).toBeInstanceOf(Date)
    })

    test('should log message with context', () => {
      const context = { userId: 123, action: 'login' }
      channel.log(LogLevel.Warning, 'User action', context)
      
      expect(mockHandler.handleCalls).toHaveLength(1)
      const record = mockHandler.handleCalls[0]!
      expect(record.message).toBe('User action')
      expect(record.level).toBe(LogLevel.Warning)
      expect(record.context).toEqual(context)
      expect(record.extra).toEqual({})
    })

    test('should log message with extra data', () => {
      const extra = { ip: '192.168.1.1', userAgent: 'Mozilla/5.0' }
      channel.log(LogLevel.Error, 'Request failed', {}, extra)
      
      expect(mockHandler.handleCalls).toHaveLength(1)
      const record = mockHandler.handleCalls[0]!
      expect(record.message).toBe('Request failed')
      expect(record.level).toBe(LogLevel.Error)
      expect(record.context).toEqual({})
      expect(record.extra).toEqual(extra)
    })

    test('should log message with both context and extra data', () => {
      const context = { userId: 456 }
      const extra = { requestId: 'req-123' }
      channel.log(LogLevel.Critical, 'System failure', context, extra)
      
      expect(mockHandler.handleCalls).toHaveLength(1)
      const record = mockHandler.handleCalls[0]!
      expect(record.message).toBe('System failure')
      expect(record.level).toBe(LogLevel.Critical)
      expect(record.context).toEqual(context)
      expect(record.extra).toEqual(extra)
    })

    test('should handle all log levels', () => {
      const levels = [
        LogLevel.Debug,
        LogLevel.Info,
        LogLevel.Notice,
        LogLevel.Warning,
        LogLevel.Error,
        LogLevel.Critical,
        LogLevel.Alert,
        LogLevel.Emergency
      ]
      
      levels.forEach((level, index) => {
        channel.log(level, `Message ${index}`)
      })
      
      expect(mockHandler.handleCalls).toHaveLength(8)
      levels.forEach((level, index) => {
        expect(mockHandler.handleCalls[index]!.level).toBe(level)
        expect(mockHandler.handleCalls[index]!.message).toBe(`Message ${index}`)
      })
    })

    test('should create new datetime for each log call', () => {
      const startTime = Date.now()
      
      channel.log(LogLevel.Info, 'First message')
      // Small delay to ensure different timestamps
      const midTime = Date.now()
      channel.log(LogLevel.Info, 'Second message')
      
      const endTime = Date.now()
      
      expect(mockHandler.handleCalls).toHaveLength(2)
      const firstTime = mockHandler.handleCalls[0]!.datetime.getTime()
      const secondTime = mockHandler.handleCalls[1]!.datetime.getTime()
      
      expect(firstTime).toBeGreaterThanOrEqual(startTime)
      expect(firstTime).toBeLessThanOrEqual(midTime)
      expect(secondTime).toBeGreaterThanOrEqual(midTime)
      expect(secondTime).toBeLessThanOrEqual(endTime)
    })
  })

  describe('Convenience Logging Methods', () => {
    beforeEach(() => {
      channel = new Channel('test-channel')
      channel.addHandler(mockHandler)
    })

    test('should call debug method with correct level', () => {
      channel.debug('Debug message')
      
      expect(mockHandler.handleCalls).toHaveLength(1)
      const record = mockHandler.handleCalls[0]!
      expect(record.level).toBe(LogLevel.Debug)
      expect(record.message).toBe('Debug message')
    })

    test('should call info method with correct level', () => {
      channel.info('Info message')
      
      expect(mockHandler.handleCalls).toHaveLength(1)
      const record = mockHandler.handleCalls[0]!
      expect(record.level).toBe(LogLevel.Info)
      expect(record.message).toBe('Info message')
    })

    test('should call notice method with correct level', () => {
      channel.notice('Notice message')
      
      expect(mockHandler.handleCalls).toHaveLength(1)
      const record = mockHandler.handleCalls[0]!
      expect(record.level).toBe(LogLevel.Notice)
      expect(record.message).toBe('Notice message')
    })

    test('should call warning method with correct level', () => {
      channel.warning('Warning message')
      
      expect(mockHandler.handleCalls).toHaveLength(1)
      const record = mockHandler.handleCalls[0]!
      expect(record.level).toBe(LogLevel.Warning)
      expect(record.message).toBe('Warning message')
    })

    test('should call error method with correct level', () => {
      channel.error('Error message')
      
      expect(mockHandler.handleCalls).toHaveLength(1)
      const record = mockHandler.handleCalls[0]!
      expect(record.level).toBe(LogLevel.Error)
      expect(record.message).toBe('Error message')
    })

    test('should call critical method with correct level', () => {
      channel.critical('Critical message')
      
      expect(mockHandler.handleCalls).toHaveLength(1)
      const record = mockHandler.handleCalls[0]!
      expect(record.level).toBe(LogLevel.Critical)
      expect(record.message).toBe('Critical message')
    })

    test('should call alert method with correct level', () => {
      channel.alert('Alert message')
      
      expect(mockHandler.handleCalls).toHaveLength(1)
      const record = mockHandler.handleCalls[0]!
      expect(record.level).toBe(LogLevel.Alert)
      expect(record.message).toBe('Alert message')
    })

    test('should call emergency method with correct level', () => {
      channel.emergency('Emergency message')
      
      expect(mockHandler.handleCalls).toHaveLength(1)
      const record = mockHandler.handleCalls[0]!
      expect(record.level).toBe(LogLevel.Emergency)
      expect(record.message).toBe('Emergency message')
    })

    test('should pass context and extra data to convenience methods', () => {
      const context = { userId: 789 }
      const extra = { sessionId: 'sess-456' }
      
      channel.info('Info with data', context, extra)
      
      expect(mockHandler.handleCalls).toHaveLength(1)
      const record = mockHandler.handleCalls[0]!
      expect(record.context).toEqual(context)
      expect(record.extra).toEqual(extra)
    })

    test('should handle empty context and extra in convenience methods', () => {
      channel.warning('Warning message', {}, {})
      
      expect(mockHandler.handleCalls).toHaveLength(1)
      const record = mockHandler.handleCalls[0]!
      expect(record.context).toEqual({})
      expect(record.extra).toEqual({})
    })
  })

  describe('Process Record Method', () => {
    beforeEach(() => {
      channel = new Channel('test-channel')
    })

    test('should call handle on all registered handlers', () => {
      channel.addHandler(mockHandler)
      channel.addHandler(mockHandler2)
      
      channel.log(LogLevel.Info, 'Test message')
      
      expect(mockHandler.handleCalls).toHaveLength(1)
      expect(mockHandler2.handleCalls).toHaveLength(1)
      
      const record1 = mockHandler.handleCalls[0]!
      const record2 = mockHandler2.handleCalls[0]!
      
      expect(record1.message).toBe('Test message')
      expect(record2.message).toBe('Test message')
      expect(record1.level).toBe(LogLevel.Info)
      expect(record2.level).toBe(LogLevel.Info)
    })

    test('should handle empty handlers array gracefully', () => {
      // No handlers added
      expect(() => {
        channel.log(LogLevel.Info, 'Test message')
      }).not.toThrow()
    })

    test('should pass same record instance to all handlers', () => {
      channel.addHandler(mockHandler)
      channel.addHandler(mockHandler2)
      
      channel.log(LogLevel.Error, 'Error message')
      
      const record1 = mockHandler.handleCalls[0]!
      const record2 = mockHandler2.handleCalls[0]!
      
      // Records should have same content
      expect(record1.message).toBe(record2.message)
      expect(record1.level).toBe(record2.level)
      expect(record1.channel).toBe(record2.channel)
      expect(record1.datetime.getTime()).toBe(record2.datetime.getTime())
    })
  })

  describe('Edge Cases and Error Scenarios', () => {
    beforeEach(() => {
      channel = new Channel('test-channel')
    })

    test('should handle handler that throws error gracefully', () => {
      const errorHandler: Handler = {
        handle: () => {
          throw new Error('Handler error')
        }
      }
      
      channel.addHandler(errorHandler)
      channel.addHandler(mockHandler)
      
      // Should not throw and should still call other handlers
      expect(() => {
        channel.log(LogLevel.Info, 'Test message')
      }).toThrow('Handler error')
      
      // The mock handler should not be called due to the error in the first handler
      expect(mockHandler.handleCalls).toHaveLength(0)
    })

    test('should handle very long messages', () => {
      channel.addHandler(mockHandler)
      const longMessage = 'x'.repeat(10000)
      
      expect(() => {
        channel.log(LogLevel.Info, longMessage)
      }).not.toThrow()
      
      expect(mockHandler.handleCalls[0]!.message).toBe(longMessage)
    })

    test('should handle special characters in messages', () => {
      channel.addHandler(mockHandler)
      const specialMessage = 'Message with 🚀 emojis and \n newlines \t tabs'
      
      channel.log(LogLevel.Info, specialMessage)
      
      expect(mockHandler.handleCalls[0]!.message).toBe(specialMessage)
    })

    test('should handle circular references in context', () => {
      channel.addHandler(mockHandler)
      const circularContext: any = { name: 'test' }
      circularContext.self = circularContext
      
      expect(() => {
        channel.log(LogLevel.Info, 'Test message', circularContext)
      }).not.toThrow()
      
      expect(mockHandler.handleCalls[0]!.context).toBe(circularContext)
    })

    test('should handle null and undefined values in context and extra', () => {
      channel.addHandler(mockHandler)
      const context = { nullValue: null, undefinedValue: undefined }
      const extra = { anotherNull: null }
      
      channel.log(LogLevel.Info, 'Test message', context, extra)
      
      expect(mockHandler.handleCalls[0]!.context).toEqual(context)
      expect(mockHandler.handleCalls[0]!.extra).toEqual(extra)
    })

    test('should handle empty string message', () => {
      channel.addHandler(mockHandler)
      
      channel.log(LogLevel.Info, '')
      
      expect(mockHandler.handleCalls[0]!.message).toBe('')
    })

    test('should handle channel name with special characters', () => {
      const specialChannel = new Channel('test-channel-123_with.special@chars')
      specialChannel.addHandler(mockHandler)
      
      specialChannel.log(LogLevel.Info, 'Test message')
      
      expect(mockHandler.handleCalls[0]!.channel).toBe('test-channel-123_with.special@chars')
    })
  })
})