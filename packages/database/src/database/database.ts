import { SQL } from 'bun'
import Configuration from '@stravigor/kernel/config/configuration'
import { inject } from '@stravigor/kernel/core/inject'
import { ConfigurationError } from '@stravigor/kernel/exceptions/errors'
import { env } from '@stravigor/kernel/helpers/env'
import { createSchemaAwareSQL } from './domain/wrapper'
import { getCurrentSchema, hasSchemaContext } from './domain/context'

/**
 * Database connection wrapper backed by {@link SQL Bun.sql}.
 *
 * Reads connection credentials from the `database.*` configuration keys
 * (loaded from `config/database.ts` / `.env`). Falls back to reading
 * `DB_*` environment variables directly when no config file is present.
 *
 * Register as a singleton in the DI container so a single connection pool
 * is shared across the application.
 *
 * @example
 * container.singleton(Configuration)
 * container.singleton(Database)
 * const db = container.resolve(Database)
 * const rows = await db.sql`SELECT 1 AS result`
 */
@inject
export default class Database {
  private static _connection: SQL | null = null
  private static _schemaConnection: SQL | null = null
  private connection: SQL
  private schemaConnection: SQL
  private multiSchemaEnabled: boolean

  constructor(protected config: Configuration) {
    // Close any previously orphaned connection (e.g. from hot reload)
    if (Database._connection) {
      Database._connection.close()
    }
    if (Database._schemaConnection) {
      Database._schemaConnection = null
    }

    this.connection = new SQL({
      hostname: config.get('database.host') ?? env('DB_HOST', '127.0.0.1'),
      port: config.get('database.port') ?? env.int('DB_PORT', 5432),
      username: config.get('database.username') ?? env('DB_USER', 'postgres'),
      password: config.get('database.password') ?? env('DB_PASSWORD', ''),
      database: config.get('database.database') ?? env('DB_DATABASE', 'strav'),
      max: config.get('database.pool') ?? env.int('DB_POOL_MAX', 10),
      idleTimeout: config.get('database.idleTimeout') ?? env.int('DB_IDLE_TIMEOUT', 20),
    })
    Database._connection = this.connection

    // Check if multi-schema mode is enabled
    this.multiSchemaEnabled = config.get('database.multiSchema.enabled') ?? false

    // Create schema-aware wrapper if multi-schema is enabled
    if (this.multiSchemaEnabled) {
      this.schemaConnection = createSchemaAwareSQL(this.connection)
      Database._schemaConnection = this.schemaConnection
    } else {
      this.schemaConnection = this.connection
      Database._schemaConnection = this.connection
    }
  }

  /** The underlying Bun SQL tagged-template client. */
  get sql(): SQL {
    // Return schema-aware connection if in schema context and multi-schema is enabled
    if (this.multiSchemaEnabled && hasSchemaContext()) {
      return this.createSchemaConnection()
    }
    return this.connection
  }

  /** Create a schema-specific connection with search_path set */
  private createSchemaConnection(): SQL {
    const schema = getCurrentSchema()
    const baseConn = this.connection

    // Create a proxy that sets search_path before each query
    return new Proxy(baseConn, {
      get(target, prop) {
        const value = Reflect.get(target, prop)

        // Intercept 'unsafe' method to inject search_path
        if (prop === 'unsafe') {
          return async function(sql: string, params?: any[]) {
            // For queries that should not be prefixed (like SET commands)
            if (sql.trim().toUpperCase().startsWith('SET')) {
              return target.unsafe(sql, params)
            }

            // Execute with search_path set
            const searchPathSql = `SET search_path TO "${schema}", public`
            await target.unsafe(searchPathSql)
            return target.unsafe(sql, params)
          }
        }

        // Handle tagged template function
        if (typeof value === 'function') {
          return value.bind(target)
        }

        return value
      },

      // Handle tagged template literals
      apply(target, thisArg, argArray) {
        return (async () => {
          const schema = getCurrentSchema()
          await target.unsafe(`SET search_path TO "${schema}", public`)
          return Reflect.apply(target as any, thisArg, argArray)
        })()
      },
    }) as SQL
  }

  /** The global SQL connection, available after DI bootstrap. */
  static get raw(): SQL {
    if (!Database._connection) {
      throw new ConfigurationError(
        'Database not configured. Resolve Database through the container first.'
      )
    }

    // Return schema-aware connection if available and in schema context
    if (Database._schemaConnection && hasSchemaContext()) {
      const schema = getCurrentSchema()
      const baseConn = Database._connection

      // Create inline schema-aware proxy
      return new Proxy(baseConn, {
        get(target, prop) {
          const value = Reflect.get(target, prop)

          if (prop === 'unsafe') {
            return async function(sql: string, params?: any[]) {
              if (sql.trim().toUpperCase().startsWith('SET')) {
                return target.unsafe(sql, params)
              }
              await target.unsafe(`SET search_path TO "${schema}", public`)
              return target.unsafe(sql, params)
            }
          }

          if (typeof value === 'function') {
            return value.bind(target)
          }

          return value
        },

        apply(target, thisArg, argArray) {
          return (async () => {
            await target.unsafe(`SET search_path TO "${schema}", public`)
            return Reflect.apply(target as any, thisArg, argArray)
          })()
        },
      }) as SQL
    }

    return Database._connection
  }

  /** Close the connection pool. */
  async close(): Promise<void> {
    await this.connection.close()
    if (Database._connection === this.connection) {
      Database._connection = null
    }
    if (Database._schemaConnection) {
      Database._schemaConnection = null
    }
  }

  /** Check if multi-schema mode is enabled */
  get isMultiSchema(): boolean {
    return this.multiSchemaEnabled
  }
}
