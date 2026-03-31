import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { Emitter } from '@stravigor/kernel'
import McpManager from '../mcp_manager.ts'

/**
 * Start the MCP server in stdio mode.
 *
 * Reads JSON-RPC messages from stdin, writes responses to stdout.
 * Blocks until the AI client disconnects.
 *
 * Used by the `mcp:serve` CLI command. Claude Desktop spawns
 * the process and communicates over stdio.
 */
export async function serveStdio(): Promise<void> {
  const server = McpManager.getServer()
  const transport = new StdioServerTransport()

  await Emitter.emit('mcp:stdio-starting')

  await server.connect(transport)

  await Emitter.emit('mcp:stdio-connected')

  // Block until the transport closes (AI client disconnects)
  await new Promise<void>(resolve => {
    transport.onclose = () => {
      Emitter.emit('mcp:stdio-closed').then(resolve)
    }
  })
}
