import { describe, it, expect, beforeEach } from 'bun:test'
import { ConfigSourceFactory } from '../src/Services/ConfigSourceFactory'
import { FileConfigSource } from '../src/Sources/FileConfigSource'
import { HttpConfigSource } from '../src/Sources/HttpConfigSource'
import { EnvironmentConfigSource } from '../src/Sources/EnvironmentConfigSource'
import type { FileSourceOptions } from '../src/Types/FileSourceOptions'
import type { HttpSourceOptions } from '../src/Types/HttpSourceOptions'

describe('ConfigSourceFactory', () => {
  let factory: ConfigSourceFactory

  beforeEach(() => {
    factory = new ConfigSourceFactory()
  })

  describe('constructor', () => {
    it('should create a factory instance', () => {
      expect(factory).toBeInstanceOf(ConfigSourceFactory)
    })

    it('should implement ConfigSourceFactory contract', () => {
      expect(typeof factory.createFileSource).toBe('function')
      expect(typeof factory.createHttpSource).toBe('function')
      expect(typeof factory.createEnvironmentSource).toBe('function')
    })
  })

  describe('createFileSource', () => {
    it('should create a FileConfigSource instance', () => {
      const path = './config/test.json'
      const expectedPath = require('path').resolve(process.cwd(), path)
      const source = factory.createFileSource(path)

      expect(source).toBeInstanceOf(FileConfigSource)
      expect(source.type).toBe('file')
      expect(source.location).toBe(expectedPath)
    })

    it('should create FileConfigSource with absolute path', () => {
      const path = '/absolute/path/to/config.json'
      const source = factory.createFileSource(path)

      expect(source).toBeInstanceOf(FileConfigSource)
      expect(source.location).toBe(path)
    })

    it('should create FileConfigSource with relative path', () => {
      const path = '../config/app.json'
      const expectedPath = require('path').resolve(process.cwd(), path)
      const source = factory.createFileSource(path)

      expect(source).toBeInstanceOf(FileConfigSource)
      expect(source.location).toBe(expectedPath)
    })

    it('should create FileConfigSource without options', () => {
      const path = './config.json'
      const expectedPath = require('path').resolve(process.cwd(), path)
      const source = factory.createFileSource(path)

      expect(source).toBeInstanceOf(FileConfigSource)
      expect(source.location).toBe(expectedPath)
    })

    it('should create FileConfigSource with options', () => {
      const path = './config.json'
      const expectedPath = require('path').resolve(process.cwd(), path)
      const options: FileSourceOptions = {
        encoding: 'utf8',
        watch: true
      }
      const source = factory.createFileSource(path, options)

      expect(source).toBeInstanceOf(FileConfigSource)
      expect(source.location).toBe(expectedPath)
    })

    it('should create FileConfigSource with custom encoding', () => {
      const path = './config.json'
      const expectedPath = require('path').resolve(process.cwd(), path)
      const options: FileSourceOptions = {
        encoding: 'ascii'
      }
      const source = factory.createFileSource(path, options)

      expect(source).toBeInstanceOf(FileConfigSource)
      expect(source.location).toBe(expectedPath)
    })

    it('should create FileConfigSource with watch disabled', () => {
      const path = './config.json'
      const expectedPath = require('path').resolve(process.cwd(), path)
      const options: FileSourceOptions = {
        watch: false
      }
      const source = factory.createFileSource(path, options)

      expect(source).toBeInstanceOf(FileConfigSource)
      expect(source.location).toBe(expectedPath)
    })

    it('should handle empty path string', () => {
      const path = ''
      const expectedPath = require('path').resolve(process.cwd(), path)
      const source = factory.createFileSource(path)

      expect(source).toBeInstanceOf(FileConfigSource)
      expect(source.location).toBe(expectedPath)
    })

    it('should handle path with special characters', () => {
      const path = './config with spaces & symbols!.json'
      const expectedPath = require('path').resolve(process.cwd(), path)
      const source = factory.createFileSource(path)

      expect(source).toBeInstanceOf(FileConfigSource)
      expect(source.location).toBe(expectedPath)
    })

    it('should create different instances for different calls', () => {
      const path = './config.json'
      const source1 = factory.createFileSource(path)
      const source2 = factory.createFileSource(path)

      expect(source1).toBeInstanceOf(FileConfigSource)
      expect(source2).toBeInstanceOf(FileConfigSource)
      expect(source1).not.toBe(source2) // Different instances
    })
  })

  describe('createHttpSource', () => {
    it('should create an HttpConfigSource instance', () => {
      const url = 'https://api.example.com/config'
      const source = factory.createHttpSource(url)

      expect(source).toBeInstanceOf(HttpConfigSource)
      expect(source.type).toBe('http')
      expect(source.location).toBe(url)
    })

    it('should create HttpConfigSource with HTTP URL', () => {
      const url = 'http://localhost:3000/config'
      const source = factory.createHttpSource(url)

      expect(source).toBeInstanceOf(HttpConfigSource)
      expect(source.location).toBe(url)
    })

    it('should create HttpConfigSource with HTTPS URL', () => {
      const url = 'https://secure.example.com/api/config'
      const source = factory.createHttpSource(url)

      expect(source).toBeInstanceOf(HttpConfigSource)
      expect(source.location).toBe(url)
    })

    it('should create HttpConfigSource without options', () => {
      const url = 'https://api.example.com/config'
      const source = factory.createHttpSource(url)

      expect(source).toBeInstanceOf(HttpConfigSource)
      expect(source.location).toBe(url)
    })

    it('should create HttpConfigSource with options', () => {
      const url = 'https://api.example.com/config'
      const options: HttpSourceOptions = {
        headers: { 'Authorization': 'Bearer token' },
        timeout: 5000
      }
      const source = factory.createHttpSource(url, options)

      expect(source).toBeInstanceOf(HttpConfigSource)
      expect(source.location).toBe(url)
    })

    it('should create HttpConfigSource with custom headers', () => {
      const url = 'https://api.example.com/config'
      const options: HttpSourceOptions = {
        headers: {
          'Authorization': 'Bearer token123',
          'Content-Type': 'application/json',
          'X-API-Key': 'secret-key'
        }
      }
      const source = factory.createHttpSource(url, options)

      expect(source).toBeInstanceOf(HttpConfigSource)
      expect(source.location).toBe(url)
    })

    it('should create HttpConfigSource with timeout', () => {
      const url = 'https://api.example.com/config'
      const options: HttpSourceOptions = {
        timeout: 10000
      }
      const source = factory.createHttpSource(url, options)

      expect(source).toBeInstanceOf(HttpConfigSource)
      expect(source.location).toBe(url)
    })

    it('should create HttpConfigSource with polling interval', () => {
      const url = 'https://api.example.com/config'
      const options: HttpSourceOptions = {
        pollInterval: 30000
      }
      const source = factory.createHttpSource(url, options)

      expect(source).toBeInstanceOf(HttpConfigSource)
      expect(source.location).toBe(url)
    })

    it('should create HttpConfigSource with all options', () => {
      const url = 'https://api.example.com/config'
      const options: HttpSourceOptions = {
        headers: { 'Authorization': 'Bearer token' },
        timeout: 5000,
        pollInterval: 60000
      }
      const source = factory.createHttpSource(url, options)

      expect(source).toBeInstanceOf(HttpConfigSource)
      expect(source.location).toBe(url)
    })

    it('should handle URL with query parameters', () => {
      const url = 'https://api.example.com/config?version=v1&format=json'
      const source = factory.createHttpSource(url)

      expect(source).toBeInstanceOf(HttpConfigSource)
      expect(source.location).toBe(url)
    })

    it('should handle URL with port', () => {
      const url = 'https://api.example.com:8443/config'
      const source = factory.createHttpSource(url)

      expect(source).toBeInstanceOf(HttpConfigSource)
      expect(source.location).toBe(url)
    })

    it('should create different instances for different calls', () => {
      const url = 'https://api.example.com/config'
      const source1 = factory.createHttpSource(url)
      const source2 = factory.createHttpSource(url)

      expect(source1).toBeInstanceOf(HttpConfigSource)
      expect(source2).toBeInstanceOf(HttpConfigSource)
      expect(source1).not.toBe(source2) // Different instances
    })
  })

  describe('createEnvironmentSource', () => {
    it('should create an EnvironmentConfigSource instance', () => {
      const source = factory.createEnvironmentSource()

      expect(source).toBeInstanceOf(EnvironmentConfigSource)
      expect(source.type).toBe('env')
      expect(source.location).toBe('env:*')
    })

    it('should create EnvironmentConfigSource without parameters', () => {
      const source = factory.createEnvironmentSource()

      expect(source).toBeInstanceOf(EnvironmentConfigSource)
    })

    it('should create different instances for different calls', () => {
      const source1 = factory.createEnvironmentSource()
      const source2 = factory.createEnvironmentSource()

      expect(source1).toBeInstanceOf(EnvironmentConfigSource)
      expect(source2).toBeInstanceOf(EnvironmentConfigSource)
      expect(source1).not.toBe(source2) // Different instances
    })

    it('should always return the same type and location', () => {
      const source1 = factory.createEnvironmentSource()
      const source2 = factory.createEnvironmentSource()

      expect(source1.type).toBe('env')
      expect(source2.type).toBe('env')
      expect(source1.location).toBe('env:*')
      expect(source2.location).toBe('env:*')
    })
  })

  describe('factory behavior', () => {
    it('should create independent instances', () => {
      const fileSource1 = factory.createFileSource('./config1.json')
      const fileSource2 = factory.createFileSource('./config2.json')
      const httpSource = factory.createHttpSource('https://api.example.com/config')
      const envSource = factory.createEnvironmentSource()

      // All should be different instances
      expect(fileSource1).not.toBe(fileSource2)
      expect(fileSource1).not.toBe(httpSource)
      expect(fileSource1).not.toBe(envSource)
      expect(httpSource).not.toBe(envSource)

      // But should be correct types
      expect(fileSource1).toBeInstanceOf(FileConfigSource)
      expect(fileSource2).toBeInstanceOf(FileConfigSource)
      expect(httpSource).toBeInstanceOf(HttpConfigSource)
      expect(envSource).toBeInstanceOf(EnvironmentConfigSource)
    })

    it('should maintain consistent behavior across multiple calls', () => {
      const path = './test-config.json'
      const url = 'https://test.example.com/config'
      const expectedPath = require('path').resolve(process.cwd(), path)

      // Create multiple instances
      for (let i = 0; i < 5; i++) {
        const fileSource = factory.createFileSource(path)
        const httpSource = factory.createHttpSource(url)
        const envSource = factory.createEnvironmentSource()

        expect(fileSource).toBeInstanceOf(FileConfigSource)
        expect(fileSource.location).toBe(expectedPath)

        expect(httpSource).toBeInstanceOf(HttpConfigSource)
        expect(httpSource.location).toBe(url)

        expect(envSource).toBeInstanceOf(EnvironmentConfigSource)
        expect(envSource.location).toBe('env:*')
      }
    })

    it('should handle concurrent source creation', () => {
      const sources = []

      // Create sources concurrently
      for (let i = 0; i < 10; i++) {
        sources.push(factory.createFileSource(`./config${i}.json`))
        sources.push(factory.createHttpSource(`https://api${i}.example.com/config`))
        sources.push(factory.createEnvironmentSource())
      }

      // Verify all sources were created correctly
      expect(sources).toHaveLength(30)

      for (let i = 0; i < 10; i++) {
        const fileIndex = i * 3
        const httpIndex = i * 3 + 1
        const envIndex = i * 3 + 2

        expect(sources[fileIndex]).toBeInstanceOf(FileConfigSource)
        expect(sources[httpIndex]).toBeInstanceOf(HttpConfigSource)
        expect(sources[envIndex]).toBeInstanceOf(EnvironmentConfigSource)
      }
    })
  })
})