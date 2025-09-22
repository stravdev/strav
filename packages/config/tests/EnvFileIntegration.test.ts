import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'bun:test'
import { join } from 'path'
import { EnvironmentConfigSource } from '../src/Sources/EnvironmentConfigSource'
import { EnvironmentConfigLoader } from '../src/Loaders/EnvironmentConfigLoader'
import { ConfigService } from '../src/Services/ConfigService'
import { ConfigSourceFactory } from '../src/Services/ConfigSourceFactory'

/**
 * Integration tests for the full .env file pipeline:
 * .env file → Bun (automatic loading) → process.env → EnvironmentConfigSource → EnvironmentConfigLoader → processed config
 * 
 * These tests verify that Bun's automatic .env file loading works correctly
 * with the config system's environment variable processing.
 */
describe('EnvFile Integration Tests', () => {
  let originalEnv: NodeJS.ProcessEnv
  let originalCwd: string
  const testFixturesDir = join(__dirname, 'fixtures')

  beforeAll(() => {
    // Store original environment and working directory
    originalEnv = { ...process.env }
    originalCwd = process.cwd()
  })

  afterAll(() => {
    // Restore original environment and working directory
    process.env = originalEnv
    process.chdir(originalCwd)
  })

  beforeEach(() => {
    // Clear test environment variables before each test
    for (const key in process.env) {
      if (key.startsWith('TEST_') || key.startsWith('APP_') || 
          key.startsWith('DATABASE_') || key.startsWith('API_') ||
          key.startsWith('SPECIAL_') || key.startsWith('UNICODE_') ||
          key.startsWith('MULTILINE_') || key.startsWith('EMPTY_') ||
          key.startsWith('NULL_') || key.includes('.')) {
        delete process.env[key]
      }
    }
  })

  afterEach(() => {
    // Clean up test environment variables after each test
    for (const key in process.env) {
      if (key.startsWith('TEST_') || key.startsWith('APP_') || 
          key.startsWith('DATABASE_') || key.startsWith('API_') ||
          key.startsWith('SPECIAL_') || key.startsWith('UNICODE_') ||
          key.startsWith('MULTILINE_') || key.startsWith('EMPTY_') ||
          key.startsWith('NULL_') || key.includes('.')) {
        delete process.env[key]
      }
    }
  })

  describe('Bun .env file loading verification', () => {
    it('should automatically load .env.test file when present', async () => {
      // Change to test fixtures directory where .env.test exists
      process.chdir(testFixturesDir)
      
      // Spawn a new Bun process to test .env loading - only capture specific variables
      const proc = Bun.spawn(['bun', '-e', `
        const envVars = {
          NODE_ENV: process.env.NODE_ENV,
          APP_NAME: process.env.APP_NAME,
          APP_VERSION: process.env.APP_VERSION,
          APP_DEBUG: process.env.APP_DEBUG,
          DATABASE_HOST: process.env.DATABASE_HOST
        };
        console.log(JSON.stringify(envVars));
      `], {
        cwd: testFixturesDir,
        env: { ...process.env, NODE_ENV: 'test' },
        stdout: 'pipe'
      })

      const output = await new Response(proc.stdout).text()
      await proc.exited

      const loadedEnv = JSON.parse(output.trim())

      // Verify that variables from .env.test are loaded
      expect(loadedEnv.NODE_ENV).toBe('test')
      expect(loadedEnv.APP_NAME).toBe('TestApp')
      expect(loadedEnv.APP_VERSION).toBe('1.0.0')
      expect(loadedEnv.APP_DEBUG).toBe('true')
      expect(loadedEnv.DATABASE_HOST).toBe('localhost')
    })

    it('should load different .env files based on NODE_ENV', async () => {
      process.chdir(testFixturesDir)
      
      // Test production environment
      const prodProc = Bun.spawn(['bun', '-e', `
        const envVars = {
          NODE_ENV: process.env.NODE_ENV,
          APP_NAME: process.env.APP_NAME,
          APP_DEBUG: process.env.APP_DEBUG
        };
        console.log(JSON.stringify(envVars));
      `], {
        cwd: testFixturesDir,
        env: { ...process.env, NODE_ENV: 'production' },
        stdout: 'pipe'
      })

      const prodOutput = await new Response(prodProc.stdout).text()
      await prodProc.exited

      const prodEnv = JSON.parse(prodOutput.trim())
      expect(prodEnv.NODE_ENV).toBe('production')
      expect(prodEnv.APP_NAME).toBe('ProductionApp')
      expect(prodEnv.APP_DEBUG).toBe('false')
    })

    it('should handle minimal .env files', async () => {
      process.chdir(testFixturesDir)
      
      const minimalProc = Bun.spawn(['bun', '--env-file=.env.minimal', '-e', `
        const envVars = {
          NODE_ENV: process.env.NODE_ENV,
          APP_NAME: process.env.APP_NAME
        };
        console.log(JSON.stringify(envVars));
      `], {
        cwd: testFixturesDir,
        env: { ...process.env, NODE_ENV: 'minimal' },
        stdout: 'pipe'
      })

      const minimalOutput = await new Response(minimalProc.stdout).text()
      await minimalProc.exited

      const minimalEnv = JSON.parse(minimalOutput.trim())
      expect(minimalEnv.NODE_ENV).toBe('minimal')
      expect(minimalEnv.APP_NAME).toBe('MinimalApp')
    })
  })

  describe('EnvironmentConfigSource integration with .env files', () => {
    it('should read environment variables loaded from .env files', async () => {
      // Manually set some variables to simulate Bun loading from .env
      process.env.NODE_ENV = 'test'
      process.env.APP_NAME = 'TestApp'
      process.env.APP_VERSION = '1.0.0'
      process.env.APP_DEBUG = 'true'
      process.env.APP_PORT = '3000'
      process.env.DATABASE_HOST = 'localhost'
      process.env.DATABASE_PORT = '5432'

      const source = new EnvironmentConfigSource()
      const result = await source.resolve()

      expect(result.NODE_ENV).toBe('test')
      expect(result.APP_NAME).toBe('TestApp')
      expect(result.APP_VERSION).toBe('1.0.0')
      expect(result.APP_DEBUG).toBe('true') // Raw string from process.env
      expect(result.APP_PORT).toBe('3000') // Raw string from process.env
      expect(result.DATABASE_HOST).toBe('localhost')
      expect(result.DATABASE_PORT).toBe('5432') // Raw string from process.env
    })

    it('should include source metadata for .env loaded variables', async () => {
      process.env.NODE_ENV = 'test'
      process.env.APP_NAME = 'TestApp'

      const source = new EnvironmentConfigSource()
      const result = await source.resolve()

      expect(result.__source).toEqual({
        type: 'env',
        location: 'env:*',
        lastModified: expect.any(String)
      })
    })
  })

  describe('EnvironmentConfigLoader integration with .env files', () => {
    it('should process .env loaded variables as strings only', async () => {
      // Simulate variables loaded from .env.test
      process.env.NODE_ENV = 'test'
      process.env.APP_NAME = 'TestApp'
      process.env.APP_DEBUG = 'true'
      process.env.APP_PORT = '3000'
      process.env.DATABASE_SSL = 'false'
      process.env.NULL_VALUE = 'null'

      const source = new EnvironmentConfigSource()
      const loader = new EnvironmentConfigLoader()
      
      const result = await loader.load(source)

      // Verify all values remain as strings (no type conversion)
      expect(result.NODE_ENV).toBe('test')
      expect(result.APP_NAME).toBe('TestApp')
      expect(result.APP_DEBUG).toBe('true') // Remains string
      expect(result.APP_PORT).toBe('3000') // Remains string
      expect(result.DATABASE_SSL).toBe('false') // Remains string
      expect(result.NULL_VALUE).toBe('null') // Remains string
    })

    it('should handle dot notation variables as flat keys', async () => {
      // Simulate nested variables from .env files (using different examples since cache.redis and logging were removed)
      process.env['database.credentials.username'] = 'admin'
      process.env['database.credentials.password'] = 'secret'
      process.env['api.endpoints.users'] = 'https://api.example.com/users'
      process.env['api.endpoints.orders'] = 'https://api.example.com/orders'

      const source = new EnvironmentConfigSource()
      const loader = new EnvironmentConfigLoader()
      
      const result = await loader.load(source)

      // Verify dot notation keys are preserved as flat keys
      expect(result['database.credentials.username']).toBe('admin')
      expect(result['database.credentials.password']).toBe('secret')
      expect(result['api.endpoints.users']).toBe('https://api.example.com/users')
      expect(result['api.endpoints.orders']).toBe('https://api.example.com/orders')
    })

    it('should handle special characters and edge cases from .env files', async () => {
      process.env.SPECIAL_CHARS = 'value with spaces & symbols! @#$%^&*()'
      process.env.UNICODE_VALUE = '🚀 Unicode test 中文'
      process.env.MULTILINE_VALUE = 'line1\\nline2\\nline3'
      process.env.EMPTY_VALUE = ''

      const source = new EnvironmentConfigSource()
      const loader = new EnvironmentConfigLoader()
      
      const result = await loader.load(source)

      expect(result.SPECIAL_CHARS).toBe('value with spaces & symbols! @#$%^&*()')
      expect(result.UNICODE_VALUE).toBe('🚀 Unicode test 中文')
      expect(result.MULTILINE_VALUE).toBe('line1\\nline2\\nline3')
      expect(result.EMPTY_VALUE).toBe('')
    })
  })

  describe('Full pipeline integration with ConfigService', () => {
    it('should work end-to-end with ConfigService', async () => {
      // Simulate a complete .env file being loaded
      process.env.NODE_ENV = 'test'
      process.env.APP_NAME = 'TestApp'
      process.env.APP_VERSION = '1.0.0'
      process.env.APP_DEBUG = 'true'
      process.env.APP_PORT = '3000'
      process.env.DATABASE_HOST = 'localhost'  // Using underscore notation (matches .env.test)
      process.env.DATABASE_PORT = '5432'       // Using underscore notation (matches .env.test)
      process.env.API_TIMEOUT = '5000'         // Using underscore notation (matches .env.test)

      const factory = new ConfigSourceFactory()
      const source = factory.createEnvironmentSource()
      const service = new ConfigService()

      await service.load(source)

      // Verify the full pipeline works (all values are strings)
      expect(service.isLoaded()).toBe(true)
      expect(service.get<string>('NODE_ENV')).toBe('test')
      expect(service.get<string>('APP_NAME')).toBe('TestApp')
      expect(service.get<string>('APP_DEBUG')).toBe('true') // String, not boolean
      expect(service.get<string>('APP_PORT')).toBe('3000') // String, not number
      expect(service.get<string>('DATABASE_HOST')).toBe('localhost')
      expect(service.get<string>('DATABASE_PORT')).toBe('5432') // String, not number
      expect(service.get<string>('API_TIMEOUT')).toBe('5000') // String, not number
    })

    it('should handle multiple environment sources with different priorities', async () => {
      // Simulate base environment
      process.env.NODE_ENV = 'test'
      process.env.APP_NAME = 'BaseApp'
      process.env.APP_VERSION = '1.0.0'
      process.env.DATABASE_HOST = 'localhost'

      // Simulate override environment (like from .env.local)
      process.env.APP_NAME = 'OverrideApp' // This should win
      process.env.APP_DEBUG = 'true'
      process.env.DATABASE_PORT = '5432'

      const factory = new ConfigSourceFactory()
      const source = factory.createEnvironmentSource()
      const service = new ConfigService()

      await service.load(source)

      expect(service.get<string>('NODE_ENV')).toBe('test')
      expect(service.get<string>('APP_NAME')).toBe('OverrideApp') // Override wins
      expect(service.get<string>('APP_VERSION')).toBe('1.0.0') // Base value
      expect(service.get<string>('APP_DEBUG')).toBe('true') // Override value (string)
      expect(service.get<string>('DATABASE_HOST')).toBe('localhost') // Base value
      expect(service.get<string>('DATABASE_PORT')).toBe('5432') // Override value (string)
    })

    it('should work with mixed configuration sources', async () => {
      // Environment variables (simulating .env file)
      process.env.NODE_ENV = 'test'
      process.env.APP_NAME = 'MixedApp'
      process.env.DATABASE_HOST = 'localhost'

      const factory = new ConfigSourceFactory()
      const envSource = factory.createEnvironmentSource()
      
      // Create a file source for additional config
      const configPath = join(__dirname, 'fixtures', 'additional-config.json')
      const fileSource = factory.createFileSource(configPath)

      const service = new ConfigService()
      await service.load([envSource, fileSource])

      // Environment variables should be processed as strings
      expect(service.get<string>('NODE_ENV')).toBe('test')
      expect(service.get<string>('APP_NAME')).toBe('MixedApp')
      expect(service.get<string>('DATABASE_HOST')).toBe('localhost')
    })
  })

  describe('Error handling in .env pipeline', () => {
    it('should handle JSON-like strings in environment variables as plain strings', async () => {
      process.env.VALID_JSON = '{"key": "value"}'
      process.env.INVALID_JSON = '{"invalid": json}'
      process.env.APP_NAME = 'TestApp'

      const source = new EnvironmentConfigSource()
      const loader = new EnvironmentConfigLoader()
      
      const result = await loader.load(source)

      // All values should remain as strings (no JSON parsing)
      expect(result.VALID_JSON).toBe('{"key": "value"}')
      expect(result.INVALID_JSON).toBe('{"invalid": json}')
      expect(result.APP_NAME).toBe('TestApp')
    })

    it('should handle missing .env files gracefully', async () => {
      // Clear all environment variables
      for (const key in process.env) {
        if (key.startsWith('TEST_') || key.startsWith('APP_')) {
          delete process.env[key]
        }
      }

      const factory = new ConfigSourceFactory()
      const envSource = factory.createEnvironmentSource()
      const loader = new EnvironmentConfigLoader()
      
      const result = await loader.load(envSource)

      // Should work even with no .env file
      expect(result.__source).toEqual({
        type: 'env',
        location: 'env:*',
        lastModified: expect.any(String)
      })
    })
  })
})