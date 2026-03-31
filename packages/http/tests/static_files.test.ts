import { test, expect, describe, beforeAll, afterAll } from 'bun:test'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import Server from '../src/http/server.ts'

// ── Helpers ──────────────────────────────────────────────────────────────────

const TEST_PORT = 9_876
const BASE = `http://localhost:${TEST_PORT}`
const TMP = resolve(import.meta.dir, '.tmp-public')
const SIBLING = resolve(import.meta.dir, '.tmp-public-secrets')

/** Minimal Configuration mock — returns values from a flat map. */
function fakeConfig(overrides: Record<string, any> = {}) {
  const data: Record<string, any> = {
    'http.port': TEST_PORT,
    'http.host': '127.0.0.1',
    'http.domain': 'localhost',
    'http.public': TMP,
    'http.idleTimeout': 10,
    ...overrides,
  }
  return { get: (key: string, fallback?: any) => data[key] ?? fallback } as any
}

/** Minimal Router mock — returns 404 for every request (router never matches). */
function fakeRouter() {
  return {
    setDomain(_d: string) {},
    handle(_req: Request) {
      return new Response('Not Found (router)', { status: 404 })
    },
    websocketHandler() {
      return {
        open() {},
        message() {},
        close() {},
        drain() {},
      }
    },
  } as any
}

// ── Fixtures ─────────────────────────────────────────────────────────────────

beforeAll(() => {
  // Clean up from any prior interrupted run
  rmSync(TMP, { recursive: true, force: true })
  rmSync(SIBLING, { recursive: true, force: true })

  // public/
  //   css/app.css          (plain file)
  //   builds/islands.js    (has .br and .gz companions → compressed)
  //   builds/islands.js.br
  //   builds/islands.js.gz
  mkdirSync(join(TMP, 'css'), { recursive: true })
  mkdirSync(join(TMP, 'builds'), { recursive: true })
  writeFileSync(join(TMP, 'css', 'app.css'), 'body{color:red}')
  writeFileSync(join(TMP, 'builds', 'islands.js'), '// original')
  writeFileSync(join(TMP, 'builds', 'islands.js.br'), 'BROTLI_DATA')
  writeFileSync(join(TMP, 'builds', 'islands.js.gz'), 'GZIP_DATA')

  // Sibling directory that shares the "public" prefix
  mkdirSync(SIBLING, { recursive: true })
  writeFileSync(join(SIBLING, 'secret.txt'), 'TOP SECRET')
})

afterAll(() => {
  rmSync(TMP, { recursive: true, force: true })
  rmSync(SIBLING, { recursive: true, force: true })
})

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Static file serving', () => {
  let server: Server

  beforeAll(() => {
    server = new Server(fakeConfig())
    server.start(fakeRouter())
  })

  afterAll(() => {
    server.stop()
  })

  // ── Happy path ───────────────────────────────────────────────────────────

  test('serves a plain static file', async () => {
    const res = await fetch(`${BASE}/css/app.css`)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('body{color:red}')
  })

  test('serves brotli variant when accept-encoding includes br', async () => {
    const res = await fetch(`${BASE}/builds/islands.js`, {
      headers: { 'Accept-Encoding': 'br' },
      decompress: false,
    } as any)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-encoding')).toBe('br')
    expect(await res.text()).toBe('BROTLI_DATA')
  })

  test('serves gzip variant when accept-encoding includes gzip', async () => {
    const res = await fetch(`${BASE}/builds/islands.js`, {
      headers: { 'Accept-Encoding': 'gzip' },
      decompress: false,
    } as any)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-encoding')).toBe('gzip')
    expect(await res.text()).toBe('GZIP_DATA')
  })

  test('prefers brotli over gzip', async () => {
    const res = await fetch(`${BASE}/builds/islands.js`, {
      headers: { 'Accept-Encoding': 'gzip, br' },
      decompress: false,
    } as any)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-encoding')).toBe('br')
  })

  // ── Runtime-added files (fallback) ───────────────────────────────────────

  test('serves a file added after server startup', async () => {
    writeFileSync(join(TMP, 'css', 'runtime.css'), '.new{color:blue}')

    const res = await fetch(`${BASE}/css/runtime.css`)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('.new{color:blue}')
  })

  // ── Path traversal attacks ───────────────────────────────────────────────

  test('blocks ../ traversal to parent directory', async () => {
    const res = await fetch(`${BASE}/../../../etc/passwd`)
    expect(res.status).toBe(404)
  })

  test('blocks encoded ../ traversal', async () => {
    const res = await fetch(`${BASE}/css/..%2F..%2F..%2Fetc%2Fpasswd`)
    expect(res.status).toBe(404)
  })

  test('blocks sibling directory prefix escape (public-secrets)', async () => {
    // Attacker tries to read /tmp-public-secrets/secret.txt
    // by requesting /../.tmp-public-secrets/secret.txt
    // which resolves to a path starting with the publicDir prefix
    const res = await fetch(`${BASE}/../.tmp-public-secrets/secret.txt`)
    expect(res.status).toBe(404)
  })

  test('blocks null byte injection', async () => {
    const res = await fetch(`${BASE}/css/app.css%00.txt`)
    expect(res.status).toBe(404)
  })

  // ── Non-file paths fall through to router ────────────────────────────────

  test('paths without extensions fall through to the router', async () => {
    const res = await fetch(`${BASE}/dashboard`)
    expect(res.status).toBe(404)
    expect(await res.text()).toBe('Not Found (router)')
  })

  test('paths with trailing slash fall through to the router', async () => {
    const res = await fetch(`${BASE}/css/`)
    expect(res.status).toBe(404)
    expect(await res.text()).toBe('Not Found (router)')
  })
})
