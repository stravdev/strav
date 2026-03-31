import { test, expect, describe, beforeEach, afterEach } from 'bun:test'
import { Emitter } from '@strav/kernel'
import SlowRequestsRecorder from '../src/recorders/slow_requests.ts'
import SlowQueriesRecorder from '../src/recorders/slow_queries.ts'
import Recorder from '../src/recorders/recorder.ts'
import { MockAggregateStore, wait } from './helpers.ts'

// ---------------------------------------------------------------------------
// Recorder base class
// ---------------------------------------------------------------------------

describe('Recorder (base)', () => {
  test('shouldSample returns true when rate is 1.0', () => {
    const store = new MockAggregateStore()
    const recorder = new TestRecorder(store as any, { enabled: true, sampleRate: 1.0 })
    // With sampleRate 1.0, every call should pass
    let passed = 0
    for (let i = 0; i < 100; i++) {
      if (recorder.testShouldSample()) passed++
    }
    expect(passed).toBe(100)
  })

  test('shouldSample returns false sometimes when rate < 1.0', () => {
    const store = new MockAggregateStore()
    const recorder = new TestRecorder(store as any, { enabled: true, sampleRate: 0.0 })
    // With sampleRate 0.0, nothing should pass
    let passed = 0
    for (let i = 0; i < 100; i++) {
      if (recorder.testShouldSample()) passed++
    }
    expect(passed).toBe(0)
  })

  test('aggregate does nothing when disabled', async () => {
    const store = new MockAggregateStore()
    const recorder = new TestRecorder(store as any, { enabled: false })
    await recorder.testAggregate('test', 'key', 100)
    expect(store.calls).toHaveLength(0)
  })
})

class TestRecorder extends Recorder {
  register(): void {}
  teardown(): void {}

  testShouldSample(): boolean {
    return this.shouldSample()
  }

  async testAggregate(type: string, key: string, value: number): Promise<void> {
    return this.aggregate(type, key, value)
  }
}

// ---------------------------------------------------------------------------
// SlowRequestsRecorder
// ---------------------------------------------------------------------------

describe('SlowRequestsRecorder', () => {
  let store: MockAggregateStore
  let recorder: SlowRequestsRecorder

  beforeEach(() => {
    store = new MockAggregateStore()
    Emitter.removeAllListeners('devtools:request')
  })

  afterEach(() => {
    recorder?.teardown()
    Emitter.removeAllListeners('devtools:request')
  })

  test('records requests exceeding threshold', async () => {
    recorder = new SlowRequestsRecorder(store as any, {
      enabled: true,
      threshold: 500,
      sampleRate: 1.0,
    })
    recorder.register()

    await Emitter.emit('devtools:request', {
      path: '/api/users',
      method: 'GET',
      duration: 1200,
      status: 200,
    })
    await wait()

    expect(store.calls).toHaveLength(1)
    expect(store.calls[0]!.type).toBe('slow_request')
    expect(store.calls[0]!.key).toBe('GET /api/users')
    expect(store.calls[0]!.value).toBe(1200)
  })

  test('ignores requests below threshold', async () => {
    recorder = new SlowRequestsRecorder(store as any, {
      enabled: true,
      threshold: 500,
      sampleRate: 1.0,
    })
    recorder.register()

    await Emitter.emit('devtools:request', {
      path: '/api/health',
      method: 'GET',
      duration: 5,
      status: 200,
    })
    await wait()

    expect(store.calls).toHaveLength(0)
  })

  test('uses default threshold of 1000ms', async () => {
    recorder = new SlowRequestsRecorder(store as any, {
      enabled: true,
      sampleRate: 1.0,
    })
    recorder.register()

    // 800ms should not trigger
    await Emitter.emit('devtools:request', { path: '/', method: 'GET', duration: 800, status: 200 })
    expect(store.calls).toHaveLength(0)

    // 1200ms should trigger
    await Emitter.emit('devtools:request', {
      path: '/',
      method: 'GET',
      duration: 1200,
      status: 200,
    })
    expect(store.calls).toHaveLength(1)
  })

  test('does nothing when disabled', async () => {
    recorder = new SlowRequestsRecorder(store as any, {
      enabled: false,
      threshold: 100,
      sampleRate: 1.0,
    })
    recorder.register()

    await Emitter.emit('devtools:request', {
      path: '/',
      method: 'GET',
      duration: 5000,
      status: 200,
    })
    await wait()

    expect(store.calls).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// SlowQueriesRecorder
// ---------------------------------------------------------------------------

describe('SlowQueriesRecorder', () => {
  let store: MockAggregateStore
  let recorder: SlowQueriesRecorder

  beforeEach(() => {
    store = new MockAggregateStore()
    Emitter.removeAllListeners('devtools:query')
  })

  afterEach(() => {
    recorder?.teardown()
    Emitter.removeAllListeners('devtools:query')
  })

  test('records queries exceeding threshold', async () => {
    recorder = new SlowQueriesRecorder(store as any, {
      enabled: true,
      threshold: 100,
      sampleRate: 1.0,
    })
    recorder.register()

    await Emitter.emit('devtools:query', {
      sql: 'SELECT * FROM users WHERE id = $1',
      duration: 250,
    })
    await wait()

    expect(store.calls).toHaveLength(1)
    expect(store.calls[0]!.type).toBe('slow_query')
    expect(store.calls[0]!.value).toBe(250)
  })

  test('normalizes SQL for grouping', async () => {
    recorder = new SlowQueriesRecorder(store as any, {
      enabled: true,
      threshold: 50,
      sampleRate: 1.0,
    })
    recorder.register()

    await Emitter.emit('devtools:query', {
      sql: "SELECT * FROM users WHERE name = 'Alice'",
      duration: 100,
    })
    await wait()

    // Should replace $N and 'string' values
    const key = store.calls[0]!.key
    expect(key).toContain("'?'")
  })

  test('ignores queries below threshold', async () => {
    recorder = new SlowQueriesRecorder(store as any, {
      enabled: true,
      threshold: 500,
      sampleRate: 1.0,
    })
    recorder.register()

    await Emitter.emit('devtools:query', { sql: 'SELECT 1', duration: 1 })
    await wait()

    expect(store.calls).toHaveLength(0)
  })
})
