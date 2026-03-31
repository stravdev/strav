import Emitter from '../events/emitter.ts'
import { HttpException, ValidationError, RateLimitError } from './http_exception.ts'
import { ModelNotFoundError, ConfigurationError, ExternalServiceError } from './errors.ts'

/** Minimal request context used by the exception handler. */
export interface RequestContext {
  readonly method: string
  readonly path: string
  header(name: string): string | null
  readonly headers: Headers
  readonly query: URLSearchParams
}

/** Converts an error into an HTTP Response. */
export type RenderFn = (error: any, ctx?: RequestContext) => Response

/** Reports an error (logging, external services, etc.). */
export type ReportFn = (error: Error, ctx?: RequestContext) => void

/**
 * Converts thrown errors into HTTP responses.
 *
 * Register with the router to catch all unhandled exceptions:
 *
 * @example
 * import { ExceptionHandler } from '@stravigor/kernel/exceptions'
 *
 * const handler = new ExceptionHandler(config.get('app.env') === 'local')
 * handler.report((error, ctx) => logger.error(error.message, { path: ctx?.path }))
 * router.useExceptionHandler(handler)
 */
export class ExceptionHandler {
  private renderers = new Map<Function, RenderFn>()
  private reporters: ReportFn[] = []

  constructor(private isDev = false) {}

  /**
   * Register a custom renderer for a specific error class.
   * Custom renderers take precedence over built-in rendering.
   *
   * @example
   * handler.render(PaymentError, (error) => {
   *   return Response.json({ error: error.message, code: error.code }, { status: 402 })
   * })
   */
  render<T extends Error>(
    errorClass: new (...args: any[]) => T,
    fn: (error: T, ctx?: RequestContext) => Response
  ): this {
    this.renderers.set(errorClass, fn as RenderFn)
    return this
  }

  /**
   * Register a reporter. Runs for every error before rendering.
   *
   * @example
   * handler.report((error, ctx) => {
   *   logger.error(error.message, { path: ctx?.path, stack: error.stack })
   * })
   */
  report(fn: ReportFn): this {
    this.reporters.push(fn)
    return this
  }

  /** Convert a thrown error into an HTTP Response. */
  handle(error: unknown, ctx?: RequestContext): Response {
    const err = error instanceof Error ? error : new Error(String(error))

    // Emit for devtools/observability
    if (Emitter.listenerCount('http:error') > 0) {
      Emitter.emit('http:error', { error: err, ctx }).catch(() => {})
    }

    // Run reporters
    for (const reporter of this.reporters) {
      try {
        reporter(err, ctx)
      } catch {
        // Reporters must not throw
      }
    }

    // Check custom renderers (walk the prototype chain)
    let proto = err.constructor
    while (proto && proto !== Object) {
      const renderer = this.renderers.get(proto)
      if (renderer) return renderer(err, ctx)
      proto = Object.getPrototypeOf(proto)
    }

    // Built-in rendering
    if (err instanceof ValidationError) {
      return json({ error: err.message, errors: err.errors }, err.status)
    }

    if (err instanceof RateLimitError) {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (err.retryAfter !== undefined) {
        headers['Retry-After'] = String(err.retryAfter)
      }
      return new Response(JSON.stringify({ error: err.message }), {
        status: err.status,
        headers,
      })
    }

    if (err instanceof HttpException) {
      return json({ error: err.message }, err.status)
    }

    if (err instanceof ModelNotFoundError) {
      return json({ error: err.message }, 404)
    }

    if (err instanceof ConfigurationError) {
      // Always show config errors — they're developer mistakes
      return json({ error: err.message }, 500)
    }

    if (err instanceof ExternalServiceError) {
      return json({ error: 'Service unavailable' }, 502)
    }

    // Unknown error
    if (this.isDev) {
      return json({ error: err.message, stack: err.stack }, 500)
    }
    return json({ error: 'Internal Server Error' }, 500)
  }
}

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
