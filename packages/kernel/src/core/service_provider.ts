import type Application from './application.ts'

/**
 * Base class for service providers.
 *
 * A service provider encapsulates the full lifecycle of a framework service:
 * registration (binding into the container), booting (async initialization),
 * and shutdown (cleanup). The {@link Application} orchestrates providers
 * in dependency order via topological sort.
 *
 * @example
 * class AuthProvider extends ServiceProvider {
 *   readonly name = 'auth'
 *   readonly dependencies = ['database']
 *
 *   register(app: Application): void {
 *     app.singleton(Auth)
 *   }
 *
 *   async boot(app: Application): Promise<void> {
 *     app.resolve(Auth)
 *     Auth.useResolver((id) => User.find(id))
 *     await Auth.ensureTables()
 *   }
 *
 *   async shutdown(app: Application): Promise<void> {}
 * }
 */
export default abstract class ServiceProvider {
  /** Unique name used for dependency resolution between providers. */
  abstract readonly name: string

  /** Names of other providers that must be registered and booted first. */
  readonly dependencies: string[] = []

  /** Bind services into the container. Synchronous. Called before boot(). */
  register(app: Application): void {}

  /** Initialize services after ALL providers are registered. Can be async. */
  boot(app: Application): void | Promise<void> {}

  /** Clean up resources during shutdown. Called in reverse boot order. */
  shutdown(app: Application): void | Promise<void> {}
}
