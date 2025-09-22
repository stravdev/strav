import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from 'bun:test'
import { EnvironmentConfigSource } from '../src/Sources/EnvironmentConfigSource'

describe('EnvironmentConfigSource', () => {
  let originalEnv: NodeJS.ProcessEnv
  
  beforeAll(() => {
    // Store original environment
    originalEnv = { ...process.env }
  })

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv
  })

  beforeEach(() => {
    // Clear test environment variables before each test
    for (const key in process.env) {
      if (key.startsWith('TEST_') || key.startsWith('APP_') || key.startsWith('DB_')) {
        delete process.env[key]
      }
    }
  })

  afterEach(() => {
    // Clean up test environment variables
    for (const key in process.env) {
      if (key.startsWith('TEST_') || key.startsWith('APP_') || key.startsWith('DB_')) {
        delete process.env[key]
      }
    }
  })

  describe('constructor', () => {
    it('should create instance with default values', () => {
      const source = new EnvironmentConfigSource()
      
      expect(source.type).toBe('env')
      expect(source.location).toBe('env:*')
    })
  })

  describe('resolve', () => {
    describe('basic functionality', () => {
      it('should resolve all environment variables', async () => {
        process.env.TEST_VAR1 = 'value1'
        process.env.TEST_VAR2 = 'value2'
        process.env.OTHER_VAR = 'other'

        const source = new EnvironmentConfigSource()
        const result = await source.resolve()

        expect(result.TEST_VAR1).toBe('value1')
        expect(result.TEST_VAR2).toBe('value2')
        expect(result.OTHER_VAR).toBe('other')
        expect(result.__source).toEqual({
          type: 'env',
          location: 'env:*',
          lastModified: expect.any(String)
        })
      })

      it('should skip undefined environment variables', async () => {
        process.env.TEST_VAR1 = 'value1'
        process.env.TEST_VAR2 = undefined

        const source = new EnvironmentConfigSource()
        const result = await source.resolve()

        expect(result.TEST_VAR1).toBe('value1')
        expect(result.TEST_VAR2).toBeUndefined()
        expect('TEST_VAR2' in result).toBe(false)
      })
    })

    describe('value handling', () => {
      it('should return all values as strings (no parsing)', async () => {
        process.env.TEST_TRUE = 'true'
        process.env.TEST_FALSE = 'false'
        process.env.TEST_TRUE_UPPER = 'TRUE'
        process.env.TEST_FALSE_UPPER = 'FALSE'

        const source = new EnvironmentConfigSource()
        const result = await source.resolve()

        expect(result.TEST_TRUE).toBe('true')
        expect(result.TEST_FALSE).toBe('false')
        expect(result.TEST_TRUE_UPPER).toBe('TRUE')
        expect(result.TEST_FALSE_UPPER).toBe('FALSE')
      })

      it('should return numeric values as strings', async () => {
        process.env.TEST_INT = '42'
        process.env.TEST_NEGATIVE = '-123'
        process.env.TEST_ZERO = '0'

        const source = new EnvironmentConfigSource()
        const result = await source.resolve()

        expect(result.TEST_INT).toBe('42')
        expect(result.TEST_NEGATIVE).toBe('-123')
        expect(result.TEST_ZERO).toBe('0')
      })

      it('should return float values as strings', async () => {
        process.env.TEST_FLOAT = '3.14'
        process.env.TEST_NEGATIVE_FLOAT = '-2.5'
        process.env.TEST_ZERO_FLOAT = '0.0'

        const source = new EnvironmentConfigSource()
        const result = await source.resolve()

        expect(result.TEST_FLOAT).toBe('3.14')
        expect(result.TEST_NEGATIVE_FLOAT).toBe('-2.5')
        expect(result.TEST_ZERO_FLOAT).toBe('0.0')
      })

      it('should return JSON-like values as strings', async () => {
        process.env.TEST_ARRAY = '["item1", "item2", "item3"]'
        process.env.TEST_OBJECT = '{"key": "value", "number": 42}'
        process.env.TEST_INVALID_JSON = '{"invalid": json}'

        const source = new EnvironmentConfigSource()
        const result = await source.resolve()

        expect(result.TEST_ARRAY).toBe('["item1", "item2", "item3"]')
        expect(result.TEST_OBJECT).toBe('{"key": "value", "number": 42}')
        expect(result.TEST_INVALID_JSON).toBe('{"invalid": json}')
      })

      it('should preserve all strings including those with leading zeros', async () => {
        process.env.TEST_LEADING_ZERO = '0123'
        process.env.TEST_FLOAT_LEADING_ZERO = '0.123'
        process.env.TEST_ZERO = '0'
        process.env.TEST_ZERO_FLOAT = '0.0'

        const source = new EnvironmentConfigSource()
        const result = await source.resolve()

        expect(result.TEST_LEADING_ZERO).toBe('0123')
        expect(result.TEST_FLOAT_LEADING_ZERO).toBe('0.123')
        expect(result.TEST_ZERO).toBe('0')
        expect(result.TEST_ZERO_FLOAT).toBe('0.0')
      })

      it('should handle string values', async () => {
        process.env.TEST_STRING = 'hello world'
        process.env.TEST_EMPTY = ''
        process.env.TEST_SPACES = '   spaces   '

        const source = new EnvironmentConfigSource()
        const result = await source.resolve()

        expect(result.TEST_STRING).toBe('hello world')
        expect(result.TEST_EMPTY).toBe('')
        expect(result.TEST_SPACES).toBe('   spaces   ')
      })
    })

    describe('complex scenarios', () => {
      it('should handle mixed configuration types as strings', async () => {
        process.env.APP_DEBUG = 'true'
        process.env.APP_PORT = '3000'
        process.env.APP_NAME = 'MyApp'
        process.env.APP_FEATURES = '["auth", "logging"]'
        process.env.APP_CONFIG = '{"timeout": 5000}'

        const source = new EnvironmentConfigSource()
        const result = await source.resolve()

        expect(result.APP_DEBUG).toBe('true')
        expect(result.APP_PORT).toBe('3000')
        expect(result.APP_NAME).toBe('MyApp')
        expect(result.APP_FEATURES).toBe('["auth", "logging"]')
        expect(result.APP_CONFIG).toBe('{"timeout": 5000}')
      })

      it('should handle empty environment', async () => {
        // Clear all TEST_ prefixed variables
        for (const key in process.env) {
          if (key.startsWith('TEST_')) {
            delete process.env[key]
          }
        }

        const source = new EnvironmentConfigSource()
        const result = await source.resolve()

        // Should only have __source and other system environment variables
        expect(result.__source).toEqual({
          type: 'env',
          location: 'env:*',
          lastModified: expect.any(String)
        })
        
        // Should not have any TEST_ variables
        const testKeys = Object.keys(result).filter(key => key.startsWith('TEST_'))
        expect(testKeys).toHaveLength(0)
      })
    })
  })

  describe('watch', () => {
    it('should throw error when trying to watch', () => {
      const source = new EnvironmentConfigSource()
      
      expect(() => {
        source.watch(() => {})
      }).toThrow('Environment variables do not support watching')
    })
  })

  describe('isWatchable', () => {
    it('should return false', () => {
      const source = new EnvironmentConfigSource()
      
      expect(source.isWatchable()).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should handle very long variable names', async () => {
      const longName = 'TEST_' + 'A'.repeat(1000)
      process.env[longName] = 'long_value'

      const source = new EnvironmentConfigSource()
      const result = await source.resolve()

      expect(result[longName]).toBe('long_value')
    })

    it('should handle special characters in values', async () => {
      process.env.TEST_SPECIAL = 'value with spaces & symbols! @#$%^&*()'
      process.env.TEST_UNICODE = '🚀 Unicode test 中文'
      process.env.TEST_NEWLINES = 'line1\nline2\nline3'

      const source = new EnvironmentConfigSource()
      const result = await source.resolve()

      expect(result.TEST_SPECIAL).toBe('value with spaces & symbols! @#$%^&*()')
      expect(result.TEST_UNICODE).toBe('🚀 Unicode test 中文')
      expect(result.TEST_NEWLINES).toBe('line1\nline2\nline3')
    })

    it('should handle numeric-like strings that should remain strings', async () => {
      process.env.TEST_PHONE = '0123456789'
      process.env.TEST_ZIP = '01234'
      process.env.TEST_VERSION = '1.0.0'

      const source = new EnvironmentConfigSource()
      const result = await source.resolve()

      expect(result.TEST_PHONE).toBe('0123456789') // Leading zero preserved
      expect(result.TEST_ZIP).toBe('01234') // Leading zero preserved
      expect(result.TEST_VERSION).toBe('1.0.0') // Not a valid float pattern
    })

    it('should handle mixed case values as strings', async () => {
      process.env.TEST_BOOL1 = 'True'
      process.env.TEST_BOOL2 = 'False'
      process.env.TEST_BOOL3 = 'tRuE'
      process.env.TEST_BOOL4 = 'fAlSe'

      const source = new EnvironmentConfigSource()
      const result = await source.resolve()

      expect(result.TEST_BOOL1).toBe('True')
      expect(result.TEST_BOOL2).toBe('False')
      expect(result.TEST_BOOL3).toBe('tRuE')
      expect(result.TEST_BOOL4).toBe('fAlSe')
    })
  })
})