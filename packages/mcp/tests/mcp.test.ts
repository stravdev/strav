import { describe, test, expect, beforeEach } from 'bun:test'
import { z } from 'zod'
import McpManager from '../src/mcp_manager.ts'
import { mcp } from '../src/helpers.ts'
import { DuplicateRegistrationError } from '../src/errors.ts'

// ── Helpers ──────────────────────────────────────────────────────────

function mockConfig(overrides: Record<string, unknown> = {}) {
  const data: Record<string, unknown> = {
    mcp: {
      name: 'test-server',
      version: '1.0.0',
      http: { enabled: false, path: '/mcp' },
      ...overrides,
    },
    app: { name: 'Test App' },
  }

  return {
    get(key: string, defaultValue?: unknown): unknown {
      const parts = key.split('.')
      let current: any = data
      for (const part of parts) {
        if (current === undefined || current === null) return defaultValue
        current = current[part]
      }
      return current !== undefined ? current : defaultValue
    },
  } as any
}

function bootMcp(overrides: Record<string, unknown> = {}) {
  McpManager.reset()
  new McpManager(mockConfig(overrides))
}

// ── Tests ────────────────────────────────────────────────────────────

describe('McpManager', () => {
  beforeEach(() => {
    McpManager.reset()
  })

  // ── Config ───────────────────────────────────────────────────────

  test('loads config from Configuration', () => {
    bootMcp()
    expect(McpManager.config.name).toBe('test-server')
    expect(McpManager.config.version).toBe('1.0.0')
  })

  test('defaults to app.name when mcp.name is not set', () => {
    McpManager.reset()
    const config = mockConfig()
    // Remove mcp.name
    ;(config as any)._data = undefined
    const data: Record<string, unknown> = {
      mcp: { version: '1.0.0', http: { enabled: false, path: '/mcp' } },
      app: { name: 'My App' },
    }
    const cfg = {
      get(key: string, defaultValue?: unknown): unknown {
        const parts = key.split('.')
        let current: any = data
        for (const part of parts) {
          if (current === undefined || current === null) return defaultValue
          current = current[part]
        }
        return current !== undefined ? current : defaultValue
      },
    } as any
    new McpManager(cfg)
    expect(McpManager.config.name).toBe('My App')
  })

  test('throws when not configured', () => {
    expect(() => McpManager.config).toThrow('McpManager not configured')
  })

  // ── Tool Registration ────────────────────────────────────────────

  test('registers a tool', () => {
    bootMcp()

    mcp.tool('greet', {
      description: 'Say hello',
      input: { name: z.string() },
      handler: async ({ name }) => ({
        content: [{ type: 'text', text: `Hello, ${name}!` }],
      }),
    })

    expect(mcp.registeredTools()).toEqual(['greet'])
  })

  test('registers a tool without input', () => {
    bootMcp()

    mcp.tool('ping', {
      description: 'Ping the server',
      handler: async () => ({
        content: [{ type: 'text', text: 'pong' }],
      }),
    })

    expect(mcp.registeredTools()).toEqual(['ping'])
  })

  test('getToolRegistration returns the registration', () => {
    bootMcp()

    mcp.tool('test', {
      description: 'A test tool',
      input: { id: z.number() },
      handler: async () => ({ content: [] }),
    })

    const reg = mcp.getToolRegistration('test')
    expect(reg).toBeDefined()
    expect(reg!.name).toBe('test')
    expect(reg!.description).toBe('A test tool')
  })

  test('throws on duplicate tool registration', () => {
    bootMcp()

    mcp.tool('dup', {
      handler: async () => ({ content: [] }),
    })

    expect(() => {
      mcp.tool('dup', {
        handler: async () => ({ content: [] }),
      })
    }).toThrow(DuplicateRegistrationError)
  })

  // ── Resource Registration ────────────────────────────────────────

  test('registers a resource', () => {
    bootMcp()

    mcp.resource('strav://config', {
      name: 'App Config',
      description: 'Application configuration',
      mimeType: 'application/json',
      handler: async () => ({
        contents: [{ uri: 'strav://config', text: '{}' }],
      }),
    })

    expect(mcp.registeredResources()).toEqual(['strav://config'])
  })

  test('getResourceRegistration returns the registration', () => {
    bootMcp()

    mcp.resource('strav://test', {
      name: 'Test',
      handler: async () => ({ contents: [] }),
    })

    const reg = mcp.getResourceRegistration('strav://test')
    expect(reg).toBeDefined()
    expect(reg!.name).toBe('Test')
  })

  test('throws on duplicate resource registration', () => {
    bootMcp()

    mcp.resource('strav://dup', {
      handler: async () => ({ contents: [] }),
    })

    expect(() => {
      mcp.resource('strav://dup', {
        handler: async () => ({ contents: [] }),
      })
    }).toThrow(DuplicateRegistrationError)
  })

  // ── Prompt Registration ──────────────────────────────────────────

  test('registers a prompt', () => {
    bootMcp()

    mcp.prompt('summarize', {
      description: 'Summarize content',
      args: { topic: z.string() },
      handler: async ({ topic }) => ({
        messages: [
          {
            role: 'user',
            content: { type: 'text', text: `Summarize ${topic}` },
          },
        ],
      }),
    })

    expect(mcp.registeredPrompts()).toEqual(['summarize'])
  })

  test('throws on duplicate prompt registration', () => {
    bootMcp()

    mcp.prompt('dup', {
      handler: async () => ({ messages: [] }),
    })

    expect(() => {
      mcp.prompt('dup', {
        handler: async () => ({ messages: [] }),
      })
    }).toThrow(DuplicateRegistrationError)
  })

  // ── Server ───────────────────────────────────────────────────────

  test('getServer() creates an McpServer', () => {
    bootMcp()

    mcp.tool('test', {
      handler: async () => ({ content: [{ type: 'text', text: 'ok' }] }),
    })

    const server = McpManager.getServer()
    expect(server).toBeDefined()
    expect(server.constructor.name).toBe('McpServer')
  })

  test('getServer() returns the same instance on subsequent calls', () => {
    bootMcp()

    const server1 = McpManager.getServer()
    const server2 = McpManager.getServer()
    expect(server1).toBe(server2)
  })

  // ── Reset ────────────────────────────────────────────────────────

  test('reset() clears all state', () => {
    bootMcp()

    mcp.tool('t', { handler: async () => ({ content: [] }) })
    mcp.resource('r://x', { handler: async () => ({ contents: [] }) })
    mcp.prompt('p', { handler: async () => ({ messages: [] }) })

    McpManager.reset()

    expect(() => McpManager.config).toThrow()
  })
})
