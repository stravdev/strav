import { ServiceProvider } from '@stravigor/kernel'
import type { Application } from '@stravigor/kernel'
import SocialManager from './social_manager.ts'

export default class SocialProvider extends ServiceProvider {
  readonly name = 'social'
  override readonly dependencies = ['database']

  override register(app: Application): void {
    app.singleton(SocialManager)
  }

  override boot(app: Application): void {
    app.resolve(SocialManager)
  }
}
