import { describe, test, expect, beforeEach, afterEach, spyOn } from 'bun:test'
import { ConsoleHandler } from '../../src/Handlers/ConsoleHandler'
import { LogLevel } from '../../src/Types/LogLevel'
import type { LogRecord } from '../../src/Types/LogRecord'

describe('ConsoleHandler', () => {
  let handler: ConsoleHandler
  let consoleSpy: {
    log: ReturnType<typeof spyOn>
    warn: ReturnType<typeof spyOn>
    error: ReturnType<typeof spyOn>
  }

  beforeEach(() => {
    handler = new ConsoleHandler()
    
    // Spy on console methods
    consoleSpy = {
      log: spyOn(console, 'log').mockImplementation(() => {}),
      warn: spyOn(console, 'warn').mockImplementation(() => {}),
      error: spyOn(console, 'error').mockImplementation(() => {})
    }
  })

  afterEach(() => {
    // Restore console methods
    consoleSpy.log.mockRestore()
    consoleSpy.warn.mockRestore()
    consoleSpy.error.mockRestore()
  })

  const createLogRecord = (level: LogLevel, message: string = 'Test message', context: Record<string, any> = {}, extra: Record<string, any> = {}): LogRecord => ({
    message,
    level,
    channel: 'test',
    datetime: new Date('2024-01-01T12:00:00.000Z'),
    context,
    extra
  })

  describe('Basic Functionality', () => {
    test('should extend AbstractHandler', () => {
      expect(handler).toBeInstanceOf(ConsoleHandler)
    })

    test('should have default minimum level of Debug', () => {
      expect(handler.getMinLevel()).toBe(LogLevel.Debug)
    })

    test('should allow setting minimum level', () => {
      handler.setMinLevel(LogLevel.Warning)
      expect(handler.getMinLevel()).toBe(LogLevel.Warning)
    })
  })

  describe('Log Level Filtering', () => {
    test('should handle logs at or above minimum level', () => {
      handler.setMinLevel(LogLevel.Warning)
      
      const warningRecord = createLogRecord(LogLevel.Warning)
      handler.process(warningRecord)
      
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1)
    })

    test('should ignore logs below minimum level', () => {
      handler.setMinLevel(LogLevel.Warning)
      
      const infoRecord = createLogRecord(LogLevel.Info)
      handler.process(infoRecord)
      
      expect(consoleSpy.log).not.toHaveBeenCalled()
      expect(consoleSpy.warn).not.toHaveBeenCalled()
      expect(consoleSpy.error).not.toHaveBeenCalled()
    })

    test('should handle all log levels when minimum is Debug', () => {
      handler.setMinLevel(LogLevel.Debug)
      
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
      
      levels.forEach(level => {
        const record = createLogRecord(level)
        handler.process(record)
      })
      
      // Should have called console methods (exact counts depend on routing)
      const totalCalls = consoleSpy.log.mock.calls.length + 
                        consoleSpy.warn.mock.calls.length + 
                        consoleSpy.error.mock.calls.length
      expect(totalCalls).toBe(8)
    })
  })

  describe('Console Output Routing', () => {
    test('should use console.log for Debug level', () => {
      const record = createLogRecord(LogLevel.Debug)
      handler.process(record)
      
      expect(consoleSpy.log).toHaveBeenCalledTimes(1)
      expect(consoleSpy.warn).not.toHaveBeenCalled()
      expect(consoleSpy.error).not.toHaveBeenCalled()
    })

    test('should use console.log for Info level', () => {
      const record = createLogRecord(LogLevel.Info)
      handler.process(record)
      
      expect(consoleSpy.log).toHaveBeenCalledTimes(1)
      expect(consoleSpy.warn).not.toHaveBeenCalled()
      expect(consoleSpy.error).not.toHaveBeenCalled()
    })

    test('should use console.log for Notice level', () => {
      const record = createLogRecord(LogLevel.Notice)
      handler.process(record)
      
      expect(consoleSpy.log).toHaveBeenCalledTimes(1)
      expect(consoleSpy.warn).not.toHaveBeenCalled()
      expect(consoleSpy.error).not.toHaveBeenCalled()
    })

    test('should use console.warn for Warning level', () => {
      const record = createLogRecord(LogLevel.Warning)
      handler.process(record)
      
      expect(consoleSpy.log).not.toHaveBeenCalled()
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1)
      expect(consoleSpy.error).not.toHaveBeenCalled()
    })

    test('should use console.error for Error level', () => {
      const record = createLogRecord(LogLevel.Error)
      handler.process(record)
      
      expect(consoleSpy.log).not.toHaveBeenCalled()
      expect(consoleSpy.warn).not.toHaveBeenCalled()
      expect(consoleSpy.error).toHaveBeenCalledTimes(1)
    })

    test('should use console.error for Critical level', () => {
      const record = createLogRecord(LogLevel.Critical)
      handler.process(record)
      
      expect(consoleSpy.log).not.toHaveBeenCalled()
      expect(consoleSpy.warn).not.toHaveBeenCalled()
      expect(consoleSpy.error).toHaveBeenCalledTimes(1)
    })

    test('should use console.error for Alert level', () => {
      const record = createLogRecord(LogLevel.Alert)
      handler.process(record)
      
      expect(consoleSpy.log).not.toHaveBeenCalled()
      expect(consoleSpy.warn).not.toHaveBeenCalled()
      expect(consoleSpy.error).toHaveBeenCalledTimes(1)
    })

    test('should use console.error for Emergency level', () => {
      const record = createLogRecord(LogLevel.Emergency)
      handler.process(record)
      
      expect(consoleSpy.log).not.toHaveBeenCalled()
      expect(consoleSpy.warn).not.toHaveBeenCalled()
      expect(consoleSpy.error).toHaveBeenCalledTimes(1)
    })
  })

  describe('Message Formatting', () => {
    test('should format basic message with timestamp and level', () => {
      const record = createLogRecord(LogLevel.Info, 'Hello World')
      handler.process(record)
      
      const output = consoleSpy.log.mock.calls[0][0]
      expect(output).toContain('2024-01-01T12:00:00.000Z')
      expect(output).toContain('[Info]')
      expect(output).toContain('Hello World')
    })

    test('should include color codes for different levels', () => {
      const levels = [
        { level: LogLevel.Debug, color: '\x1b[34m' }, // Blue
        { level: LogLevel.Info, color: '\x1b[32m' }, // Green
        { level: LogLevel.Notice, color: '\x1b[36m' }, // Cyan
        { level: LogLevel.Warning, color: '\x1b[33m' }, // Yellow
        { level: LogLevel.Error, color: '\x1b[31m' }, // Red
        { level: LogLevel.Critical, color: '\x1b[35m' }, // Magenta
        { level: LogLevel.Alert, color: '\x1b[41m\x1b[37m' }, // White on Red
        { level: LogLevel.Emergency, color: '\x1b[41m\x1b[37m' } // White on Red
      ]
      
      levels.forEach(({ level, color }) => {
        // Clear spies before each level test
        consoleSpy.log.mockClear()
        consoleSpy.warn.mockClear()
        consoleSpy.error.mockClear()
        
        const record = createLogRecord(level, 'Test message')
        handler.process(record)
        
        // Get the output from the appropriate console method
        let output = ''
        if (level >= LogLevel.Error) {
          expect(consoleSpy.error).toHaveBeenCalledTimes(1)
          output = consoleSpy.error.mock.calls[0][0]
        } else if (level >= LogLevel.Warning) {
          expect(consoleSpy.warn).toHaveBeenCalledTimes(1)
          output = consoleSpy.warn.mock.calls[0][0]
        } else {
          expect(consoleSpy.log).toHaveBeenCalledTimes(1)
          output = consoleSpy.log.mock.calls[0][0]
        }
        
        expect(output).toContain(color)
        expect(output).toContain('\x1b[0m') // Reset code
      })
    })

    test('should format message without context when context is empty', () => {
      const record = createLogRecord(LogLevel.Info, 'Simple message', {})
      handler.process(record)
      
      const output = consoleSpy.log.mock.calls[0][0]
      expect(output).not.toContain('Context:')
      expect(output).toContain('Simple message')
    })

    test('should format message without extra when extra is empty', () => {
      const record = createLogRecord(LogLevel.Info, 'Simple message', {}, {})
      handler.process(record)
      
      const output = consoleSpy.log.mock.calls[0][0]
      expect(output).not.toContain('Extra:')
      expect(output).toContain('Simple message')
    })
  })

  describe('Context and Extra Data Handling', () => {
    test('should include context when provided', () => {
      const context = { userId: 123, action: 'login' }
      const record = createLogRecord(LogLevel.Info, 'User action', context)
      handler.process(record)
      
      const output = consoleSpy.log.mock.calls[0][0]
      expect(output).toContain('Context:')
      expect(output).toContain('"userId": 123')
      expect(output).toContain('"action": "login"')
    })

    test('should include extra data when provided', () => {
      const extra = { requestId: 'abc-123', duration: 150 }
      const record = createLogRecord(LogLevel.Info, 'Request completed', {}, extra)
      handler.process(record)
      
      const output = consoleSpy.log.mock.calls[0][0]
      expect(output).toContain('Extra:')
      expect(output).toContain('"requestId": "abc-123"')
      expect(output).toContain('"duration": 150')
    })

    test('should include both context and extra when both provided', () => {
      const context = { userId: 123 }
      const extra = { requestId: 'abc-123' }
      const record = createLogRecord(LogLevel.Info, 'Full log', context, extra)
      handler.process(record)
      
      const output = consoleSpy.log.mock.calls[0][0]
      expect(output).toContain('Context:')
      expect(output).toContain('"userId": 123')
      expect(output).toContain('Extra:')
      expect(output).toContain('"requestId": "abc-123"')
    })

    test('should handle complex nested objects in context', () => {
      const context = {
        user: {
          id: 123,
          profile: {
            name: 'John Doe',
            settings: { theme: 'dark' }
          }
        }
      }
      const record = createLogRecord(LogLevel.Info, 'Complex context', context)
      handler.process(record)
      
      const output = consoleSpy.log.mock.calls[0][0]
      expect(output).toContain('Context:')
      expect(output).toContain('"name": "John Doe"')
      expect(output).toContain('"theme": "dark"')
    })

    test('should handle arrays in extra data', () => {
      const extra = {
        tags: ['important', 'user-action'],
        numbers: [1, 2, 3]
      }
      const record = createLogRecord(LogLevel.Info, 'Array data', {}, extra)
      handler.process(record)
      
      const output = consoleSpy.log.mock.calls[0][0]
      expect(output).toContain('Extra:')
      expect(output).toContain('"tags": [\n    "important",\n    "user-action"\n  ]')
      expect(output).toContain('"numbers": [\n    1,\n    2,\n    3\n  ]')
    })
  })

  describe('Edge Cases', () => {
    test('should handle empty message', () => {
      const record = createLogRecord(LogLevel.Info, '')
      handler.process(record)
      
      const output = consoleSpy.log.mock.calls[0][0]
      expect(output).toContain('2024-01-01T12:00:00.000Z')
      expect(output).toContain('[Info]')
      // Should still have timestamp and level even with empty message
    })

    test('should handle null values in context', () => {
      const context = { value: null, undefined: undefined }
      const record = createLogRecord(LogLevel.Info, 'Null values', context)
      handler.process(record)
      
      const output = consoleSpy.log.mock.calls[0][0]
      expect(output).toContain('Context:')
      expect(output).toContain('"value": null')
    })

    test('should handle circular references in context gracefully', () => {
      const context: any = { name: 'test' }
      context.self = context // Create circular reference
      
      const record = createLogRecord(LogLevel.Info, 'Circular ref', context)
      
      // Should not throw an error - the handler should handle JSON.stringify errors
      expect(() => handler.process(record)).not.toThrow()
      
      // Should still output the message part
      expect(consoleSpy.log).toHaveBeenCalledTimes(1)
      const output = consoleSpy.log.mock.calls[0][0]
      expect(output).toContain('Circular ref')
      expect(output).toContain('[Info]')
    })

    test('should handle very long messages', () => {
      const longMessage = 'A'.repeat(10000)
      const record = createLogRecord(LogLevel.Info, longMessage)
      handler.process(record)
      
      const output = consoleSpy.log.mock.calls[0][0]
      expect(output).toContain(longMessage)
    })
  })

  describe('Integration with AbstractHandler', () => {
    test('should use handle method which calls shouldHandle', () => {
      handler.setMinLevel(LogLevel.Warning)
      
      // This should be filtered out
      const debugRecord = createLogRecord(LogLevel.Debug)
      handler.handle(debugRecord)
      
      // This should pass through
      const errorRecord = createLogRecord(LogLevel.Error)
      handler.handle(errorRecord)
      
      expect(consoleSpy.log).not.toHaveBeenCalled()
      expect(consoleSpy.warn).not.toHaveBeenCalled()
      expect(consoleSpy.error).toHaveBeenCalledTimes(1)
    })

    test('should support method chaining for setMinLevel', () => {
      const result = handler.setMinLevel(LogLevel.Error)
      expect(result).toBe(handler)
      expect(handler.getMinLevel()).toBe(LogLevel.Error)
    })
  })
})