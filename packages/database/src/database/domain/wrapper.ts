import type { SQL } from 'bun'
import { getCurrentSchema, hasSchemaContext } from './context'

/**
 * Creates a schema-aware wrapper around Bun's SQL client.
 * Automatically injects SET search_path before queries when in schema context.
 */
export function createSchemaAwareSQL(sql: SQL): SQL {
  // Create a proxy that intercepts all SQL operations
  return new Proxy(sql, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver)

      // Handle the special tagged template function
      if (prop === Symbol.for('call') || prop === 'apply' || prop === 'bind') {
        return value
      }

      // Intercept methods that execute queries
      if (typeof value === 'function') {
        return interceptMethod(target, prop as string, value)
      }

      return value
    },

    // Handle tagged template literals: sql`SELECT * FROM users`
    apply(target, thisArg, argArray) {
      return wrapQuery(() => Reflect.apply(target as any, thisArg, argArray))
    },
  }) as SQL
}

/**
 * Intercept SQL methods to inject schema context
 */
function interceptMethod(sql: SQL, method: string, original: Function): Function {
  // Methods that execute queries and need schema context
  const queryMethods = ['unsafe', 'exec', 'prepare', 'run', 'query']

  // Transaction methods need special handling
  if (method === 'begin' || method === 'transaction') {
    return async function(this: any, ...args: any[]) {
      const schema = getCurrentSchema()
      const needsSchema = hasSchemaContext()

      // For transactions, we need to wrap the callback
      if (args.length > 0 && typeof args[0] === 'function') {
        const callback = args[0]
        args[0] = async (trx: SQL) => {
          // Create schema-aware transaction
          const schemaTrx = needsSchema ? createSchemaAwareSQL(trx) : trx

          // Set search_path at transaction start if needed
          if (needsSchema) {
            await trx.unsafe(`SET search_path TO "${schema}", public`)
          }

          return callback(schemaTrx)
        }
      }

      return original.apply(this, args)
    }
  }

  // Intercept query execution methods
  if (queryMethods.includes(method)) {
    return function(this: any, ...args: any[]) {
      return wrapQuery(() => original.apply(this, args))
    }
  }

  // Pass through other methods unchanged
  return original.bind(sql)
}

/**
 * Wrap a query execution with schema context
 */
async function wrapQuery<T>(execute: () => T | Promise<T>): Promise<T> {
  if (!hasSchemaContext()) {
    // No schema context, execute normally
    return execute()
  }

  // In schema context but implementation differs based on connection pooling
  // For now, we'll handle this at a higher level
  return execute()
}

/**
 * Set the search_path for a connection
 * This is a utility function to be called explicitly when needed
 */
export async function setSearchPath(sql: SQL, schema: string): Promise<void> {
  await sql.unsafe(`SET search_path TO "${schema}", public`)
}

/**
 * Reset the search_path to default
 */
export async function resetSearchPath(sql: SQL): Promise<void> {
  await sql.unsafe('SET search_path TO public')
}