import { env } from '@stravigor/kernel/helpers'

export default {
  /** Server name shown to AI clients. Defaults to app name if not set. */
  name: env('MCP_NAME', undefined),

  /** Server version. */
  version: env('MCP_VERSION', '1.0.0'),

  /**
   * Path to the file that registers tools, resources, and prompts.
   * This file is imported automatically by the provider and CLI commands.
   */
  register: 'mcp/server.ts',

  /** HTTP transport settings (for hosted deployments). */
  http: {
    /** Enable the HTTP transport. Mounts an MCP endpoint on the router. */
    enabled: env('MCP_HTTP', 'true').bool(),

    /** Mount path for the MCP endpoint. */
    path: env('MCP_PATH', '/mcp'),
  },
}
