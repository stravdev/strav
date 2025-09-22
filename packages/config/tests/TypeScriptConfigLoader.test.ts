import { describe, it, expect, beforeEach, beforeAll, afterAll, mock, spyOn } from 'bun:test'
import { TypeScriptConfigLoader } from '../src/Loaders/TypeScriptConfigLoader'
import { ConfigLoadException } from '../src/Exceptions/ConfigLoadException'
import { UnsupportedFormatException } from '../src/Exceptions/UnsupportedFormatException'
import type { ConfigSource } from '../src/Contracts/ConfigSource'
import { writeFile, unlink, mkdir, rmdir } from 'fs/promises'
import { resolve, join } from 'path'
import { existsSync } from 'fs'

describe('TypeScriptConfigLoader', () => {
  const testDir = resolve(__dirname, 'test-fixtures')

  beforeAll(async () => {
    if (!existsSync(testDir)) {
      await mkdir(testDir, { recursive: true })
    }
  })

  afterAll(async () => {
    try {
      await rmdir(testDir, { recursive: true })
    } catch (error) {
      // Ignore cleanup errors
    }
  })

  describe('constructor', () => {
    it('should create instance with default importer', () => {
      const loader = new TypeScriptConfigLoader()

      expect(loader.supportedFormats).toEqual(['ts', 'js', 'mjs'])
    })

    it('should create instance with custom importer', () => {
      const customImporter = mock(() => Promise.resolve({}))
      const loader = new TypeScriptConfigLoader(customImporter)

      expect(loader.supportedFormats).toEqual(['ts', 'js', 'mjs'])
    })
  })

  describe('canLoad', () => {
    it('should return true for TypeScript files', () => {
      const loader = new TypeScriptConfigLoader()
      const source: ConfigSource = {
        type: 'file',
        location: '/path/to/config.ts',
        resolve: async () => ({}),
        isWatchable: () => false,
      }

      expect(loader.canLoad(source)).toBe(true)
    })

    it('should return true for JavaScript files', () => {
      const loader = new TypeScriptConfigLoader()
      const source: ConfigSource = {
        type: 'file',
        location: '/path/to/config.js',
        resolve: async () => ({}),
        isWatchable: () => false,
      }

      expect(loader.canLoad(source)).toBe(true)
    })

    it('should return true for ES module files', () => {
      const loader = new TypeScriptConfigLoader()
      const source: ConfigSource = {
        type: 'file',
        location: '/path/to/config.mjs',
        resolve: async () => ({}),
        isWatchable: () => false,
      }

      expect(loader.canLoad(source)).toBe(true)
    })

    it('should return false for unsupported file extensions', () => {
      const loader = new TypeScriptConfigLoader()
      const source: ConfigSource = {
        type: 'file',
        location: '/path/to/config.json',
        resolve: async () => ({}),
        isWatchable: () => false,
      }

      expect(loader.canLoad(source)).toBe(false)
    })

    it('should return false for non-file sources', () => {
      const loader = new TypeScriptConfigLoader()
      const source: ConfigSource = {
        type: 'http',
        location: 'https://example.com/config.ts',
        resolve: async () => ({}),
        isWatchable: () => false,
      }

      expect(loader.canLoad(source)).toBe(false)
    })

    it('should handle case insensitive extensions', () => {
      const loader = new TypeScriptConfigLoader()
      const source: ConfigSource = {
        type: 'file',
        location: '/path/to/CONFIG.TS',
        resolve: async () => ({}),
        isWatchable: () => false,
      }

      expect(loader.canLoad(source)).toBe(true)
    })
  })

  describe('load', () => {
    it('should throw UnsupportedFormatException for unsupported sources', async () => {
      const loader = new TypeScriptConfigLoader()
      const source: ConfigSource = {
        type: 'http',
        location: 'https://example.com/config.ts',
        resolve: async () => ({}),
        isWatchable: () => false,
      }

      await expect(loader.load(source)).rejects.toThrow(UnsupportedFormatException)
      await expect(loader.load(source)).rejects.toThrow(
        'TypeScript loader cannot handle source type: http'
      )
    })

    it('should use custom importer with cache buster', async () => {
      const mockModule = { default: { app: { name: 'test' } } }
      const customImporter = mock(() => Promise.resolve(mockModule))
      const loader = new TypeScriptConfigLoader(customImporter)

      const source: ConfigSource = {
        type: 'file',
        location: '/path/to/config.ts',
        resolve: async () => ({}),
        isWatchable: () => false,
      }

      const result = await loader.load(source)

      expect(customImporter).toHaveBeenCalledTimes(1)
      const callArgs = (customImporter.mock.calls[0] as any)?.[0]
      expect(callArgs).toMatch(/^\/path\/to\/config\.ts\?t=.+/)
      expect(result).toEqual({ app: { name: 'test' } })
    })

    it('should throw ConfigLoadException when import fails', async () => {
      const importError = new Error('Module not found')
      const failingImporter = mock(() => Promise.reject(importError))
      const loader = new TypeScriptConfigLoader(failingImporter)

      const source: ConfigSource = {
        type: 'file',
        location: '/path/to/config.ts',
        resolve: async () => ({}),
        isWatchable: () => false,
      }

      await expect(loader.load(source)).rejects.toThrow(ConfigLoadException)

      try {
        await loader.load(source)
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigLoadException)
        expect((error as ConfigLoadException).source).toBe('/path/to/config.ts')
        expect((error as ConfigLoadException).cause).toBe(importError)
      }
    })
  })

  describe('extractConfigFromModule', () => {
    let loader: TypeScriptConfigLoader

    beforeEach(() => {
      loader = new TypeScriptConfigLoader()
    })

    it('should extract default object export', async () => {
      const mockModule = {
        default: { database: { host: 'localhost' } },
      }
      const mockImporter = mock(() => Promise.resolve(mockModule))
      const testLoader = new TypeScriptConfigLoader(mockImporter)

      const source: ConfigSource = {
        type: 'file',
        location: '/test/config.ts',
        resolve: async () => ({}),
        isWatchable: () => false,
      }

      const result = await testLoader.load(source)
      expect(result).toEqual({ database: { host: 'localhost' } })
    })

    it('should extract named config export', async () => {
      const mockModule = {
        config: { server: { port: 3000 } },
        default: undefined,
      }
      const mockImporter = mock(() => Promise.resolve(mockModule))
      const testLoader = new TypeScriptConfigLoader(mockImporter)

      const source: ConfigSource = {
        type: 'file',
        location: '/test/config.ts',
        resolve: async () => ({}),
        isWatchable: () => false,
      }

      const result = await testLoader.load(source)
      expect(result).toEqual({ server: { port: 3000 } })
    })

    it('should extract CommonJS style exports', async () => {
      const mockModule = {
        api: { baseUrl: 'https://api.example.com' },
        features: { auth: true },
        __esModule: true,
        default: undefined,
        config: undefined,
      }
      const mockImporter = mock(() => Promise.resolve(mockModule))
      const testLoader = new TypeScriptConfigLoader(mockImporter)

      const source: ConfigSource = {
        type: 'file',
        location: '/test/config.ts',
        resolve: async () => ({}),
        isWatchable: () => false,
      }

      const result = await testLoader.load(source)
      expect(result).toEqual({
        api: { baseUrl: 'https://api.example.com' },
        features: { auth: true },
      })
    })

    it('should handle default factory function', async () => {
      const configData = { env: 'test', debug: true }
      const mockModule = {
        default: () => configData,
      }
      const mockImporter = mock(() => Promise.resolve(mockModule))
      const testLoader = new TypeScriptConfigLoader(mockImporter)

      const source: ConfigSource = {
        type: 'file',
        location: '/test/config.ts',
        resolve: async () => ({}),
        isWatchable: () => false,
      }

      const result = await testLoader.load(source)
      expect(result).toEqual(configData)
    })

    it('should handle named config factory function', async () => {
      const configData = { cache: { ttl: 3600 } }
      const mockModule = {
        config: () => configData,
        default: null,
      }
      const mockImporter = mock(() => Promise.resolve(mockModule))
      const testLoader = new TypeScriptConfigLoader(mockImporter)

      const source: ConfigSource = {
        type: 'file',
        location: '/test/config.ts',
        resolve: async () => ({}),
        isWatchable: () => false,
      }

      const result = await testLoader.load(source)
      expect(result).toEqual(configData)
    })

    it('should prefer default export over named config', async () => {
      const mockModule = {
        default: { priority: 'default' },
        config: { priority: 'named' },
      }
      const mockImporter = mock(() => Promise.resolve(mockModule))
      const testLoader = new TypeScriptConfigLoader(mockImporter)

      const source: ConfigSource = {
        type: 'file',
        location: '/test/config.ts',
        resolve: async () => ({}),
        isWatchable: () => false,
      }

      const result = await testLoader.load(source)
      expect(result).toEqual({ priority: 'default' })
    })

    it('should fallback to empty object when no valid config found', async () => {
      const mockModule = {
        default: 'not an object',
        config: ['not', 'an', 'object'],
        someOtherExport: 'value',
      }
      const mockImporter = mock(() => Promise.resolve(mockModule))
      const testLoader = new TypeScriptConfigLoader(mockImporter)

      const source: ConfigSource = {
        type: 'file',
        location: '/test/config.ts',
        resolve: async () => ({}),
        isWatchable: () => false,
      }

      const result = await testLoader.load(source)
      expect(result).toEqual({})
    })

    it('should handle failing factory functions gracefully', async () => {
      const consoleSpy = spyOn(console, 'warn').mockImplementation(() => {})

      const mockModule = {
        default: () => {
          throw new Error('Factory function failed')
        },
      }
      const mockImporter = mock(() => Promise.resolve(mockModule))
      const testLoader = new TypeScriptConfigLoader(mockImporter)

      const source: ConfigSource = {
        type: 'file',
        location: '/test/config.ts',
        resolve: async () => ({}),
        isWatchable: () => false,
      }

      const result = await testLoader.load(source)
      expect(result).toEqual({})
      expect(consoleSpy).toHaveBeenCalledWith('default factory function failed:', expect.any(Error))

      consoleSpy.mockRestore()
    })

    it('should reject invalid config objects', async () => {
      const testCases = [
        { default: null },
        { default: undefined },
        { default: [] },
        { default: 'string' },
        { default: 123 },
        { default: true },
      ]

      for (const mockModule of testCases) {
        const mockImporter = mock(() => Promise.resolve(mockModule))
        const testLoader = new TypeScriptConfigLoader(mockImporter)

        const source: ConfigSource = {
          type: 'file',
          location: '/test/config.ts',
          resolve: async () => ({}),
          isWatchable: () => false,
        }

        const result = await testLoader.load(source)
        expect(result).toEqual({})
      }
    })

    it('should handle factory functions returning invalid objects', async () => {
      const testCases = [
        () => null,
        () => undefined,
        () => [],
        () => 'string',
        () => 123,
        () => true,
      ]

      for (const factory of testCases) {
        const mockModule = { default: factory }
        const mockImporter = mock(() => Promise.resolve(mockModule))
        const testLoader = new TypeScriptConfigLoader(mockImporter)

        const source: ConfigSource = {
          type: 'file',
          location: '/test/config.ts',
          resolve: async () => ({}),
          isWatchable: () => false,
        }

        const result = await testLoader.load(source)
        expect(result).toEqual({})
      }
    })
  })

  describe('real file integration', () => {
    it('should load real TypeScript config file', async () => {
      const configPath = join(testDir, 'real-config.ts')
      const configContent = `
        export default {
          database: {
            host: 'localhost',
            port: 5432
          },
          api: {
            version: 'v1',
            timeout: 5000
          }
        }
      `

      await writeFile(configPath, configContent, 'utf8')

      const loader = new TypeScriptConfigLoader()
      const source: ConfigSource = {
        type: 'file',
        location: configPath,
        resolve: async () => ({}),
        isWatchable: () => false,
      }

      try {
        const result = await loader.load(source)
        expect(result).toHaveProperty('database')
        expect(result).toHaveProperty('api')
        expect(result.database.host).toBe('localhost')
        expect(result.api.version).toBe('v1')
      } finally {
        await unlink(configPath)
      }
    })

    it('should load real JavaScript config file with factory function', async () => {
      const configPath = join(testDir, 'factory-config.js')
      const configContent = `
        export default function() {
          const env = 'test'
          return {
            environment: env,
            features: {
              logging: env !== 'production',
              debug: env === 'development'
            }
          }
        }
      `

      await writeFile(configPath, configContent, 'utf8')

      const loader = new TypeScriptConfigLoader()
      const source: ConfigSource = {
        type: 'file',
        location: configPath,
        resolve: async () => ({}),
        isWatchable: () => false,
      }

      try {
        const result = await loader.load(source)
        expect(result.environment).toBe('test')
        expect(result.features.logging).toBe(true)
        expect(result.features.debug).toBe(false)
      } finally {
        await unlink(configPath)
      }
    })
  })

  describe('edge cases', () => {
    it('should handle modules with circular references', async () => {
      const circular: any = { name: 'test' }
      circular.self = circular

      const mockModule = { default: circular }
      const mockImporter = mock(() => Promise.resolve(mockModule))
      const testLoader = new TypeScriptConfigLoader(mockImporter)

      const source: ConfigSource = {
        type: 'file',
        location: '/test/config.ts',
        resolve: async () => ({}),
        isWatchable: () => false,
      }

      const result = await testLoader.load(source)
      expect(result.name).toBe('test')
      expect(result.self).toBe(result)
    })

    it('should handle empty modules', async () => {
      const mockModule = {}
      const mockImporter = mock(() => Promise.resolve(mockModule))
      const testLoader = new TypeScriptConfigLoader(mockImporter)

      const source: ConfigSource = {
        type: 'file',
        location: '/test/config.ts',
        resolve: async () => ({}),
        isWatchable: () => false,
      }

      const result = await testLoader.load(source)
      expect(result).toEqual({})
    })

    it('should handle modules with only __esModule property', async () => {
      const mockModule = { __esModule: true }
      const mockImporter = mock(() => Promise.resolve(mockModule))
      const testLoader = new TypeScriptConfigLoader(mockImporter)

      const source: ConfigSource = {
        type: 'file',
        location: '/test/config.ts',
        resolve: async () => ({}),
        isWatchable: () => false,
      }

      const result = await testLoader.load(source)
      expect(result).toEqual({})
    })
  })
})
