/**
 * Shared test helpers for mocking fetch and Context.
 */

// ---------------------------------------------------------------------------
// Fetch mocking
// ---------------------------------------------------------------------------

interface MockResponse {
  body: Record<string, unknown>
  status?: number
}

const fetchCalls: Array<{ url: string; init: any }> = []

/**
 * Mock globalThis.fetch with a sequence of responses.
 * Each call to fetch() consumes the next response in the array.
 */
export function mockFetch(responses: MockResponse[]): void {
  let index = 0
  fetchCalls.length = 0

  globalThis.fetch = async (url: any, init: any) => {
    fetchCalls.push({ url: String(url), init })

    const mock = responses[index++]
    if (!mock) throw new Error(`Unexpected fetch call #${index}: ${url}`)

    return new Response(JSON.stringify(mock.body), {
      status: mock.status ?? 200,
      headers: { 'content-type': 'application/json' },
    })
  }
}

/** Get a recorded fetch call by index. */
export function lastFetchCall(index = 0): { url: string; init: any } {
  const call = fetchCalls[index]
  if (!call) throw new Error(`No fetch call at index ${index}`)
  return call
}

// ---------------------------------------------------------------------------
// Context / Session mocking
// ---------------------------------------------------------------------------

interface MockSession {
  get<T = unknown>(key: string): T | undefined
  set(key: string, value: unknown): void
  forget(key: string): void
}

interface MockContextOptions {
  query?: Record<string, string>
  sessionData?: Record<string, unknown>
}

interface MockedContext {
  query: URLSearchParams
  session: MockSession
  get<T>(key: string): T
  redirect(url: string): Response
}

/**
 * Create a lightweight mock of Context with session support.
 * Returns the context AND exposes `.session` for test assertions.
 */
export function mockContext(options: MockContextOptions = {}): MockedContext {
  const data: Record<string, unknown> = { ...(options.sessionData ?? {}) }

  const session: MockSession = {
    get<T>(key: string): T | undefined {
      return data[key] as T | undefined
    },
    set(key: string, value: unknown) {
      data[key] = value
    },
    forget(key: string) {
      delete data[key]
    },
  }

  const query = new URLSearchParams(options.query ?? {})

  return {
    query,
    session,
    get<T>(key: string): T {
      if (key === 'session') return session as T
      throw new Error(`Unexpected ctx.get("${key}")`)
    },
    redirect(url: string): Response {
      return new Response(null, { status: 302, headers: { Location: url } })
    },
  }
}
