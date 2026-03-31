import type { Context, Middleware, Next } from '@stravigor/http'

/**
 * Authorization gate for the devtools dashboard.
 *
 * By default, only allows access in the 'local' environment.
 * Pass a custom guard function for production access control.
 *
 * @example
 * import { dashboardAuth } from '@stravigor/devtools/dashboard/middleware'
 *
 * // Default: local environment only
 * router.group({ prefix: '/_devtools', middleware: [dashboardAuth()] }, ...)
 *
 * // Custom guard
 * router.group({
 *   prefix: '/_devtools',
 *   middleware: [dashboardAuth((ctx) => {
 *     const user = ctx.get('user')
 *     return user?.isAdmin === true
 *   })]
 * }, ...)
 */
export function dashboardAuth(guard?: (ctx: Context) => boolean | Promise<boolean>): Middleware {
  return async (ctx: Context, next: Next): Promise<Response> => {
    if (guard) {
      const allowed = await guard(ctx)
      if (!allowed) {
        return ctx.json({ error: 'Unauthorized' }, 403)
      }
    } else {
      // Default: only allow in local/development environment
      const env = process.env.NODE_ENV ?? process.env.APP_ENV ?? 'production'
      if (env !== 'local' && env !== 'development') {
        return ctx.json({ error: 'Unauthorized' }, 403)
      }
    }

    return next()
  }
}
