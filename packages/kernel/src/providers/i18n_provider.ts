import ServiceProvider from '../core/service_provider.ts'
import type Application from '../core/application.ts'
import I18nManager from '../i18n/i18n_manager.ts'

export default class I18nProvider extends ServiceProvider {
  readonly name = 'i18n'
  override readonly dependencies = ['config']

  override register(app: Application): void {
    app.singleton(I18nManager)
  }

  override async boot(app: Application): Promise<void> {
    app.resolve(I18nManager)
    await I18nManager.load()
  }
}
