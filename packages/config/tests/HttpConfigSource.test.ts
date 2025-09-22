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
import { HttpConfigSource } from '../src/Sources/HttpConfigSource'
import type { HttpSourceOptions } from '../src/Types/HttpSourceOptions'
import { InvalidSourceException } from '../src/Exceptions/InvalidSourceException'

// Mock fetch globally
const mockFetch = mock()
global.fetch = mockFetch as any

// Mock timers
const mockSetInterval = mock()
const mockClearInterval = mock()
const mockSetTimeout = mock()
const mockClearTimeout = mock()

global.setInterval = mockSetInterval as any
global.clearInterval = mockClearInterval as any
global.setTimeout = mockSetTimeout as any
global.clearTimeout = mockClearTimeout as any

describe('HttpConfigSource', () => {
  const testUrl = 'https://api.example.com/config'
  const mockConfigData = {
    database: {
      host: 'localhost',
      port: 5432,
    },
    features: ['auth', 'logging'],
    debug: true,
  }

  beforeEach(() => {
    // Reset all mocks before each test
    mockFetch.mockReset()
    mockSetInterval.mockReset()
    mockClearInterval.mockReset()
    mockSetTimeout.mockReset()
    mockClearTimeout.mockReset()
    
  })

  afterEach(() => {
    // Clean up any remaining timers and mocks
  })

  describe('constructor', () => {
    it('should create instance with URL only', () => {
      const source = new HttpConfigSource(testUrl)
      
      expect(source.type).toBe('http')
      expect(source.location).toBe(testUrl)
      expect(source.options).toEqual({})
    })

    it('should create instance with URL and options', () => {
      const options: HttpSourceOptions = {
        headers: { 'Authorization': 'Bearer token' },
        timeout: 5000,
        pollInterval: 30000,
      }
      
      const source = new HttpConfigSource(testUrl, options)
      
      expect(source.type).toBe('http')
      expect(source.location).toBe(testUrl)
      expect(source.options).toEqual(options)
    })

    it('should create instance with empty options object', () => {
      const source = new HttpConfigSource(testUrl, {})
      
      expect(source.type).toBe('http')
      expect(source.location).toBe(testUrl)
      expect(source.options).toEqual({})
    })
  })

  describe('resolve', () => {
    describe('successful responses', () => {
      it('should fetch and parse JSON configuration', async () => {
        const mockResponse = {
          ok: true,
          status: 200,
          statusText: 'OK',
          json: mock().mockResolvedValue(mockConfigData),
        }
        mockFetch.mockResolvedValue(mockResponse)

        const source = new HttpConfigSource(testUrl)
        const result = await source.resolve()

        expect(mockFetch).toHaveBeenCalledWith(testUrl, {
          headers: undefined,
          signal: expect.any(AbortSignal),
        })
        expect(result).toEqual({
          ...mockConfigData,
          __source: {
            type: 'http',
            location: testUrl,
            lastModified: expect.any(String),
          },
        })
      })

      it('should include custom headers in request', async () => {
        const headers = { 'Authorization': 'Bearer token', 'Content-Type': 'application/json' }
        const mockResponse = {
          ok: true,
          status: 200,
          statusText: 'OK',
          json: mock().mockResolvedValue(mockConfigData),
        }
        mockFetch.mockResolvedValue(mockResponse)

        const source = new HttpConfigSource(testUrl, { headers })
        await source.resolve()

        expect(mockFetch).toHaveBeenCalledWith(testUrl, {
          headers,
          signal: expect.any(AbortSignal),
        })
      })

      it('should handle timeout configuration', async () => {
        const timeout = 5000
        const mockResponse = {
          ok: true,
          status: 200,
          statusText: 'OK',
          json: mock().mockResolvedValue(mockConfigData),
        }
        mockFetch.mockResolvedValue(mockResponse)
        mockSetTimeout.mockReturnValue('timeout-id')

        const source = new HttpConfigSource(testUrl, { timeout })
        await source.resolve()

        expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), timeout)
        expect(mockClearTimeout).toHaveBeenCalledWith('timeout-id')
      })

      it('should handle non-object JSON responses', async () => {
        const primitiveResponse = 'simple string'
        const mockResponse = {
          ok: true,
          status: 200,
          statusText: 'OK',
          json: mock().mockResolvedValue(primitiveResponse),
        }
        mockFetch.mockResolvedValue(mockResponse)

        const source = new HttpConfigSource(testUrl)
        const result = await source.resolve()

        expect(result).toEqual({
          __source: {
            type: 'http',
            location: testUrl,
            lastModified: expect.any(String),
          },
        })
      })

      it('should handle null JSON responses', async () => {
        const mockResponse = {
          ok: true,
          status: 200,
          statusText: 'OK',
          json: mock().mockResolvedValue(null),
        }
        mockFetch.mockResolvedValue(mockResponse)

        const source = new HttpConfigSource(testUrl)
        const result = await source.resolve()

        expect(result).toEqual({
          __source: {
            type: 'http',
            location: testUrl,
            lastModified: expect.any(String),
          },
        })
      })

      it('should handle empty object responses', async () => {
        const mockResponse = {
          ok: true,
          status: 200,
          statusText: 'OK',
          json: mock().mockResolvedValue({}),
        }
        mockFetch.mockResolvedValue(mockResponse)

        const source = new HttpConfigSource(testUrl)
        const result = await source.resolve()

        expect(result).toEqual({
          __source: {
            type: 'http',
            location: testUrl,
            lastModified: expect.any(String),
          },
        })
      })
    })

    describe('error handling', () => {
      it('should throw InvalidSourceException for HTTP errors', async () => {
        const mockResponse = {
          ok: false,
          status: 404,
          statusText: 'Not Found',
        }
        mockFetch.mockResolvedValue(mockResponse)

        const source = new HttpConfigSource(testUrl)
        
        await expect(source.resolve()).rejects.toThrow(InvalidSourceException)
        await expect(source.resolve()).rejects.toThrow('Cannot fetch from URL: https://api.example.com/config - HTTP 404: Not Found')
      })

      it('should throw InvalidSourceException for network errors', async () => {
        const networkError = new Error('Network error')
        mockFetch.mockRejectedValue(networkError)

        const source = new HttpConfigSource(testUrl)
        
        await expect(source.resolve()).rejects.toThrow(InvalidSourceException)
        await expect(source.resolve()).rejects.toThrow('Cannot fetch from URL: https://api.example.com/config - Network error')
      })

      it('should handle timeout errors', async () => {
        const timeoutError = new Error('The operation was aborted')
        mockFetch.mockRejectedValue(timeoutError)

        const source = new HttpConfigSource(testUrl, { timeout: 1000 })
        
        await expect(source.resolve()).rejects.toThrow(InvalidSourceException)
        await expect(source.resolve()).rejects.toThrow('Cannot fetch from URL: https://api.example.com/config - The operation was aborted')
      })

      it('should handle JSON parsing errors', async () => {
        const mockResponse = {
          ok: true,
          status: 200,
          statusText: 'OK',
          json: mock().mockRejectedValue(new Error('Invalid JSON')),
        }
        mockFetch.mockResolvedValue(mockResponse)

        const source = new HttpConfigSource(testUrl)
        
        await expect(source.resolve()).rejects.toThrow(InvalidSourceException)
        await expect(source.resolve()).rejects.toThrow('Cannot fetch from URL: https://api.example.com/config - Invalid JSON')
      })

      it('should handle unknown errors', async () => {
        mockFetch.mockRejectedValue('Unknown error')

        const source = new HttpConfigSource(testUrl)
        
        await expect(source.resolve()).rejects.toThrow(InvalidSourceException)
        await expect(source.resolve()).rejects.toThrow('Cannot fetch from URL: https://api.example.com/config - Unknown error')
      })
    })
  })

  describe('watch', () => {
    it('should throw error when pollInterval is not configured', () => {
      const source = new HttpConfigSource(testUrl)
      const callback = mock()

      expect(() => {
        source.watch(callback)
      }).toThrow('Polling interval not configured for HTTP source watching')
    })

    it('should setup polling when pollInterval is configured', () => {
      const pollInterval = 5000
      const source = new HttpConfigSource(testUrl, { pollInterval })
      const callback = mock()
      mockSetInterval.mockReturnValue('interval-id')

      const unsubscribe = source.watch(callback)

      expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), pollInterval)
      expect(typeof unsubscribe).toBe('function')
    })

    it('should not setup multiple timers for multiple callbacks', () => {
      const pollInterval = 5000
      const source = new HttpConfigSource(testUrl, { pollInterval })
      const callback1 = mock()
      const callback2 = mock()
      mockSetInterval.mockReturnValue('interval-id')

      source.watch(callback1)
      source.watch(callback2)

      expect(mockSetInterval).toHaveBeenCalledTimes(1)
    })

    it('should return unsubscribe function that removes callback', () => {
      const pollInterval = 5000
      const source = new HttpConfigSource(testUrl, { pollInterval })
      const callback = mock()
      mockSetInterval.mockReturnValue('interval-id')

      const unsubscribe = source.watch(callback)
      unsubscribe()

      expect(mockClearInterval).toHaveBeenCalledWith('interval-id')
    })

    it('should not clear timer if other callbacks are still active', () => {
      const pollInterval = 5000
      const source = new HttpConfigSource(testUrl, { pollInterval })
      const callback1 = mock()
      const callback2 = mock()
      mockSetInterval.mockReturnValue('interval-id')

      const unsubscribe1 = source.watch(callback1)
      const unsubscribe2 = source.watch(callback2)
      
      unsubscribe1()
      expect(mockClearInterval).not.toHaveBeenCalled()
      
      unsubscribe2()
      expect(mockClearInterval).toHaveBeenCalledWith('interval-id')
    })

    it('should handle polling errors gracefully', async () => {
      const pollInterval = 1000
      const source = new HttpConfigSource(testUrl, { pollInterval })
      const callback = mock()
      
      // Mock setInterval to capture the polling function
      let pollingFunction: Function | undefined
      mockSetInterval.mockImplementation((fn) => {
        pollingFunction = fn
        return 'interval-id'
      })
      
      // Mock resolve to throw an error
      const originalResolve = source.resolve
      source.resolve = mock().mockRejectedValue(new Error('Polling error'))

      source.watch(callback)
      
      // Manually execute the polling function and expect it to throw
      expect(pollingFunction).toBeDefined()
      if (pollingFunction) {
        await expect(pollingFunction()).rejects.toThrow(InvalidSourceException)
      }
      
      source.resolve = originalResolve
    })

    it('should handle callback errors gracefully', async () => {
      const pollInterval = 1000
      const source = new HttpConfigSource(testUrl, { pollInterval })
      const errorCallback = mock().mockImplementation(() => {
        throw new Error('Callback error')
      })
      
      // Mock successful resolve
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: mock().mockResolvedValue(mockConfigData),
      }
      mockFetch.mockResolvedValue(mockResponse)
      
      // Mock setInterval to capture the polling function
      let pollingFunction: Function | undefined
      mockSetInterval.mockImplementation((fn) => {
        pollingFunction = fn
        return 'interval-id'
      })

      source.watch(errorCallback)
      
      // Manually execute the polling function and expect it to throw
      expect(pollingFunction).toBeDefined()
      if (pollingFunction) {
        await expect(pollingFunction()).rejects.toThrow(InvalidSourceException)
      }
    })
  })

  describe('isWatchable', () => {
    it('should return false when pollInterval is not configured', () => {
      const source = new HttpConfigSource(testUrl)
      
      expect(source.isWatchable()).toBe(false)
    })

    it('should return false when pollInterval is 0', () => {
      const source = new HttpConfigSource(testUrl, { pollInterval: 0 })
      
      expect(source.isWatchable()).toBe(false)
    })

    it('should return true when pollInterval is configured', () => {
      const source = new HttpConfigSource(testUrl, { pollInterval: 5000 })
      
      expect(source.isWatchable()).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle very long URLs', async () => {
      const longUrl = 'https://api.example.com/' + 'a'.repeat(1000)
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: mock().mockResolvedValue(mockConfigData),
      }
      mockFetch.mockResolvedValue(mockResponse)

      const source = new HttpConfigSource(longUrl)
      const result = await source.resolve()

      expect(result.__source.location).toBe(longUrl)
    })

    it('should handle special characters in URLs', async () => {
      const specialUrl = 'https://api.example.com/config?param=value&other=test%20data'
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: mock().mockResolvedValue(mockConfigData),
      }
      mockFetch.mockResolvedValue(mockResponse)

      const source = new HttpConfigSource(specialUrl)
      await source.resolve()

      expect(mockFetch).toHaveBeenCalledWith(specialUrl, expect.any(Object))
    })

    it('should handle multiple simultaneous resolve calls', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: mock().mockResolvedValue(mockConfigData),
      }
      mockFetch.mockResolvedValue(mockResponse)

      const source = new HttpConfigSource(testUrl)
      
      const promises = [
        source.resolve(),
        source.resolve(),
        source.resolve(),
      ]
      
      const results = await Promise.all(promises)
      
      expect(results).toHaveLength(3)
      expect(mockFetch).toHaveBeenCalledTimes(3)
      results.forEach(result => {
        expect(result).toEqual({
          ...mockConfigData,
          __source: {
            type: 'http',
            location: testUrl,
            lastModified: expect.any(String),
          },
        })
      })
    })

    it('should properly cleanup resources on multiple unsubscribes', () => {
      const pollInterval = 5000
      const source = new HttpConfigSource(testUrl, { pollInterval })
      const callback = mock()
      mockSetInterval.mockReturnValue('interval-id')

      const unsubscribe = source.watch(callback)
      
      // Call unsubscribe multiple times
      unsubscribe()
      unsubscribe()
      unsubscribe()

      expect(mockClearInterval).toHaveBeenCalledTimes(1)
      expect(mockClearInterval).toHaveBeenCalledWith('interval-id')
    })
  })
})