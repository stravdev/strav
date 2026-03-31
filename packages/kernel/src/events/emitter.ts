/** A function that handles an event payload. */
export type Listener<T = any> = (payload: T) => void | Promise<void>

/**
 * In-memory event bus — publish/subscribe with async support.
 *
 * All methods are static. No DI, no database, no configuration required.
 * Listeners are awaited in parallel when an event is emitted.
 * If any listener throws, the remaining listeners still execute
 * and the first error is re-thrown after all complete.
 *
 * @example
 * Emitter.on<{ user: User }>('user.registered', async ({ user }) => {
 *   await sendWelcomeEmail(user)
 * })
 *
 * await Emitter.emit('user.registered', { user })
 */
export default class Emitter {
  private static _listeners = new Map<string, Set<Listener>>()
  private static _once = new WeakSet<Listener>()

  /** Register a listener for an event. */
  static on<T = any>(event: string, listener: Listener<T>): void {
    let set = Emitter._listeners.get(event)
    if (!set) {
      set = new Set()
      Emitter._listeners.set(event, set)
    }
    set.add(listener)
  }

  /** Register a listener that is automatically removed after its first invocation. */
  static once<T = any>(event: string, listener: Listener<T>): void {
    Emitter._once.add(listener)
    Emitter.on(event, listener)
  }

  /** Remove a specific listener for an event. */
  static off<T = any>(event: string, listener: Listener<T>): void {
    const set = Emitter._listeners.get(event)
    if (!set) return
    set.delete(listener)
    if (set.size === 0) Emitter._listeners.delete(event)
  }

  /** Remove all listeners for a specific event, or all listeners entirely. */
  static removeAllListeners(event?: string): void {
    if (event) {
      Emitter._listeners.delete(event)
    } else {
      Emitter._listeners.clear()
    }
  }

  /**
   * Emit an event. All registered listeners are invoked in parallel.
   *
   * If any listener throws, the other listeners still execute.
   * After all listeners settle, the first error is re-thrown.
   */
  static async emit<T = any>(event: string, payload?: T): Promise<void> {
    const set = Emitter._listeners.get(event)
    if (!set || set.size === 0) return

    const listeners = [...set]

    // Remove one-time listeners before calling (avoids re-entrancy issues)
    for (const fn of listeners) {
      if (Emitter._once.has(fn)) {
        Emitter._once.delete(fn)
        set.delete(fn)
      }
    }
    if (set.size === 0) Emitter._listeners.delete(event)

    const results = await Promise.allSettled(
      listeners.map(fn => {
        try {
          return fn(payload as T)
        } catch (err) {
          return Promise.reject(err)
        }
      })
    )

    const firstError = results.find((r): r is PromiseRejectedResult => r.status === 'rejected')
    if (firstError) throw firstError.reason
  }

  /** Return the number of listeners registered for an event. */
  static listenerCount(event: string): number {
    return Emitter._listeners.get(event)?.size ?? 0
  }

  /** Clear all state. Intended for test teardown. */
  static reset(): void {
    Emitter._listeners.clear()
    Emitter._once = new WeakSet()
  }
}
