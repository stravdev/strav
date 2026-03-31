import { ServiceProvider } from '@stravigor/kernel'
import type { Application } from '@stravigor/kernel'
import FlagManager from './flag_manager.ts'

export interface FlagProviderOptions {
  /** Auto-create the features table. Default: `true` */
  ensureTables?: boolean
}

export default class FlagProvider extends ServiceProvider {
  readonly name = 'flag'
  override readonly dependencies = ['config', 'database']

  constructor(private options?: FlagProviderOptions) {
    super()
  }

  override register(app: Application): void {
    app.singleton(FlagManager)
  }

  override async boot(app: Application): Promise<void> {
    app.resolve(FlagManager)

    if (this.options?.ensureTables !== false) {
      await FlagManager.ensureTables()
    }
  }

  override shutdown(): void {
    FlagManager.reset()
  }
}
