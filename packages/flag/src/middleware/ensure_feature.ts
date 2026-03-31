import type { Middleware } from '@stravigor/http'
import FlagManager from '../flag_manager.ts'
import type { Scopeable } from '../types.ts'

/**
 * Route protection middleware — returns 403 if the feature is not active.
 *
 * Uses `ctx.get('user')` as the default scope if available.
 *
 * @example
 * router.group({ middleware: [auth(), ensureFeature('beta-ui')] }, (r) => { ... })
 *
 * // With custom scope extractor
 * r.get('/team/:id', compose([ensureFeature('analytics', (ctx) => ctx.get('team'))], handler))
 */
export function ensureFeature(
  feature: string,
  scopeExtractor?: (ctx: Parameters<Middleware>[0]) => Scopeable | null
): Middleware {
  return async (ctx, next) => {
    const scope = scopeExtractor
      ? scopeExtractor(ctx)
      : ((ctx.get('user') as Scopeable | undefined) ?? null)

    const isActive = await FlagManager.active(feature, scope)

    if (!isActive) {
      return new Response(JSON.stringify({ error: 'Feature not available' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return next()
  }
}
