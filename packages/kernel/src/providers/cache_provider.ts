import ServiceProvider from '../core/service_provider.ts'
import type Application from '../core/application.ts'
import CacheManager from '../cache/cache_manager.ts'

export default class CacheProvider extends ServiceProvider {
  readonly name = 'cache'
  override readonly dependencies = ['config']

  override register(app: Application): void {
    app.singleton(CacheManager)
  }

  override boot(app: Application): void {
    app.resolve(CacheManager)
  }
}
