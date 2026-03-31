import ServiceProvider from '../core/service_provider.ts'
import type Application from '../core/application.ts'
import Logger from '../logger/logger.ts'

export default class LoggerProvider extends ServiceProvider {
  readonly name = 'logger'
  override readonly dependencies = ['config']

  override register(app: Application): void {
    app.singleton(Logger)
  }

  override boot(app: Application): void {
    app.resolve(Logger)
  }
}
