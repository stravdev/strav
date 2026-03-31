import { ServiceProvider } from '@stravigor/kernel'
import type { Application } from '@stravigor/kernel'
import MontaigneManager from './montaigne_manager.ts'

export default class MontaigneProvider extends ServiceProvider {
  readonly name = 'montaigne'
  override readonly dependencies = ['config']

  override register(app: Application): void {
    app.singleton(MontaigneManager)
  }

  override boot(app: Application): void {
    app.resolve(MontaigneManager)
  }

  override shutdown(): void {
    MontaigneManager.reset()
  }
}
