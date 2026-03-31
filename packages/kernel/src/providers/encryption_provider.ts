import ServiceProvider from '../core/service_provider.ts'
import type Application from '../core/application.ts'
import EncryptionManager from '../encryption/encryption_manager.ts'

export default class EncryptionProvider extends ServiceProvider {
  readonly name = 'encryption'
  override readonly dependencies = ['config']

  override register(app: Application): void {
    app.singleton(EncryptionManager)
  }

  override boot(app: Application): void {
    app.resolve(EncryptionManager)
  }
}
