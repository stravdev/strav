import { ServiceProvider } from '@strav/kernel'
import type { Application } from '@strav/kernel'
import BrainManager from './brain_manager.ts'

export default class BrainProvider extends ServiceProvider {
  readonly name = 'brain'
  override readonly dependencies = ['config']

  override register(app: Application): void {
    app.singleton(BrainManager)
  }

  override boot(app: Application): void {
    app.resolve(BrainManager)
  }
}
