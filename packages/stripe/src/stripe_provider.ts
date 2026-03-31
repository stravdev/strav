import { ServiceProvider } from '@strav/kernel'
import type { Application } from '@strav/kernel'
import StripeManager from './stripe_manager.ts'

export default class StripeProvider extends ServiceProvider {
  readonly name = 'stripe'
  override readonly dependencies = ['database']

  override register(app: Application): void {
    app.singleton(StripeManager)
  }

  override boot(app: Application): void {
    app.resolve(StripeManager)
  }
}
