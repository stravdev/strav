import { ServiceProvider } from '@strav/kernel'
import type { Application } from '@strav/kernel'
import type { Context } from '@strav/http'
import { Router } from '@strav/http'
import DevtoolsManager from './devtools_manager.ts'
import { registerDashboard } from './dashboard/routes.ts'

export interface DevtoolsProviderOptions {
  /** Auto-create the devtools tables. Default: `true` */
  ensureTables?: boolean
  /** Auto-register the request-tracking middleware on the router. Default: `true` */
  middleware?: boolean
  /** Auto-register the dashboard routes at `/_devtools`. Default: `true` */
  dashboard?: boolean
  /** Custom auth guard for the dashboard. Receives the request context, returns boolean. */
  guard?: (ctx: Context) => boolean | Promise<boolean>
}

export default class DevtoolsProvider extends ServiceProvider {
  readonly name = 'devtools'
  override readonly dependencies = ['database']

  constructor(private options?: DevtoolsProviderOptions) {
    super()
  }

  override register(app: Application): void {
    app.singleton(DevtoolsManager)
  }

  override async boot(app: Application): Promise<void> {
    app.resolve(DevtoolsManager)

    if (this.options?.ensureTables !== false) {
      await DevtoolsManager.ensureTables()
    }

    if (!DevtoolsManager.config.enabled) return

    const router = app.resolve(Router)

    if (this.options?.middleware !== false) {
      router.use(DevtoolsManager.middleware())
    }

    if (this.options?.dashboard !== false) {
      registerDashboard(router, this.options?.guard)
    }
  }

  override shutdown(): void {
    DevtoolsManager.teardown()
  }
}
