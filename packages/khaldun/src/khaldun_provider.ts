import { ServiceProvider } from '@stravigor/kernel'
import type { Application } from '@stravigor/kernel'
import KhaldunManager from './khaldun_manager.ts'

export default class KhaldunProvider extends ServiceProvider {
  readonly name = 'khaldun'
  override readonly dependencies = ['config']

  override register(app: Application): void {
    app.singleton(KhaldunManager)
  }

  override boot(app: Application): void {
    app.resolve(KhaldunManager)
  }

  override shutdown(): void {
    KhaldunManager.reset()
  }
}
