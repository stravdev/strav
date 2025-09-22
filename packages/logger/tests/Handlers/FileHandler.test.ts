import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test'
import * as fs from 'fs'
import * as path from 'path'
import { FileHandler } from '../../src/Handlers/FileHandler'
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
  extra: Record<string, any> = {}
): LogRecord {
  return {
    message,
    level,
    channel,
    datetime: new Date('2024-01-01T12:00:00.000Z'),
    context,
    extra
  }
}

describe('FileHandler', () => {
  let handler: FileHandler
  let testFilePath: string
  let consoleSpy: any

  beforeEach(() => {
    // Setup test file path
    testFilePath = '/tmp/test-logs/app.log'
    
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
    test('should create instance with file path', () => {
      handler = new FileHandler(testFilePath)
      expect(handler).toBeInstanceOf(FileHandler)
      expect(handler['filePath']).toBe(testFilePath)
    })

    test('should extend AbstractHandler', () => {
      handler = new FileHandler(testFilePath)
      expect(handler.setMinLevel).toBeDefined()
      expect(handler.getMinLevel).toBeDefined()
      expect(handler.handle).toBeDefined()
    })

    test('should create directory if it does not exist', () => {
      fsMock.existsSync.mockReturnValue(false)
      
      handler = new FileHandler(testFilePath)
      
      expect(fsMock.existsSync).toHaveBeenCalledWith(path.dirname(testFilePath))
      expect(fsMock.mkdirSync).toHaveBeenCalledWith(path.dirname(testFilePath), { recursive: true })
    })

    test('should not create directory if it already exists', () => {
      fsMock.existsSync.mockReturnValue(true)
      
      handler = new FileHandler(testFilePath)
      
      expect(fsMock.existsSync).toHaveBeenCalledWith(path.dirname(testFilePath))
      expect(fsMock.mkdirSync).not.toHaveBeenCalled()
    })
  })

  describe('Log Level Filtering', () => {
    beforeEach(() => {
      handler = new FileHandler(testFilePath)
    })

    test('should process logs at or above minimum level', () => {
      handler.setMinLevel(LogLevel.Warning)
      
      const warningRecord = createLogRecord(LogLevel.Warning, 'Warning message')
      const errorRecord = createLogRecord(LogLevel.Error, 'Error message')
      
      handler.handle(warningRecord)
      handler.handle(errorRecord)
      
      expect(fsMock.appendFileSync).toHaveBeenCalledTimes(2)
    })

    test('should not process logs below minimum level', () => {
      handler.setMinLevel(LogLevel.Warning)
      
      const debugRecord = createLogRecord(LogLevel.Debug, 'Debug message')
      const infoRecord = createLogRecord(LogLevel.Info, 'Info message')
      
      handler.handle(debugRecord)
      handler.handle(infoRecord)
      
      expect(fsMock.appendFileSync).not.toHaveBeenCalled()
    })

    test('should process all levels when minimum is Debug', () => {
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
        const record = createLogRecord(level, `${LogLevel[level]} message`)
        handler.handle(record)
      })
      
      expect(fsMock.appendFileSync).toHaveBeenCalledTimes(8)
    })
  })

  describe('File Operations', () => {
    beforeEach(() => {
      handler = new FileHandler(testFilePath)
    })

    test('should append log entries to file', () => {
      const record = createLogRecord(LogLevel.Info, 'Test message')
      
      handler.handle(record)
      
      expect(fsMock.appendFileSync).toHaveBeenCalledTimes(1)
      expect(fsMock.appendFileSync).toHaveBeenCalledWith(
        testFilePath,
        expect.stringContaining('Test message')
      )
    })

    test('should handle multiple log entries', () => {
      const records = [
        createLogRecord(LogLevel.Info, 'First message'),
        createLogRecord(LogLevel.Warning, 'Second message'),
        createLogRecord(LogLevel.Error, 'Third message')
      ]
      
      records.forEach(record => handler.handle(record))
      
      expect(fsMock.appendFileSync).toHaveBeenCalledTimes(3)
    })

    test('should handle file write errors gracefully', () => {
      fsMock.appendFileSync.mockImplementation(() => {
        throw new Error('Permission denied')
      })
      
      const record = createLogRecord(LogLevel.Error, 'Error message')
      
      // Should not throw
      expect(() => handler.handle(record)).not.toThrow()
      
      // Should log error to console
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to write to log file')
      )
    })
  })

  describe('Log Formatting', () => {
    beforeEach(() => {
      handler = new FileHandler(testFilePath)
    })

    test('should format basic log entry with timestamp, level, channel, and message', () => {
      const record = createLogRecord(LogLevel.Info, 'Test message', 'app')
      
      handler.handle(record)
      
      const expectedFormat = '[2024-01-01T12:00:00.000Z] Info (app): Test message\n'
      expect(fsMock.appendFileSync).toHaveBeenCalledWith(testFilePath, expectedFormat)
    })

    test('should include correct level names for all levels', () => {
      const levels = [
        { level: LogLevel.Debug, name: 'Debug' },
        { level: LogLevel.Info, name: 'Info' },
        { level: LogLevel.Notice, name: 'Notice' },
        { level: LogLevel.Warning, name: 'Warning' },
        { level: LogLevel.Error, name: 'Error' },
        { level: LogLevel.Critical, name: 'Critical' },
        { level: LogLevel.Alert, name: 'Alert' },
        { level: LogLevel.Emergency, name: 'Emergency' }
      ]
      
      levels.forEach(({ level, name }) => {
        fsMock.appendFileSync.mockClear()
        const record = createLogRecord(level, 'Test message')
        handler.handle(record)
        
        expect(fsMock.appendFileSync).toHaveBeenCalledWith(
          testFilePath,
          expect.stringContaining(`${name} (test): Test message`)
        )
      })
    })

    test('should format timestamp as ISO string', () => {
      const customDate = new Date('2023-12-25T15:30:45.123Z')
      const record = {
        ...createLogRecord(LogLevel.Info, 'Christmas message'),
        datetime: customDate
      }
      
      handler.handle(record)
      
      expect(fsMock.appendFileSync).toHaveBeenCalledWith(
        testFilePath,
        expect.stringContaining('[2023-12-25T15:30:45.123Z]')
      )
    })

    test('should handle different channels', () => {
      const channels = ['app', 'database', 'auth', 'api']
      
      channels.forEach(channel => {
        fsMock.appendFileSync.mockClear()
        const record = createLogRecord(LogLevel.Info, 'Test message', channel)
        handler.handle(record)
        
        expect(fsMock.appendFileSync).toHaveBeenCalledWith(
          testFilePath,
          expect.stringContaining(`(${channel}):`)
        )
      })
    })
  })

  describe('Context and Extra Data Handling', () => {
    beforeEach(() => {
      handler = new FileHandler(testFilePath)
    })

    test('should include context when provided', () => {
      const context = { userId: 123, action: 'login' }
      const record = createLogRecord(LogLevel.Info, 'User logged in', 'auth', context)
      
      handler.handle(record)
      
      expect(fsMock.appendFileSync).toHaveBeenCalledWith(
        testFilePath,
        expect.stringContaining('Context: {')
      )
      expect(fsMock.appendFileSync).toHaveBeenCalledWith(
        testFilePath,
        expect.stringContaining('"userId": 123')
      )
    })

    test('should include extra data when provided', () => {
      const extra = { ip: '192.168.1.1', userAgent: 'Mozilla/5.0' }
      const record = createLogRecord(LogLevel.Info, 'Request received', 'http', {}, extra)
      
      handler.handle(record)
      
      expect(fsMock.appendFileSync).toHaveBeenCalledWith(
        testFilePath,
        expect.stringContaining('Extra: {')
      )
      expect(fsMock.appendFileSync).toHaveBeenCalledWith(
        testFilePath,
        expect.stringContaining('"ip": "192.168.1.1"')
      )
    })

    test('should not include context section when context is empty', () => {
      const record = createLogRecord(LogLevel.Info, 'No context', 'app', {})
      
      handler.handle(record)
      
      expect(fsMock.appendFileSync).toHaveBeenCalledWith(
        testFilePath,
        expect.not.stringContaining('Context:')
      )
    })

    test('should not include extra section when extra is empty', () => {
      const record = createLogRecord(LogLevel.Info, 'No extra', 'app', {}, {})
      
      handler.handle(record)
      
      expect(fsMock.appendFileSync).toHaveBeenCalledWith(
        testFilePath,
        expect.not.stringContaining('Extra:')
      )
    })
  })

  describe('Edge Cases', () => {
    beforeEach(() => {
      handler = new FileHandler(testFilePath)
    })

    test('should handle empty message', () => {
      const record = createLogRecord(LogLevel.Info, '')
      
      handler.handle(record)
      
      expect(fsMock.appendFileSync).toHaveBeenCalledWith(
        testFilePath,
        expect.stringContaining('Info (test): \n')
      )
    })

    test('should handle null values in context', () => {
      const context = { value: null }
      const record = createLogRecord(LogLevel.Info, 'Null values', 'app', context)
      
      handler.handle(record)
      
      expect(fsMock.appendFileSync).toHaveBeenCalledWith(
        testFilePath,
        expect.stringContaining('Context: {')
      )
      expect(fsMock.appendFileSync).toHaveBeenCalledWith(
        testFilePath,
        expect.stringContaining('"value": null')
      )
    })

    test('should handle circular references in context gracefully', () => {
      const context: any = { name: 'test' }
      context.self = context // Create circular reference
      
      const record = createLogRecord(LogLevel.Info, 'Circular reference', 'app', context)
      
      // Should not throw
      expect(() => handler.handle(record)).not.toThrow()
      
      // Should still write to file
      expect(fsMock.appendFileSync).toHaveBeenCalled()
    })

    test('should handle very long messages', () => {
      const longMessage = 'A'.repeat(1000)
      const record = createLogRecord(LogLevel.Info, longMessage)
      
      handler.handle(record)
      
      expect(fsMock.appendFileSync).toHaveBeenCalledWith(
        testFilePath,
        expect.stringContaining(longMessage)
      )
    })

    test('should handle different file paths', () => {
      const paths = [
        '/var/log/app.log',
        './logs/debug.log',
        '../logs/error.log'
      ]
      
      paths.forEach(filePath => {
        const fileHandler = new FileHandler(filePath)
        expect(fileHandler['filePath']).toBe(filePath)
      })
    })
  })

  describe('Integration with AbstractHandler', () => {
    beforeEach(() => {
      handler = new FileHandler(testFilePath)
    })

    test('should use handle method which respects minimum level', () => {
      handler.setMinLevel(LogLevel.Warning)
      
      const infoRecord = createLogRecord(LogLevel.Info, 'Info message')
      const warningRecord = createLogRecord(LogLevel.Warning, 'Warning message')
      
      handler.handle(infoRecord) // Should not process
      handler.handle(warningRecord) // Should process
      
      expect(fsMock.appendFileSync).toHaveBeenCalledTimes(1)
    })

    test('should support method chaining for setMinLevel', () => {
      const result = handler.setMinLevel(LogLevel.Error)
      expect(result).toBe(handler)
      expect(handler.getMinLevel()).toBe(LogLevel.Error)
    })

    test('should have correct default minimum level', () => {
      expect(handler.getMinLevel()).toBe(LogLevel.Debug)
    })
  })
})