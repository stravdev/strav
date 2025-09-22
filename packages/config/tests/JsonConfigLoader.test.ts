import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import { JsonConfigLoader } from '../src/Loaders/JsonConfigLoader'
import { ConfigLoadException } from '../src/Exceptions/ConfigLoadException'
import { UnsupportedFormatException } from '../src/Exceptions/UnsupportedFormatException'
import type { ConfigSource } from '../src/Contracts/ConfigSource'

// Mock fs/promises module
const mockReadFile = mock()
mock.module('fs/promises', () => ({
  readFile: mockReadFile
}))

describe('JsonConfigLoader', () => {
  let loader: JsonConfigLoader

  beforeEach(() => {
    loader = new JsonConfigLoader()
    mockReadFile.mockClear()
  })

  afterEach(() => {
    // Clean up any remaining mocks
  })

  describe('constructor and properties', () => {
    it('should initialize with correct supportedFormats', () => {
      expect(loader.supportedFormats).toEqual(['json'])
    })

    it('should be an instance of JsonConfigLoader', () => {
      expect(loader).toBeInstanceOf(JsonConfigLoader)
    })
  })

  describe('canLoad', () => {
    it('should return true for file sources with .json extension', () => {
      const source: ConfigSource = {
        type: 'file',
        location: '/path/to/config.json',
        resolve: mock(),
        isWatchable: mock().mockReturnValue(false)
      }

      expect(loader.canLoad(source)).toBe(true)
    })

    it('should return true for file sources with .JSON extension (case insensitive)', () => {
      const source: ConfigSource = {
        type: 'file',
        location: '/path/to/config.JSON',
        resolve: mock(),
        isWatchable: mock().mockReturnValue(false)
      }

      expect(loader.canLoad(source)).toBe(true)
    })

    it('should return false for file sources with non-json extensions', () => {
      const extensions = ['.txt', '.yaml', '.yml', '.js', '.ts', '.xml']
      
      extensions.forEach(ext => {
        const source: ConfigSource = {
          type: 'file',
          location: `/path/to/config${ext}`,
          resolve: mock(),
          isWatchable: mock().mockReturnValue(false)
        }

        expect(loader.canLoad(source)).toBe(false)
      })
    })

    it('should return false for non-file source types', () => {
      const sourceTypes = ['http', 'env', 'memory', 'database']
      
      sourceTypes.forEach(type => {
        const source: ConfigSource = {
          type,
          location: 'some-location',
          resolve: mock(),
          isWatchable: mock().mockReturnValue(false)
        }

        expect(loader.canLoad(source)).toBe(false)
      })
    })

    it('should return false for files without extensions', () => {
      const source: ConfigSource = {
        type: 'file',
        location: '/path/to/config',
        resolve: mock(),
        isWatchable: mock().mockReturnValue(false)
      }

      expect(loader.canLoad(source)).toBe(false)
    })
  })

  describe('load - successful cases', () => {
    it('should load and parse valid JSON configuration', async () => {
      const mockConfig = { app: { name: 'test', port: 3000 }, debug: true }
      const jsonContent = JSON.stringify(mockConfig)
      
      mockReadFile.mockResolvedValue(jsonContent)

      const source: ConfigSource = {
        type: 'file',
        location: '/path/to/config.json',
        resolve: mock(),
        isWatchable: mock().mockReturnValue(false)
      }

      const result = await loader.load(source)

      expect(mockReadFile).toHaveBeenCalledWith('/path/to/config.json', 'utf8')
      expect(result).toEqual(mockConfig)
    })

    it('should handle empty JSON object', async () => {
      mockReadFile.mockResolvedValue('{}')

      const source: ConfigSource = {
        type: 'file',
        location: '/path/to/empty.json',
        resolve: mock(),
        isWatchable: mock().mockReturnValue(false)
      }

      const result = await loader.load(source)

      expect(result).toEqual({})
    })

    it('should handle nested JSON objects', async () => {
      const complexConfig = {
        database: {
          host: 'localhost',
          port: 5432,
          credentials: {
            username: 'admin',
            password: 'secret'
          }
        },
        features: {
          auth: true,
          logging: {
            level: 'info',
            outputs: ['console', 'file']
          }
        }
      }
      
      mockReadFile.mockResolvedValue(JSON.stringify(complexConfig))

      const source: ConfigSource = {
        type: 'file',
        location: '/path/to/complex.json',
        resolve: mock(),
        isWatchable: mock().mockReturnValue(false)
      }

      const result = await loader.load(source)

      expect(result).toEqual(complexConfig)
    })
  })

  describe('load - error handling', () => {
    it('should throw UnsupportedFormatException for unsupported source types', async () => {
      const source: ConfigSource = {
        type: 'http',
        location: 'https://example.com/config',
        resolve: mock(),
        isWatchable: mock().mockReturnValue(false)
      }

      await expect(loader.load(source)).rejects.toThrow(UnsupportedFormatException)
      await expect(loader.load(source)).rejects.toThrow('JSON loader cannot handle source type: http')
    })

    it('should throw ConfigLoadException for file not found (ENOENT)', async () => {
      const error = new Error('File not found') as NodeJS.ErrnoException
      error.code = 'ENOENT'
      mockReadFile.mockRejectedValue(error)

      const source: ConfigSource = {
        type: 'file',
        location: '/path/to/missing.json',
        resolve: mock(),
        isWatchable: mock().mockReturnValue(false)
      }

      await expect(loader.load(source)).rejects.toThrow(ConfigLoadException)
      await expect(loader.load(source)).rejects.toThrow('JSON configuration file not found: /path/to/missing.json')
    })

    it('should throw ConfigLoadException for permission denied (EACCES)', async () => {
      const error = new Error('Permission denied') as NodeJS.ErrnoException
      error.code = 'EACCES'
      mockReadFile.mockRejectedValue(error)

      const source: ConfigSource = {
        type: 'file',
        location: '/path/to/restricted.json',
        resolve: mock(),
        isWatchable: mock().mockReturnValue(false)
      }

      await expect(loader.load(source)).rejects.toThrow(ConfigLoadException)
      await expect(loader.load(source)).rejects.toThrow('Permission denied reading JSON file: /path/to/restricted.json')
    })

    it('should throw ConfigLoadException for invalid JSON syntax', async () => {
      mockReadFile.mockResolvedValue('{ invalid json content }')

      const source: ConfigSource = {
        type: 'file',
        location: '/path/to/invalid.json',
        resolve: mock(),
        isWatchable: mock().mockReturnValue(false)
      }

      await expect(loader.load(source)).rejects.toThrow(ConfigLoadException)
      await expect(loader.load(source)).rejects.toThrow('Invalid JSON syntax in configuration file:')
    })

    it('should throw ConfigLoadException for non-object JSON (array)', async () => {
      mockReadFile.mockResolvedValue('[1, 2, 3]')

      const source: ConfigSource = {
        type: 'file',
        location: '/path/to/array.json',
        resolve: mock(),
        isWatchable: mock().mockReturnValue(false)
      }

      await expect(loader.load(source)).rejects.toThrow(ConfigLoadException)
      await expect(loader.load(source)).rejects.toThrow('JSON file must contain a valid configuration object, got object')
    })

    it('should throw ConfigLoadException for non-object JSON (string)', async () => {
      mockReadFile.mockResolvedValue('"just a string"')

      const source: ConfigSource = {
        type: 'file',
        location: '/path/to/string.json',
        resolve: mock(),
        isWatchable: mock().mockReturnValue(false)
      }

      await expect(loader.load(source)).rejects.toThrow(ConfigLoadException)
      await expect(loader.load(source)).rejects.toThrow('JSON file must contain a valid configuration object, got string')
    })

    it('should throw ConfigLoadException for non-object JSON (number)', async () => {
      mockReadFile.mockResolvedValue('42')

      const source: ConfigSource = {
        type: 'file',
        location: '/path/to/number.json',
        resolve: mock(),
        isWatchable: mock().mockReturnValue(false)
      }

      await expect(loader.load(source)).rejects.toThrow(ConfigLoadException)
      await expect(loader.load(source)).rejects.toThrow('JSON file must contain a valid configuration object, got number')
    })

    it('should throw ConfigLoadException for non-object JSON (null)', async () => {
      mockReadFile.mockResolvedValue('null')

      const source: ConfigSource = {
        type: 'file',
        location: '/path/to/null.json',
        resolve: mock(),
        isWatchable: mock().mockReturnValue(false)
      }

      await expect(loader.load(source)).rejects.toThrow(ConfigLoadException)
      await expect(loader.load(source)).rejects.toThrow('JSON file must contain a valid configuration object, got object')
    })

    it('should handle unknown file system errors', async () => {
      const error = new Error('Unknown file system error') as NodeJS.ErrnoException
      error.code = 'UNKNOWN'
      mockReadFile.mockRejectedValue(error)

      const source: ConfigSource = {
        type: 'file',
        location: '/path/to/error.json',
        resolve: mock(),
        isWatchable: mock().mockReturnValue(false)
      }

      await expect(loader.load(source)).rejects.toThrow(ConfigLoadException)
      await expect(loader.load(source)).rejects.toThrow('Failed to load JSON configuration from /path/to/error.json: Unknown file system error')
    })

    it('should handle non-Error exceptions', async () => {
      mockReadFile.mockRejectedValue('String error')

      const source: ConfigSource = {
        type: 'file',
        location: '/path/to/error.json',
        resolve: mock(),
        isWatchable: mock().mockReturnValue(false)
      }

      await expect(loader.load(source)).rejects.toThrow(ConfigLoadException)
      await expect(loader.load(source)).rejects.toThrow('Failed to load JSON configuration from /path/to/error.json: Unknown error')
    })

    it('should re-throw ConfigLoadException and UnsupportedFormatException as-is', async () => {
      const configError = new ConfigLoadException('Custom config error', '/path/to/file.json')
      mockReadFile.mockRejectedValue(configError)

      const source: ConfigSource = {
        type: 'file',
        location: '/path/to/error.json',
        resolve: mock(),
        isWatchable: mock().mockReturnValue(false)
      }

      await expect(loader.load(source)).rejects.toThrow(configError)
    })
  })

  describe('edge cases', () => {
    it('should handle JSON with special characters and unicode', async () => {
      const specialConfig = {
        message: 'Hello 世界! 🌍',
        symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
        unicode: '\u0048\u0065\u006C\u006C\u006F'
      }
      
      mockReadFile.mockResolvedValue(JSON.stringify(specialConfig))

      const source: ConfigSource = {
        type: 'file',
        location: '/path/to/special.json',
        resolve: mock(),
        isWatchable: mock().mockReturnValue(false)
      }

      const result = await loader.load(source)

      expect(result).toEqual(specialConfig)
    })

    it('should handle very large JSON files', async () => {
      const largeConfig = {
        data: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `item-${i}`,
          value: Math.random()
        }))
      }
      
      mockReadFile.mockResolvedValue(JSON.stringify(largeConfig))

      const source: ConfigSource = {
        type: 'file',
        location: '/path/to/large.json',
        resolve: mock(),
        isWatchable: mock().mockReturnValue(false)
      }

      const result = await loader.load(source)

      expect(result).toEqual(largeConfig)
      expect(result.data).toHaveLength(1000)
    })

    it('should handle JSON with null values in objects', async () => {
      const configWithNulls = {
        setting1: null,
        setting2: 'value',
        nested: {
          prop1: null,
          prop2: 42
        }
      }
      
      mockReadFile.mockResolvedValue(JSON.stringify(configWithNulls))

      const source: ConfigSource = {
        type: 'file',
        location: '/path/to/nulls.json',
        resolve: mock(),
        isWatchable: mock().mockReturnValue(false)
      }

      const result = await loader.load(source)

      expect(result).toEqual(configWithNulls)
      expect(result.setting1).toBeNull()
      expect(result.nested.prop1).toBeNull()
    })

    it('should handle paths with different separators and extensions', async () => {
      const testPaths = [
        'C:\\Windows\\config.json',
        '/usr/local/etc/app.json',
        './relative/path/config.json',
        '../parent/config.json',
        'config.json'
      ]

      for (const path of testPaths) {
        const source: ConfigSource = {
          type: 'file',
          location: path,
          resolve: mock(),
          isWatchable: mock().mockReturnValue(false)
        }

        expect(loader.canLoad(source)).toBe(true)
      }
    })
  })
})