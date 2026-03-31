import { ServiceProvider } from '@strav/kernel'
import type { Application } from '@strav/kernel'
import { Router } from '@strav/http'
import McpManager from './mcp_manager.ts'
import { mountHttpTransport } from './transports/bun_http_transport.ts'

export interface McpProviderOptions {
  /** Auto-mount HTTP transport on the router. Default: `true` */
  mountHttp?: boolean
}

export default class McpProvider extends ServiceProvider {
  readonly name = 'mcp'
  override readonly dependencies = ['config']

  constructor(private options?: McpProviderOptions) {
    super()
  }

  override register(app: Application): void {
    app.singleton(McpManager)
  }

  override async boot(app: Application): Promise<void> {
    app.resolve(McpManager)

    // Load user registration file if configured
    const registerPath = McpManager.config.register
    if (registerPath) {
      await import(`${process.cwd()}/${registerPath}`)
    }

    // Mount HTTP transport on the router
    if (this.options?.mountHttp !== false && McpManager.config.http.enabled) {
      const router = app.resolve(Router)
      mountHttpTransport(router)
    }
  }

  override shutdown(): void {
    McpManager.reset()
  }
}
