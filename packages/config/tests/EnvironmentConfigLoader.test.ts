import { describe, it, expect, beforeEach, mock } from 'bun:test'
import { EnvironmentConfigLoader } from '../src/Loaders/EnvironmentConfigLoader'
import type { ConfigSource } from '../src/Contracts/ConfigSource'
import { UnsupportedFormatException } from '../src/Exceptions/UnsupportedFormatException'
import { ConfigLoadException } from '../src/Exceptions/ConfigLoadException'

describe('EnvironmentConfigLoader', () => {
  let loader: EnvironmentConfigLoader

  beforeEach(() => {
    loader = new EnvironmentConfigLoader()
  })

  describe('supportedFormats', () => {
    it('should have correct supported formats', () => {
      expect(loader.supportedFormats).toEqual(['env', 'environment'])
    })
  })

  describe('canLoad', () => {
    it('should return true for env source type', () => {
      const source: ConfigSource = {
        type: 'env',
        location: 'environment',
        resolve: mock(),
        isWatchable: () => false,
      }

      expect(loader.canLoad(source)).toBe(true)
    })

    it('should return false for non-env source types', () => {
      const sourceTypes = ['file', 'http', 'memory', 'database', 'json', 'yaml']
      
      sourceTypes.forEach(type => {
        const source: ConfigSource = {
          type,
          location: 'some-location',
          resolve: mock(),
          isWatchable: () => false,
        }

        expect(loader.canLoad(source)).toBe(false)
      })
    })

    it('should return false for empty source type', () => {
      const source: ConfigSource = {
        type: '',
        location: 'environment',
        resolve: mock(),
        isWatchable: () => false,
      }

      expect(loader.canLoad(source)).toBe(false)
    })

    it('should return false for undefined source type', () => {
      const source: ConfigSource = {
        type: undefined as any,
        location: 'environment',
        resolve: mock(),
        isWatchable: () => false,
      }

      expect(loader.canLoad(source)).toBe(false)
    })
  })

  describe('load - successful cases', () => {
    it('should load basic environment configuration as strings', async () => {
      const mockEnvData = {
        NODE_ENV: 'test',
        PORT: '3000',
        DEBUG: 'true',
        __source: { type: 'env', location: 'environment' }
      }

      const source: ConfigSource = {
        type: 'env',
        location: 'environment',
        resolve: mock().mockResolvedValue(mockEnvData),
        isWatchable: () => false,
      }

      const result = await loader.load(source)

      expect(result).toEqual({
        NODE_ENV: 'test',
        PORT: '3000',
        DEBUG: 'true',
        __source: { type: 'env', location: 'environment' }
      })
    })

    it('should handle environment variables with dot notation as flat keys', async () => {
      const mockEnvData = {
        'database.host': 'localhost',
        'database.port': '5432',
        'app.name': 'test-app',
        __source: { type: 'env', location: 'environment' }
      }

      const source: ConfigSource = {
        type: 'env',
        location: 'environment',
        resolve: mock().mockResolvedValue(mockEnvData),
        isWatchable: () => false,
      }

      const result = await loader.load(source)

      expect(result).toEqual({
        'database.host': 'localhost',
        'database.port': '5432',
        'app.name': 'test-app',
        __source: { type: 'env', location: 'environment' }
      })
    })

    it('should filter out undefined values', async () => {
      const mockEnvData = {
        DEFINED_VAR: 'value',
        UNDEFINED_VAR: undefined,
        EMPTY_VAR: '',
        NULL_VAR: 'null',
        __source: { type: 'env', location: 'environment' }
      }

      const source: ConfigSource = {
        type: 'env',
        location: 'environment',
        resolve: mock().mockResolvedValue(mockEnvData),
        isWatchable: () => false,
      }

      const result = await loader.load(source)

      expect(result).toEqual({
        DEFINED_VAR: 'value',
        EMPTY_VAR: '',
        NULL_VAR: 'null',
        __source: { type: 'env', location: 'environment' }
      })
      expect(result).not.toHaveProperty('UNDEFINED_VAR')
    })

    it('should handle empty environment data', async () => {
      const mockEnvData = {
        __source: { type: 'env', location: 'environment' }
      }

      const source: ConfigSource = {
        type: 'env',
        location: 'environment',
        resolve: mock().mockResolvedValue(mockEnvData),
        isWatchable: () => false,
      }

      const result = await loader.load(source)

      expect(result).toEqual({
        __source: { type: 'env', location: 'environment' }
      })
    })

    it('should preserve source metadata', async () => {
      const mockEnvData = {
        TEST_VAR: 'value',
        __source: { 
          type: 'env', 
          location: 'environment',
          timestamp: '2024-01-01T00:00:00Z'
        }
      }

      const source: ConfigSource = {
        type: 'env',
        location: 'environment',
        resolve: mock().mockResolvedValue(mockEnvData),
        isWatchable: () => false,
      }

      const result = await loader.load(source)

      expect(result.__source).toEqual({
        type: 'env',
        location: 'environment',
        timestamp: '2024-01-01T00:00:00Z'
      })
    })
  })

  describe('load - error cases', () => {
    it('should throw UnsupportedFormatException for unsupported source types', async () => {
      const source: ConfigSource = {
        type: 'file',
        location: '/path/to/config.json',
        resolve: mock(),
        isWatchable: () => false,
      }

      await expect(loader.load(source)).rejects.toThrow(UnsupportedFormatException)
      await expect(loader.load(source)).rejects.toThrow(
        'Environment loader cannot handle source type: file'
      )
    })

    it('should throw ConfigLoadException when source resolution fails', async () => {
      const source: ConfigSource = {
        type: 'env',
        location: 'environment',
        resolve: mock().mockRejectedValue(new Error('Source resolution failed')),
        isWatchable: () => false,
      }

      await expect(loader.load(source)).rejects.toThrow(ConfigLoadException)
      await expect(loader.load(source)).rejects.toThrow(
        'Failed to load environment configuration: Source resolution failed'
      )
    })

    it('should re-throw ConfigLoadException without wrapping', async () => {
      const originalError = new ConfigLoadException('Original error', 'test-location')
      const source: ConfigSource = {
        type: 'env',
        location: 'environment',
        resolve: mock().mockRejectedValue(originalError),
        isWatchable: () => false,
      }

      await expect(loader.load(source)).rejects.toThrow(originalError)
    })

    it('should re-throw UnsupportedFormatException without wrapping', async () => {
      const originalError = new UnsupportedFormatException('Original error', 'test-format')
      const source: ConfigSource = {
        type: 'env',
        location: 'environment',
        resolve: mock().mockRejectedValue(originalError),
        isWatchable: () => false,
      }

      await expect(loader.load(source)).rejects.toThrow(originalError)
    })

    it('should handle unknown errors gracefully', async () => {
      const source: ConfigSource = {
        type: 'env',
        location: 'environment',
        resolve: mock().mockRejectedValue('String error'),
        isWatchable: () => false,
      }

      await expect(loader.load(source)).rejects.toThrow(ConfigLoadException)
      await expect(loader.load(source)).rejects.toThrow(
        'Failed to load environment configuration: Unknown error'
      )
    })
  })
})