import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import type { Router, Context } from '@stravigor/http'
import { Emitter } from '@stravigor/kernel'
import McpManager from '../mcp_manager.ts'

export type { WebStandardStreamableHTTPServerTransport }

/**
 * Mount the MCP server on a Stravigor router via Streamable HTTP.
 *
 * Uses the SDK's `WebStandardStreamableHTTPServerTransport` which works
 * natively with Bun's Web Standard Request/Response API.
 *
 * Registers handlers at the configured path (default: `/mcp`) for
 * POST (requests), GET (SSE), and DELETE (session termination).
 */
export function mountHttpTransport(router: Router): WebStandardStreamableHTTPServerTransport {
  const path = McpManager.config.http.path

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
  })

  const server = McpManager.getServer()
  server.connect(transport)

  // The SDK transport handles POST/GET/DELETE routing internally
  // via handleRequest(req: Request): Promise<Response>.
  const handler = async (ctx: Context) => {
    const response = await transport.handleRequest(ctx.request)
    await Emitter.emit('mcp:http-request', { method: ctx.method, path })
    return response
  }

  router.post(path, handler)
  router.get(path, handler)
  router.delete(path, handler)

  Emitter.emit('mcp:http-mounted', { path })

  return transport
}
