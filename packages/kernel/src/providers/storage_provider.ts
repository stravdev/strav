import ServiceProvider from '../core/service_provider.ts'
import type Application from '../core/application.ts'
import StorageManager from '../storage/storage_manager.ts'

export default class StorageProvider extends ServiceProvider {
  readonly name = 'storage'
  override readonly dependencies = ['config']

  override register(app: Application): void {
    app.singleton(StorageManager)
  }

  override boot(app: Application): void {
    app.resolve(StorageManager)
  }
}
