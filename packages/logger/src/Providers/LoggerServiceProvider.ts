import type { ServiceProvider, Container, Token } from '@strav/kernel'
import { LoggerService } from '../Services/LoggerService'
import { ConsoleHandler } from '../Handlers/ConsoleHandler'
import type { LoggerManager } from '../Contracts/LoggerManager'

/**
 * LoggerServiceProvider for registering the logger service with the application
 */
export class LoggerServiceProvider implements ServiceProvider {
  /**
   * Dependency injection token for the Logger service.
   * @private
   */
  private loggerServiceToken: Token<LoggerManager> = Symbol('Logger')

  /**
   * Returns the unique name of this service provider
   */
  public getProviderName(): string {
    return 'LoggerServiceProvider'
  }

  /**
   * Register the logger service with the application container
   */
  public register(container: Container): void {
    container.registerFactory<LoggerManager>(this.loggerServiceToken, () => {
      const loggerService = new LoggerService()

      // Add a default console handler
      loggerService.addDefaultHandler(new ConsoleHandler())

      return loggerService
    })

    // Also register with string token for backward compatibility
    container.registerFactory('logger', () => container.resolve(this.loggerServiceToken))
  }

  /**
   * Bootstrap any logger services
   */
  public boot(container: Container): void {
    // No additional boot logic needed
  }

  /**
   * Returns the services this provider registers
   */
  public getProvidedServices(): Array<Token<any>> {
    return [this.loggerServiceToken, 'logger']
  }
}
