import { ServiceProvider } from '@strav/kernel'
import type { Application } from '@strav/kernel'
import RagManager from './rag_manager.ts'

export default class RagProvider extends ServiceProvider {
  readonly name = 'rag'
  override readonly dependencies = ['config']

  override register(app: Application): void {
    app.singleton(RagManager)
  }

  override boot(app: Application): void {
    app.resolve(RagManager)
  }
}
