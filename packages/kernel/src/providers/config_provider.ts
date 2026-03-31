import ServiceProvider from '../core/service_provider.ts'
import type Application from '../core/application.ts'
import Configuration from '../config/configuration.ts'

export interface ConfigProviderOptions {
  /** Path to the config directory. Default: `'./config'` */
  directory?: string
}

export default class ConfigProvider extends ServiceProvider {
  readonly name = 'config'

  constructor(private options?: ConfigProviderOptions) {
    super()
  }

  override register(app: Application): void {
    const dir = this.options?.directory ?? './config'
    app.singleton(Configuration, () => new Configuration(dir))
  }

  override async boot(app: Application): Promise<void> {
    const config = app.resolve(Configuration)
    await config.load()
  }
}
