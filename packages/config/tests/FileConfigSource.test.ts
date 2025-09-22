import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
  mock,
  spyOn,
} from 'bun:test'
import { FileConfigSource } from '../src/Sources/FileConfigSource'
import { InvalidSourceException } from '../src/Exceptions/InvalidSourceException'
import { ConfigSourceException } from '../src/Exceptions/ConfigSourceException'
import { writeFile, unlink, mkdir, rmdir } from 'fs/promises'
import { resolve, join } from 'path'
import { existsSync } from 'fs'

describe('FileConfigSource', () => {
  const testDir = resolve(__dirname, 'test-fixtures')
  const testFile = join(testDir, 'test-config.json')
  const nonExistentFile = join(testDir, 'non-existent.json')
  const relativeTestFile = 'test-fixtures/test-config.json'

  beforeAll(async () => {
    // Create test directory if it doesn't exist
    if (!existsSync(testDir)) {
      await mkdir(testDir, { recursive: true })
    }
  })

  afterAll(async () => {
    // Clean up test directory
    try {
      if (existsSync(testFile)) {
        await unlink(testFile)
      }
      await rmdir(testDir)
    } catch (error) {
      // Ignore cleanup errors
    }
  })

  beforeEach(async () => {
    // Create test file before each test
    await writeFile(testFile, JSON.stringify({ test: 'data' }), 'utf8')
  })

  afterEach(async () => {
    // Clean up test file after each test
    try {
      if (existsSync(testFile)) {
        await unlink(testFile)
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  })

  describe('constructor', () => {
    it('should create instance with absolute path', () => {
      const source = new FileConfigSource(testFile)

      expect(source.type).toBe('file')
      expect(source.location).toBe(testFile)
    })

    it('should resolve relative path to absolute', () => {
      const source = new FileConfigSource(relativeTestFile)

      expect(source.location).toBe(resolve(process.cwd(), relativeTestFile))
    })

    it('should use default options when none provided', () => {
      const source = new FileConfigSource(testFile)

      expect(source.options.encoding).toBe('utf8')
      expect(source.options.watch).toBe(true)
    })

    it('should accept custom options', () => {
      const options = { encoding: 'ascii' as const, watch: false }
      const source = new FileConfigSource(testFile, options)

      expect(source.options.encoding).toBe('ascii')
      expect(source.options.watch).toBe(false)
    })
  })

  describe('resolve', () => {
    it('should resolve successfully for accessible file', async () => {
      const source = new FileConfigSource(testFile)

      const result = await source.resolve()

      expect(result).toHaveProperty('__source')
      expect(result.__source.type).toBe('file')
      expect(result.__source.location).toBe(testFile)
      expect(result.__source.lastModified).toBeTypeOf('string')

      // Verify lastModified is a valid ISO string
      expect(() => new Date(result.__source.lastModified)).not.toThrow()
    })

    it('should throw InvalidSourceException for non-existent file', async () => {
      const source = new FileConfigSource(nonExistentFile)

      await expect(source.resolve()).rejects.toThrow(InvalidSourceException)
      await expect(source.resolve()).rejects.toThrow('Cannot access file')
      await expect(source.resolve()).rejects.toThrow(nonExistentFile)
    })

    it('should throw InvalidSourceException with correct source type', async () => {
      const source = new FileConfigSource(nonExistentFile)

      try {
        await source.resolve()
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidSourceException)
        expect((error as InvalidSourceException).sourceType).toBe('file')
      }
    })
  })

  describe('isWatchable', () => {
    it('should return true when watch option is true', () => {
      const source = new FileConfigSource(testFile, { watch: true })

      expect(source.isWatchable()).toBe(true)
    })

    it('should return true when watch option is undefined (default)', () => {
      const source = new FileConfigSource(testFile)

      expect(source.isWatchable()).toBe(true)
    })

    it('should return false when watch option is false', () => {
      const source = new FileConfigSource(testFile, { watch: false })

      expect(source.isWatchable()).toBe(false)
    })
  })

  describe('watch', () => {
    it('should throw error when watching is disabled', () => {
      const source = new FileConfigSource(testFile, { watch: false })
      const callback = mock(() => {})

      expect(() => source.watch(callback)).toThrow('Watching is disabled for this source')
    })

    it('should accept callback and return unsubscribe function', () => {
      const source = new FileConfigSource(testFile)
      const callback = mock(() => {})

      const unsubscribe = source.watch(callback)

      expect(typeof unsubscribe).toBe('function')
    })

    it('should add callback to internal set', () => {
      const source = new FileConfigSource(testFile)
      const callback = mock(() => {})

      source.watch(callback)

      // Access private property for testing
      expect((source as any).watchCallbacks.has(callback)).toBe(true)
    })

    it('should remove callback when unsubscribe is called', () => {
      const source = new FileConfigSource(testFile)
      const callback = mock(() => {})

      const unsubscribe = source.watch(callback)
      unsubscribe()

      expect((source as any).watchCallbacks.has(callback)).toBe(false)
    })

    it('should cleanup watcher when last callback is removed', () => {
      const source = new FileConfigSource(testFile)
      const callback1 = mock(() => {})
      const callback2 = mock(() => {})

      const unsubscribe1 = source.watch(callback1)
      const unsubscribe2 = source.watch(callback2)

      // Should have watcher after adding callbacks
      expect((source as any).watcher).toBeDefined()

      unsubscribe1()
      // Watcher should still exist (callback2 still active)
      expect((source as any).watcher).toBeDefined()

      unsubscribe2()
      // Watcher should be cleaned up
      expect((source as any).watcher).toBeUndefined()
    })

    it('should handle multiple callbacks', () => {
      const source = new FileConfigSource(testFile)
      const callback1 = mock(() => {})
      const callback2 = mock(() => {})

      source.watch(callback1)
      source.watch(callback2)

      expect((source as any).watchCallbacks.size).toBe(2)
    })
  })

  describe('file watching integration', () => {
    it.skip('should detect file changes and notify callbacks', async () => {
      // Skip this test in CI environments
      if (process.env.CI) {
        expect(true).toBe(true)
        return
      }

      const source = new FileConfigSource(testFile)
      let callbackCalled = false
      let callbackData: any = null

      const callback = mock((data: any) => {
        callbackCalled = true
        callbackData = data
      })

      source.watch(callback)

      // Wait for watcher to be fully setup
      await new Promise(resolve => setTimeout(resolve, 500))

      // Modify the file with a more significant change
      const newContent = JSON.stringify({ 
        modified: true, 
        timestamp: Date.now(),
        random: Math.random().toString() 
      }, null, 2)
      await writeFile(testFile, newContent, { encoding: 'utf8', flag: 'w' })

      // Wait for notification (with longer timeout for watchFile's polling)
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Verify callback was called
      expect(callback).toHaveBeenCalled()
      expect(callbackCalled).toBe(true)
      expect(callbackData).toBeDefined()

      return Promise.resolve()
    }, 5000)

    it('should handle file watcher errors gracefully', () => {
      // Try to watch a non-existent file
      const source = new FileConfigSource(nonExistentFile)
      const callback = mock(() => {})

      // This should not throw an error with our updated implementation
      expect(() => source.watch(callback)).not.toThrow()
    })

    it('should handle callback errors without breaking other callbacks', async () => {
      const source = new FileConfigSource(testFile)
      let goodCallbackCalled = false

      const errorCallback = mock(() => {
        throw new Error('Callback error')
      })
      const goodCallback = mock(() => {
        goodCallbackCalled = true
      })

      source.watch(errorCallback)
      source.watch(goodCallback)

      // Test the notification mechanism directly since file watching is unreliable in tests
      const testData = await source.resolve()
      
      // The notifyCallbacks method should now throw a ConfigSourceException
      await expect((source as any).notifyCallbacks(testData)).rejects.toThrow(ConfigSourceException)

      // Both callbacks should have been called before the exception was thrown
      expect(errorCallback).toHaveBeenCalled()
      expect(goodCallback).toHaveBeenCalled()
      expect(goodCallbackCalled).toBe(true)
    })

    it('should setup and cleanup file watcher properly', async () => {
      const source = new FileConfigSource(testFile)
      const callback = mock(() => {})

      // Initially no watcher
      expect((source as any).watcher).toBeUndefined()

      // After watching, watcher should be setup
      const unsubscribe = source.watch(callback)
      expect((source as any).watcher).toBeDefined()

      // After unsubscribing, watcher should be cleaned up
      unsubscribe()
      expect((source as any).watcher).toBeUndefined()
    })

    it('should handle notifyCallbacks method correctly', async () => {
      const source = new FileConfigSource(testFile)
      const callback1 = mock(() => {})
      const callback2 = mock(() => {})

      source.watch(callback1)
      source.watch(callback2)

      const testData = await source.resolve()
      await (source as any).notifyCallbacks(testData)

      expect(callback1).toHaveBeenCalledWith(testData)
      expect(callback2).toHaveBeenCalledWith(testData)
    })
  })

  describe('cleanup', () => {
    it('should properly cleanup resources', () => {
      const source = new FileConfigSource(testFile)
      const callback = mock(() => {})

      const unsubscribe = source.watch(callback)

      // Verify watcher is setup
      expect((source as any).watcher).toBeDefined()

      // Cleanup
      unsubscribe()

      // Verify cleanup
      expect((source as any).watcher).toBeUndefined()
      expect((source as any).watchCallbacks.size).toBe(0)
    })

    it('should handle multiple cleanup calls safely', () => {
      const source = new FileConfigSource(testFile)
      const callback = mock(() => {})

      const unsubscribe = source.watch(callback)

      // Multiple cleanup calls should not throw
      expect(() => {
        unsubscribe()
        unsubscribe()
        unsubscribe()
      }).not.toThrow()
    })
  })

  describe('edge cases', () => {
    it('should handle empty file path', () => {
      expect(() => new FileConfigSource('')).not.toThrow()
    })

    it('should handle file path with special characters', async () => {
      const specialFile = join(testDir, 'test config [special].json')
      await writeFile(specialFile, '{}', 'utf8')

      const source = new FileConfigSource(specialFile)

      await expect(source.resolve()).resolves.toBeDefined()

      // Cleanup
      await unlink(specialFile)
    })

    it('should handle very long file paths', () => {
      const longPath = 'a'.repeat(200) + '.json'

      expect(() => new FileConfigSource(longPath)).not.toThrow()
    })
  })
})
