import Configuration from '@strav/kernel/config/configuration'
import Database from '@strav/database/database/database'
import SchemaRegistry from '@strav/database/schema/registry'
import DatabaseIntrospector from '@strav/database/database/introspector'
import Application from '@strav/kernel/core/application'
import type ServiceProvider from '@strav/kernel/core/service_provider'
import { discoverDomains } from '@strav/database'
import { getDatabasePaths } from '../config/loader.ts'

export interface BootstrapResult {
  config: Configuration
  db: Database
  registry: SchemaRegistry
  introspector: DatabaseIntrospector
}

/**
 * Bootstrap the core framework services needed by CLI commands.
 *
 * Loads configuration, connects to the database, discovers and validates
 * schemas, and creates an introspector instance.
 *
 * @param scope - Optional domain to discover schemas from (e.g., 'public', 'tenant', 'factory')
 */
export async function bootstrap(scope?: string): Promise<BootstrapResult> {
  const config = new Configuration('./config')
  await config.load()

  const db = new Database(config)

  const registry = new SchemaRegistry()

  // Get the configured database paths
  const dbPaths = await getDatabasePaths()

  if (scope && scope !== 'public') {
    // For non-public domains, we need to load public schemas first since they may reference them
    await registry.discover(dbPaths.schemas, 'public')
    await registry.discover(dbPaths.schemas, scope)
  } else if (scope === 'public') {
    // For public schemas, only load public
    await registry.discover(dbPaths.schemas, 'public')
  } else {
    // Default: discover all schemas (backward compatibility)
    await registry.discover(dbPaths.schemas)
  }

  registry.validate()

  const introspector = new DatabaseIntrospector(db)

  return { config, db, registry, introspector }
}

/** Cleanly close the database connection. */
export async function shutdown(db: Database): Promise<void> {
  await db.close()
}

/**
 * Bootstrap an Application with the given service providers.
 *
 * Creates a fresh Application, registers all providers, boots them
 * in dependency order, and returns the running application.
 * Signal handlers for graceful shutdown are installed automatically.
 *
 * @example
 * const app = await withProviders([
 *   new ConfigProvider(),
 *   new DatabaseProvider(),
 *   new AuthProvider({ resolver: (id) => User.find(id) }),
 * ])
 */
export async function withProviders(providers: ServiceProvider[]): Promise<Application> {
  const app = new Application()
  for (const provider of providers) app.use(provider)
  await app.start()
  return app
}
