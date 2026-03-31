import { inject, app, Configuration, Emitter, ConfigurationError } from '@strav/kernel'
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
import type {
  McpConfig,
  ZodRawShape,
  ToolRegistration,
  ToolHandler,
  ToolHandlerContext,
  ResourceRegistration,
  ResourceHandler,
  PromptRegistration,
  PromptHandler,
} from './types.ts'
import { DuplicateRegistrationError } from './errors.ts'

@inject
export default class McpManager {
  private static _config: McpConfig
  private static _server: McpServer | null = null
  private static _tools = new Map<string, ToolRegistration>()
  private static _resources = new Map<string, ResourceRegistration>()
  private static _prompts = new Map<string, PromptRegistration>()

  constructor(config: Configuration) {
    McpManager._config = {
      name: (config.get('mcp.name') ?? config.get('app.name', 'Strav MCP Server')) as string,
      version: config.get('mcp.version', '1.0.0') as string,
      register: config.get('mcp.register') as string | undefined,
      http: {
        enabled: config.get('mcp.http.enabled', true) as boolean,
        path: config.get('mcp.http.path', '/mcp') as string,
      },
    }
  }

  // ── Configuration ──────────────────────────────────────────────────

  static get config(): McpConfig {
    if (!McpManager._config) {
      throw new ConfigurationError(
        'McpManager not configured. Resolve it through the container first.'
      )
    }
    return McpManager._config
  }

  // ── Builder API ────────────────────────────────────────────────────

  /** Register a tool that AI clients can invoke. */
  static tool<TShape extends ZodRawShape>(
    name: string,
    options: {
      description?: string
      input?: TShape
      handler: ToolHandler<TShape>
    }
  ): void {
    if (McpManager._tools.has(name)) {
      throw new DuplicateRegistrationError('tool', name)
    }

    McpManager._tools.set(name, {
      name,
      description: options.description,
      input: options.input,
      handler: options.handler as ToolHandler,
    })

    Emitter.emit('mcp:tool-registered', { name })
  }

  /** Register a resource that AI clients can read. */
  static resource(
    uri: string,
    options: {
      name?: string
      description?: string
      mimeType?: string
      handler: ResourceHandler
    }
  ): void {
    if (McpManager._resources.has(uri)) {
      throw new DuplicateRegistrationError('resource', uri)
    }

    McpManager._resources.set(uri, {
      uri,
      name: options.name,
      description: options.description,
      mimeType: options.mimeType,
      handler: options.handler,
    })

    Emitter.emit('mcp:resource-registered', { uri })
  }

  /** Register a prompt template that AI clients can use. */
  static prompt<TShape extends ZodRawShape>(
    name: string,
    options: {
      description?: string
      args?: TShape
      handler: PromptHandler<TShape>
    }
  ): void {
    if (McpManager._prompts.has(name)) {
      throw new DuplicateRegistrationError('prompt', name)
    }

    McpManager._prompts.set(name, {
      name,
      description: options.description,
      args: options.args,
      handler: options.handler as PromptHandler,
    })

    Emitter.emit('mcp:prompt-registered', { name })
  }

  // ── Server ─────────────────────────────────────────────────────────

  /**
   * Get or create the MCP server instance.
   *
   * Lazily creates the server and wires all registered tools, resources,
   * and prompts. Handlers are wrapped to inject the Application context.
   */
  static getServer(): McpServer {
    if (McpManager._server) return McpManager._server

    const server = new McpServer({
      name: McpManager.config.name,
      version: McpManager.config.version,
    })

    const ctx: ToolHandlerContext = { app }

    // Wire tools — cast at SDK boundary since our handler signature
    // adds the DI context param that the SDK doesn't know about
    for (const [name, reg] of McpManager._tools) {
      const toolCb = async (params: any) => {
        const result = await reg.handler(params ?? {}, ctx)
        await Emitter.emit('mcp:tool-called', { name, params })
        return result
      }

      if (reg.input) {
        server.registerTool(
          name,
          {
            description: reg.description,
            inputSchema: reg.input,
          },
          toolCb as any
        )
      } else {
        server.registerTool(
          name,
          {
            description: reg.description,
          },
          toolCb as any
        )
      }
    }

    // Wire resources
    for (const [, reg] of McpManager._resources) {
      const isTemplate = reg.uri.includes('{')
      const metadata = {
        title: reg.name,
        description: reg.description,
        mimeType: reg.mimeType,
      }

      if (isTemplate) {
        server.registerResource(
          reg.name ?? reg.uri,
          new ResourceTemplate(reg.uri, { list: undefined }),
          metadata,
          (async (uri: URL, params: Record<string, string>) => {
            const result = await reg.handler(uri, params, ctx)
            await Emitter.emit('mcp:resource-read', { uri: uri.href })
            return result
          }) as any
        )
      } else {
        server.registerResource(reg.name ?? reg.uri, reg.uri, metadata, (async (uri: URL) => {
          const result = await reg.handler(uri, {}, ctx)
          await Emitter.emit('mcp:resource-read', { uri: uri.href })
          return result
        }) as any)
      }
    }

    // Wire prompts
    for (const [name, reg] of McpManager._prompts) {
      const promptCb = async (args: any) => {
        const result = await reg.handler(args ?? {}, ctx)
        await Emitter.emit('mcp:prompt-called', { name, args })
        return result
      }

      if (reg.args) {
        server.registerPrompt(
          name,
          {
            description: reg.description,
            argsSchema: reg.args,
          },
          promptCb as any
        )
      } else {
        server.registerPrompt(
          name,
          {
            description: reg.description,
          },
          promptCb as any
        )
      }
    }

    McpManager._server = server
    return server
  }

  // ── Inspection ─────────────────────────────────────────────────────

  static registeredTools(): string[] {
    return Array.from(McpManager._tools.keys())
  }

  static registeredResources(): string[] {
    return Array.from(McpManager._resources.keys())
  }

  static registeredPrompts(): string[] {
    return Array.from(McpManager._prompts.keys())
  }

  static getToolRegistration(name: string): ToolRegistration | undefined {
    return McpManager._tools.get(name)
  }

  static getResourceRegistration(uri: string): ResourceRegistration | undefined {
    return McpManager._resources.get(uri)
  }

  static getPromptRegistration(name: string): PromptRegistration | undefined {
    return McpManager._prompts.get(name)
  }

  // ── Reset ──────────────────────────────────────────────────────────

  /** Reset all state. Intended for test teardown. */
  static reset(): void {
    McpManager._tools.clear()
    McpManager._resources.clear()
    McpManager._prompts.clear()
    McpManager._server = null
    McpManager._config = undefined as any
  }
}
