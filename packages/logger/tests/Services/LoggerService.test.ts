import { describe, test, expect, beforeEach } from 'bun:test'
import { LoggerService } from '../../src/Services/LoggerService'
import { Channel } from '../../src/Channel/Channel'
import { LogLevel } from '../../src/Types/LogLevel'
import type { LogRecord } from '../../src/Types/LogRecord'
import type { Handler } from '../../src/Contracts/Handler'

/**
 * Mock Handler class for testing
 */
class MockHandler implements Handler {
  public handleCalls: LogRecord[] = []

  handle(record: LogRecord): void {
    this.handleCalls.push(record)
  }

  reset(): void {
    this.handleCalls = []
  }
}

/**
 * Helper function to create a mock handler
 */
function createMockHandler(): MockHandler {
  return new MockHandler()
}

describe('LoggerService', () => {
  let loggerService: LoggerService
  let mockHandler: MockHandler
  let mockHandler2: MockHandler

  beforeEach(() => {
    loggerService = new LoggerService()
    mockHandler = createMockHandler()
    mockHandler2 = createMockHandler()
  })

  describe('Constructor and Initial State', () => {
    test('should initialize with empty channels map', () => {
      const channels = loggerService.getChannels()
      expect(channels.size).toBe(0)
    })

    test('should initialize with default channel name "app"', () => {
      expect(loggerService.getDefaultChannel()).toBe('app')
    })

    test('should initialize with empty default handlers array', () => {
      // Test by creating a channel and checking it has no handlers
      const channel = loggerService.channel('test') as Channel
      expect(channel.getHandlers()).toHaveLength(0)
    })
  })

  describe('Channel Management', () => {
    test('should create new channel when requested', () => {
      const channel = loggerService.channel('test-channel')
      
      expect(channel).toBeInstanceOf(Channel)
      expect((channel as Channel).getName()).toBe('test-channel')
    })

    test('should return same channel instance for same name', () => {
      const channel1 = loggerService.channel('test-channel')
      const channel2 = loggerService.channel('test-channel')
      
      expect(channel1).toBe(channel2)
    })

    test('should use default channel when no name provided', () => {
      const channel = loggerService.channel()
      
      expect((channel as Channel).getName()).toBe('app')
    })

    test('should use custom default channel when set', () => {
      loggerService.setDefaultChannel('custom-default')
      const channel = loggerService.channel()
      
      expect((channel as Channel).getName()).toBe('custom-default')
    })

    test('should create different channels for different names', () => {
      const channel1 = loggerService.channel('channel1')
      const channel2 = loggerService.channel('channel2')
      
      expect(channel1).not.toBe(channel2)
      expect((channel1 as Channel).getName()).toBe('channel1')
      expect((channel2 as Channel).getName()).toBe('channel2')
    })

    test('should register channels in channels map', () => {
      loggerService.channel('test1')
      loggerService.channel('test2')
      
      const channels = loggerService.getChannels()
      expect(channels.size).toBe(2)
      expect(channels.has('test1')).toBe(true)
      expect(channels.has('test2')).toBe(true)
    })
  })

  describe('Default Channel Management', () => {
    test('should set default channel name', () => {
      const result = loggerService.setDefaultChannel('new-default')
      
      expect(result).toBe(loggerService) // Should return this for chaining
      expect(loggerService.getDefaultChannel()).toBe('new-default')
    })

    test('should get default channel name', () => {
      loggerService.setDefaultChannel('custom-channel')
      
      expect(loggerService.getDefaultChannel()).toBe('custom-channel')
    })

    test('should support method chaining for setDefaultChannel', () => {
      const result = loggerService.setDefaultChannel('chained')
      
      expect(result).toBe(loggerService)
    })
  })

  describe('Default Handler Management', () => {
    test('should add default handler', () => {
      const result = loggerService.addDefaultHandler(mockHandler)
      
      expect(result).toBe(loggerService) // Should return this for chaining
    })

    test('should apply default handlers to new channels', () => {
      loggerService.addDefaultHandler(mockHandler)
      loggerService.addDefaultHandler(mockHandler2)
      
      const channel = loggerService.channel('test-channel') as Channel
      const handlers = channel.getHandlers()
      
      expect(handlers).toHaveLength(2)
      expect(handlers).toContain(mockHandler)
      expect(handlers).toContain(mockHandler2)
    })

    test('should not affect existing channels when adding default handlers', () => {
      const existingChannel = loggerService.channel('existing') as Channel
      expect(existingChannel.getHandlers()).toHaveLength(0)
      
      loggerService.addDefaultHandler(mockHandler)
      
      // Existing channel should still have no handlers
      expect(existingChannel.getHandlers()).toHaveLength(0)
      
      // New channel should have the default handler
      const newChannel = loggerService.channel('new') as Channel
      expect(newChannel.getHandlers()).toHaveLength(1)
      expect(newChannel.getHandlers()).toContain(mockHandler)
    })

    test('should support multiple default handlers', () => {
      loggerService.addDefaultHandler(mockHandler)
      loggerService.addDefaultHandler(mockHandler2)
      
      const channel = loggerService.channel('test') as Channel
      const handlers = channel.getHandlers()
      
      expect(handlers).toHaveLength(2)
      expect(handlers[0]).toBe(mockHandler)
      expect(handlers[1]).toBe(mockHandler2)
    })

    test('should support method chaining for addDefaultHandler', () => {
      const result = loggerService
        .addDefaultHandler(mockHandler)
        .addDefaultHandler(mockHandler2)
      
      expect(result).toBe(loggerService)
    })
  })

  describe('Channel-Specific Handler Management', () => {
    test('should add handler to specific channel', () => {
      const result = loggerService.addHandler(mockHandler, 'test-channel')
      
      expect(result).toBe(loggerService) // Should return this for chaining
      
      const channel = loggerService.channel('test-channel') as Channel
      expect(channel.getHandlers()).toContain(mockHandler)
    })

    test('should add handler to default channel when no channel specified', () => {
      const result = loggerService.addHandler(mockHandler)
      
      expect(result).toBe(loggerService)
      
      const defaultChannel = loggerService.channel() as Channel
      expect(defaultChannel.getHandlers()).toContain(mockHandler)
    })

    test('should create channel if it does not exist when adding handler', () => {
      expect(loggerService.getChannels().has('new-channel')).toBe(false)
      
      loggerService.addHandler(mockHandler, 'new-channel')
      
      expect(loggerService.getChannels().has('new-channel')).toBe(true)
      const channel = loggerService.channel('new-channel') as Channel
      expect(channel.getHandlers()).toContain(mockHandler)
    })

    test('should support method chaining for addHandler', () => {
      const result = loggerService
        .addHandler(mockHandler, 'channel1')
        .addHandler(mockHandler2, 'channel2')
      
      expect(result).toBe(loggerService)
    })
  })

  describe('Channel Registry', () => {
    test('should return channels map', () => {
      loggerService.channel('channel1')
      loggerService.channel('channel2')
      
      const channels = loggerService.getChannels()
      
      expect(channels).toBeInstanceOf(Map)
      expect(channels.size).toBe(2)
      expect(channels.get('channel1')).toBeInstanceOf(Channel)
      expect(channels.get('channel2')).toBeInstanceOf(Channel)
    })

    test('should return reference to actual channels map', () => {
      const channels1 = loggerService.getChannels()
      loggerService.channel('test')
      const channels2 = loggerService.getChannels()
      
      expect(channels1).toBe(channels2) // Same reference
      expect(channels1.size).toBe(1) // Should reflect the change
    })
  })

  describe('Integration and Edge Cases', () => {
    test('should work with complex channel and handler setup', () => {
      // Setup default handlers
      loggerService.addDefaultHandler(mockHandler)
      
      // Create channels with additional handlers
      loggerService.addHandler(mockHandler2, 'special-channel')
      
      // Test default channel
      const defaultChannel = loggerService.channel() as Channel
      expect(defaultChannel.getHandlers()).toHaveLength(1)
      expect(defaultChannel.getHandlers()).toContain(mockHandler)
      
      // Test special channel
      const specialChannel = loggerService.channel('special-channel') as Channel
      expect(specialChannel.getHandlers()).toHaveLength(2)
      expect(specialChannel.getHandlers()).toContain(mockHandler)
      expect(specialChannel.getHandlers()).toContain(mockHandler2)
    })

    test('should handle logging through service-managed channels', () => {
      loggerService.addDefaultHandler(mockHandler)
      
      const channel = loggerService.channel('test-logging')
      channel.info('Test message', { key: 'value' })
      
      expect(mockHandler.handleCalls).toHaveLength(1)
      const record = mockHandler.handleCalls[0]!
      expect(record.message).toBe('Test message')
      expect(record.level).toBe(LogLevel.Info)
      expect(record.channel).toBe('test-logging')
      expect(record.context).toEqual({ key: 'value' })
    })

    test('should handle empty channel names gracefully', () => {
      // Empty string falls back to default channel due to || operator
      const channel = loggerService.channel('')
      expect((channel as Channel).getName()).toBe('app')
    })

    test('should handle special characters in channel names', () => {
      const channelName = 'test-channel_123.with@special#chars'
      const channel = loggerService.channel(channelName)
      expect((channel as Channel).getName()).toBe(channelName)
    })

    test('should maintain separate handler lists for different channels', () => {
      loggerService.addHandler(mockHandler, 'channel1')
      loggerService.addHandler(mockHandler2, 'channel2')
      
      const channel1 = loggerService.channel('channel1') as Channel
      const channel2 = loggerService.channel('channel2') as Channel
      
      expect(channel1.getHandlers()).toContain(mockHandler)
      expect(channel1.getHandlers()).not.toContain(mockHandler2)
      
      expect(channel2.getHandlers()).toContain(mockHandler2)
      expect(channel2.getHandlers()).not.toContain(mockHandler)
    })

    test('should support fluent interface pattern', () => {
      const result = loggerService
        .setDefaultChannel('fluent-test')
        .addDefaultHandler(mockHandler)
        .addHandler(mockHandler2, 'special')
      
      expect(result).toBe(loggerService)
      expect(loggerService.getDefaultChannel()).toBe('fluent-test')
      
      const defaultChannel = loggerService.channel() as Channel
      expect(defaultChannel.getHandlers()).toContain(mockHandler)
      
      const specialChannel = loggerService.channel('special') as Channel
      expect(specialChannel.getHandlers()).toContain(mockHandler)
      expect(specialChannel.getHandlers()).toContain(mockHandler2)
    })
  })
})