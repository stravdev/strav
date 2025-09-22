import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test'
import * as fs from 'fs'
import * as path from 'path'
import { RotatingFileHandler } from '../../src/Handlers/RotatingFileHandler'
import { LogLevel } from '../../src/Types/LogLevel'
import type { LogRecord } from '../../src/Types/LogRecord'

// Mock fs module
const fsMock = {
  existsSync: mock(() => true),
  mkdirSync: mock(() => {}),
  appendFileSync: mock(() => {}),
}

// Helper function to create log records
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

describe('RotatingFileHandler', () => {
  let handler: RotatingFileHandler
  let baseFilePath: string
  let consoleSpy: any

  beforeEach(() => {
    // Setup test file path
    baseFilePath = '/tmp/test-logs/app.log'
    
    // Mock console.error for error handling tests
    consoleSpy = {
      error: mock(() => {})
    }
    global.console.error = consoleSpy.error

    // Mock fs functions
    mock.module('fs', () => fsMock)
    
    // Clear all mocks
    fsMock.existsSync.mockClear()
    fsMock.mkdirSync.mockClear()
    fsMock.appendFileSync.mockClear()
    consoleSpy.error.mockClear()
  })

  afterEach(() => {
    // Restore mocks
    mock.restore()
  })

  describe('Basic Functionality', () => {
    test('should create instance with base file path', () => {
      handler = new RotatingFileHandler(baseFilePath)
      expect(handler).toBeInstanceOf(RotatingFileHandler)
      expect(handler['baseFilePath']).toBe(baseFilePath)
    })

    test('should extend FileHandler', () => {
      handler = new RotatingFileHandler(baseFilePath)
      expect(handler.setMinLevel).toBeDefined()
      expect(handler.getMinLevel).toBeDefined()
      expect(handler.handle).toBeDefined()
    })

    test('should initialize with current date', () => {
      const mockDate = new Date('2024-01-15T10:30:00.000Z')
      const originalDate = Date
      global.Date = class extends Date {
        constructor() {
          super()
          return mockDate
        }
      } as any

      handler = new RotatingFileHandler(baseFilePath)
      expect(handler['currentDate']).toBe('2024-01-15')

      global.Date = originalDate
    })

    test('should set initial file path with date', () => {
      const mockDate = new Date('2024-01-15T10:30:00.000Z')
      const originalDate = Date
      global.Date = class extends Date {
        constructor() {
          super()
          return mockDate
        }
      } as any

      handler = new RotatingFileHandler('/tmp/logs/app.log')
      expect(handler['filePath']).toBe('/tmp/logs/app-2024-01-15.log')

      global.Date = originalDate
    })

    test('should create directory if it does not exist during initialization', () => {
      fsMock.existsSync.mockReturnValue(false)
      
      handler = new RotatingFileHandler(baseFilePath)
      
      expect(fsMock.existsSync).toHaveBeenCalled()
      expect(fsMock.mkdirSync).toHaveBeenCalled()
    })
  })

  describe('Date Formatting and Path Generation', () => {
    beforeEach(() => {
      handler = new RotatingFileHandler(baseFilePath)
    })

    test('should format date as YYYY-MM-DD', () => {
      const testDates = [
        { input: new Date('2024-01-01T00:00:00.000Z'), expected: '2024-01-01' },
        { input: new Date('2024-12-31T23:59:59.999Z'), expected: '2024-12-31' },
        { input: new Date('2023-06-15T12:30:45.123Z'), expected: '2023-06-15' },
        { input: new Date('2025-02-28T18:45:30.000Z'), expected: '2025-02-28' }
      ]

      testDates.forEach(({ input, expected }) => {
        const result = RotatingFileHandler.formatDate(input)
        expect(result).toBe(expected)
      })
    })

    test('should generate correct full path with date', () => {
      const testCases = [
        {
          basePath: '/tmp/logs/app.log',
          date: '2024-01-15',
          expected: '/tmp/logs/app-2024-01-15.log'
        },
        {
          basePath: './logs/debug.log',
          date: '2023-12-25',
          expected: 'logs/debug-2023-12-25.log'
        },
        {
          basePath: '/var/log/error.log',
          date: '2025-06-30',
          expected: '/var/log/error-2025-06-30.log'
        },
        {
          basePath: '/logs/app',
          date: '2024-03-01',
          expected: '/logs/app-2024-03-01'
        }
      ]

      testCases.forEach(({ basePath, date, expected }) => {
        const result = RotatingFileHandler.getFullPath(basePath, date)
        expect(result).toBe(expected)
      })
    })

    test('should handle paths without extensions', () => {
      const result = RotatingFileHandler.getFullPath('/tmp/logs/app', '2024-01-01')
      expect(result).toBe('/tmp/logs/app-2024-01-01')
    })

    test('should handle complex file extensions', () => {
      const result = RotatingFileHandler.getFullPath('/tmp/logs/app.backup.log', '2024-01-01')
      expect(result).toBe('/tmp/logs/app.backup-2024-01-01.log')
    })
  })

  describe('Daily Rotation Behavior', () => {
    beforeEach(() => {
      handler = new RotatingFileHandler(baseFilePath)
    })

    test('should write to same file for same date', () => {
      const record1 = createLogRecord(LogLevel.Info, 'First message', 'app', {}, {}, new Date('2024-01-15T10:00:00.000Z'))
      const record2 = createLogRecord(LogLevel.Info, 'Second message', 'app', {}, {}, new Date('2024-01-15T15:30:00.000Z'))

      handler.handle(record1)
      handler.handle(record2)

      expect(fsMock.appendFileSync).toHaveBeenCalledTimes(2)
      // Both calls should use the same file path
      expect(fsMock.appendFileSync).toHaveBeenNthCalledWith(1, 
        expect.stringContaining('app-2024-01-15.log'), 
        expect.any(String)
      )
      expect(fsMock.appendFileSync).toHaveBeenNthCalledWith(2, 
        expect.stringContaining('app-2024-01-15.log'), 
        expect.any(String)
      )
    })

    test('should rotate to new file when date changes', () => {
      const record1 = createLogRecord(LogLevel.Info, 'Day 1 message', 'app', {}, {}, new Date('2024-01-15T23:59:59.000Z'))
      const record2 = createLogRecord(LogLevel.Info, 'Day 2 message', 'app', {}, {}, new Date('2024-01-16T00:00:01.000Z'))

      handler.handle(record1)
      handler.handle(record2)

      expect(fsMock.appendFileSync).toHaveBeenCalledTimes(2)
      // First call should use Jan 15 file
      expect(fsMock.appendFileSync).toHaveBeenNthCalledWith(1, 
        expect.stringContaining('app-2024-01-15.log'), 
        expect.any(String)
      )
      // Second call should use Jan 16 file
      expect(fsMock.appendFileSync).toHaveBeenNthCalledWith(2, 
        expect.stringContaining('app-2024-01-16.log'), 
        expect.any(String)
      )
    })

    test('should update current date when rotating', () => {
      const record1 = createLogRecord(LogLevel.Info, 'Message 1', 'app', {}, {}, new Date('2024-01-15T12:00:00.000Z'))
      const record2 = createLogRecord(LogLevel.Info, 'Message 2', 'app', {}, {}, new Date('2024-01-20T12:00:00.000Z'))

      handler.handle(record1)
      expect(handler['currentDate']).toBe('2024-01-15')

      handler.handle(record2)
      expect(handler['currentDate']).toBe('2024-01-20')
    })

    test('should update file path when rotating', () => {
      const record1 = createLogRecord(LogLevel.Info, 'Message 1', 'app', {}, {}, new Date('2024-01-15T12:00:00.000Z'))
      const record2 = createLogRecord(LogLevel.Info, 'Message 2', 'app', {}, {}, new Date('2024-01-20T12:00:00.000Z'))

      handler.handle(record1)
      expect(handler['filePath']).toContain('app-2024-01-15.log')

      handler.handle(record2)
      expect(handler['filePath']).toContain('app-2024-01-20.log')
    })

    test('should handle multiple date changes', () => {
      const dates = [
        new Date('2024-01-01T12:00:00.000Z'),
        new Date('2024-01-02T12:00:00.000Z'),
        new Date('2024-01-03T12:00:00.000Z'),
        new Date('2024-01-05T12:00:00.000Z') // Skip day 4
      ]

      dates.forEach((date, index) => {
        const record = createLogRecord(LogLevel.Info, `Message ${index + 1}`, 'app', {}, {}, date)
        handler.handle(record)
      })

      expect(fsMock.appendFileSync).toHaveBeenCalledTimes(4)
      expect(fsMock.appendFileSync).toHaveBeenNthCalledWith(1, expect.stringContaining('app-2024-01-01.log'), expect.any(String))
      expect(fsMock.appendFileSync).toHaveBeenNthCalledWith(2, expect.stringContaining('app-2024-01-02.log'), expect.any(String))
      expect(fsMock.appendFileSync).toHaveBeenNthCalledWith(3, expect.stringContaining('app-2024-01-03.log'), expect.any(String))
      expect(fsMock.appendFileSync).toHaveBeenNthCalledWith(4, expect.stringContaining('app-2024-01-05.log'), expect.any(String))
    })
  })

  describe('Directory Creation for Rotated Files', () => {
    test('should create directory when rotating to new file if directory does not exist', () => {
      // Clear mocks first
      fsMock.existsSync.mockClear()
      fsMock.mkdirSync.mockClear()
      fsMock.appendFileSync.mockClear()
      
      // Set up mock to return false for directory existence
      fsMock.existsSync.mockReturnValue(false)
      
      // Create handler after setting up mocks
      handler = new RotatingFileHandler(baseFilePath)
      
      const record = createLogRecord(LogLevel.Info, 'New day message', 'app', {}, {}, new Date('2024-01-16T12:00:00.000Z'))
      handler.handle(record)

      expect(fsMock.existsSync).toHaveBeenCalledWith(path.dirname(baseFilePath))
      expect(fsMock.mkdirSync).toHaveBeenCalledWith(path.dirname(baseFilePath), { recursive: true })
    })

    test('should not create directory when rotating if directory already exists', () => {
      // Clear mocks first
      fsMock.existsSync.mockClear()
      fsMock.mkdirSync.mockClear()
      fsMock.appendFileSync.mockClear()
      
      // Set up mock to return true for directory existence
      fsMock.existsSync.mockReturnValue(true)
      
      // Create handler after setting up mocks
      handler = new RotatingFileHandler(baseFilePath)
      
      const record = createLogRecord(LogLevel.Info, 'New day message', 'app', {}, {}, new Date('2024-01-16T12:00:00.000Z'))
      handler.handle(record)

      expect(fsMock.existsSync).toHaveBeenCalledWith(path.dirname(baseFilePath))
      expect(fsMock.mkdirSync).not.toHaveBeenCalled()
    })
  })

  describe('Log Formatting Inheritance', () => {
    beforeEach(() => {
      handler = new RotatingFileHandler(baseFilePath)
    })

    test('should format logs same as FileHandler', () => {
      const record = createLogRecord(LogLevel.Info, 'Test message', 'app', {}, {}, new Date('2024-01-15T12:00:00.000Z'))
      
      handler.handle(record)
      
      const expectedFormat = '[2024-01-15T12:00:00.000Z] Info (app): Test message\n'
      expect(fsMock.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('app-2024-01-15.log'),
        expectedFormat
      )
    })

    test('should include context and extra data like FileHandler', () => {
      const context = { userId: 123 }
      const extra = { ip: '192.168.1.1' }
      const record = createLogRecord(LogLevel.Info, 'User action', 'auth', context, extra, new Date('2024-01-15T12:00:00.000Z'))
      
      handler.handle(record)
      
      expect(fsMock.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('app-2024-01-15.log'),
        expect.stringContaining('Context: {')
      )
      expect(fsMock.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('app-2024-01-15.log'),
        expect.stringContaining('Extra: {')
      )
    })

    test('should handle all log levels correctly', () => {
      const levels = [
        { level: LogLevel.Debug, name: 'Debug' },
        { level: LogLevel.Info, name: 'Info' },
        { level: LogLevel.Warning, name: 'Warning' },
        { level: LogLevel.Error, name: 'Error' }
      ]
      
      levels.forEach(({ level, name }) => {
        fsMock.appendFileSync.mockClear()
        const record = createLogRecord(level, 'Test message', 'test', {}, {}, new Date('2024-01-15T12:00:00.000Z'))
        handler.handle(record)
        
        expect(fsMock.appendFileSync).toHaveBeenCalledWith(
          expect.any(String),
          expect.stringContaining(`${name} (test): Test message`)
        )
      })
    })
  })

  describe('Context and Extra Data with Rotation', () => {
    beforeEach(() => {
      handler = new RotatingFileHandler(baseFilePath)
    })

    test('should handle context data across date rotation', () => {
      const context1 = { sessionId: 'session1' }
      const context2 = { sessionId: 'session2' }
      
      const record1 = createLogRecord(LogLevel.Info, 'Day 1', 'app', context1, {}, new Date('2024-01-15T12:00:00.000Z'))
      const record2 = createLogRecord(LogLevel.Info, 'Day 2', 'app', context2, {}, new Date('2024-01-16T12:00:00.000Z'))
      
      handler.handle(record1)
      handler.handle(record2)
      
      expect(fsMock.appendFileSync).toHaveBeenNthCalledWith(1,
        expect.stringContaining('app-2024-01-15.log'),
        expect.stringContaining('"sessionId": "session1"')
      )
      expect(fsMock.appendFileSync).toHaveBeenNthCalledWith(2,
        expect.stringContaining('app-2024-01-16.log'),
        expect.stringContaining('"sessionId": "session2"')
      )
    })

    test('should handle circular references in context across rotation', () => {
      const context: any = { name: 'test' }
      context.self = context
      
      const record1 = createLogRecord(LogLevel.Info, 'Circular 1', 'app', context, {}, new Date('2024-01-15T12:00:00.000Z'))
      const record2 = createLogRecord(LogLevel.Info, 'Circular 2', 'app', context, {}, new Date('2024-01-16T12:00:00.000Z'))
      
      expect(() => {
        handler.handle(record1)
        handler.handle(record2)
      }).not.toThrow()
      
      expect(fsMock.appendFileSync).toHaveBeenCalledTimes(2)
    })
  })

  describe('Edge Cases', () => {
    beforeEach(() => {
      handler = new RotatingFileHandler(baseFilePath)
    })

    test('should handle date formatting errors gracefully', () => {
      // Mock formatDate to throw an error
      const originalFormatDate = (RotatingFileHandler as any).formatDate
      ;(RotatingFileHandler as any).formatDate = mock(() => {
        throw new Error('Date formatting failed')
      })

      expect(() => {
        new RotatingFileHandler(baseFilePath)
      }).toThrow('Date formatting failed')

      // Restore original method
      ;(RotatingFileHandler as any).formatDate = originalFormatDate
    })

    test('should handle timezone changes correctly', () => {
      // Test with different timezone dates that represent the same UTC day
      const utcMorning = new Date('2024-01-15T02:00:00.000Z')
      const utcEvening = new Date('2024-01-15T22:00:00.000Z')
      
      const record1 = createLogRecord(LogLevel.Info, 'Morning', 'app', {}, {}, utcMorning)
      const record2 = createLogRecord(LogLevel.Info, 'Evening', 'app', {}, {}, utcEvening)
      
      handler.handle(record1)
      handler.handle(record2)
      
      // Both should go to the same file since they're the same UTC date
      expect(fsMock.appendFileSync).toHaveBeenCalledTimes(2)
      expect(fsMock.appendFileSync).toHaveBeenNthCalledWith(1, 
        expect.stringContaining('app-2024-01-15.log'), 
        expect.any(String)
      )
      expect(fsMock.appendFileSync).toHaveBeenNthCalledWith(2, 
        expect.stringContaining('app-2024-01-15.log'), 
        expect.any(String)
      )
    })

    test('should handle leap year dates', () => {
      const leapYearDate = new Date('2024-02-29T12:00:00.000Z')
      const record = createLogRecord(LogLevel.Info, 'Leap year', 'app', {}, {}, leapYearDate)
      
      handler.handle(record)
      
      expect(fsMock.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('app-2024-02-29.log'),
        expect.any(String)
      )
    })

    test('should handle year boundaries', () => {
      const lastDayOfYear = new Date('2023-12-31T23:59:59.000Z')
      const firstDayOfYear = new Date('2024-01-01T00:00:01.000Z')
      
      const record1 = createLogRecord(LogLevel.Info, 'Last day', 'app', {}, {}, lastDayOfYear)
      const record2 = createLogRecord(LogLevel.Info, 'First day', 'app', {}, {}, firstDayOfYear)
      
      handler.handle(record1)
      handler.handle(record2)
      
      expect(fsMock.appendFileSync).toHaveBeenNthCalledWith(1, 
        expect.stringContaining('app-2023-12-31.log'), 
        expect.any(String)
      )
      expect(fsMock.appendFileSync).toHaveBeenNthCalledWith(2, 
        expect.stringContaining('app-2024-01-01.log'), 
        expect.any(String)
      )
    })

    test('should handle file write errors during rotation', () => {
      fsMock.appendFileSync.mockImplementation(() => {
        throw new Error('Disk full')
      })
      
      const record = createLogRecord(LogLevel.Error, 'Error message', 'app', {}, {}, new Date('2024-01-15T12:00:00.000Z'))
      
      expect(() => handler.handle(record)).not.toThrow()
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to write to log file')
      )
    })
  })

  describe('Integration with AbstractHandler and FileHandler', () => {
    beforeEach(() => {
      handler = new RotatingFileHandler(baseFilePath)
    })

    test('should respect minimum log level filtering', () => {
      handler.setMinLevel(LogLevel.Warning)
      
      const debugRecord = createLogRecord(LogLevel.Debug, 'Debug message', 'app', {}, {}, new Date('2024-01-15T12:00:00.000Z'))
      const warningRecord = createLogRecord(LogLevel.Warning, 'Warning message', 'app', {}, {}, new Date('2024-01-15T12:00:00.000Z'))
      
      handler.handle(debugRecord)
      handler.handle(warningRecord)
      
      expect(fsMock.appendFileSync).toHaveBeenCalledTimes(1)
      expect(fsMock.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('app-2024-01-15.log'),
        expect.stringContaining('Warning message')
      )
    })

    test('should support method chaining', () => {
      const result = handler.setMinLevel(LogLevel.Error)
      expect(result).toBe(handler)
      expect(handler.getMinLevel()).toBe(LogLevel.Error)
    })

    test('should have correct default minimum level', () => {
      expect(handler.getMinLevel()).toBe(LogLevel.Debug)
    })

    test('should maintain level filtering across date rotation', () => {
      handler.setMinLevel(LogLevel.Warning)
      
      const infoRecord1 = createLogRecord(LogLevel.Info, 'Info day 1', 'app', {}, {}, new Date('2024-01-15T12:00:00.000Z'))
      const errorRecord1 = createLogRecord(LogLevel.Error, 'Error day 1', 'app', {}, {}, new Date('2024-01-15T12:00:00.000Z'))
      const infoRecord2 = createLogRecord(LogLevel.Info, 'Info day 2', 'app', {}, {}, new Date('2024-01-16T12:00:00.000Z'))
      const errorRecord2 = createLogRecord(LogLevel.Error, 'Error day 2', 'app', {}, {}, new Date('2024-01-16T12:00:00.000Z'))
      
      handler.handle(infoRecord1) // Should not log
      handler.handle(errorRecord1) // Should log to day 1 file
      handler.handle(infoRecord2) // Should not log
      handler.handle(errorRecord2) // Should log to day 2 file
      
      expect(fsMock.appendFileSync).toHaveBeenCalledTimes(2)
      expect(fsMock.appendFileSync).toHaveBeenNthCalledWith(1,
        expect.stringContaining('app-2024-01-15.log'),
        expect.stringContaining('Error day 1')
      )
      expect(fsMock.appendFileSync).toHaveBeenNthCalledWith(2,
        expect.stringContaining('app-2024-01-16.log'),
        expect.stringContaining('Error day 2')
      )
    })
  })
})