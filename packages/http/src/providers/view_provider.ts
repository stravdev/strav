import ServiceProvider from '@strav/kernel/core/service_provider'
import type Application from '@strav/kernel/core/application'
// ViewProvider is implemented by @strav/view package
// This provider stub allows http to work without view package
import Context from '../http/context.ts'

export default class ViewProvider extends ServiceProvider {
  readonly name = 'view'
  override readonly dependencies = ['config']

  override register(app: Application): void {
    // ViewEngine registration handled by @strav/view package
  }

  override boot(app: Application): void {
    // ViewEngine setup handled by @strav/view package
  }
}
