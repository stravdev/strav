import { AsyncLocalStorage } from 'node:async_hooks'

/**
 * Schema context for multi-domain database operations.
 * Stores the current domain's PostgreSQL schema name.
 */
export interface SchemaContext {
  /** The PostgreSQL schema name for the current domain */
  schema: string
  /** Whether to bypass schema isolation (for admin/global operations) */
  bypass?: boolean
}

/**
 * AsyncLocalStorage for schema context.
 * Automatically propagates schema context through async operations.
 */
export const schemaStorage = new AsyncLocalStorage<SchemaContext>()

/**
 * Execute a function within a schema context.
 * All database operations within the callback will use the specified schema.
 *
 * @example
 * // In HTTP middleware
 * await withSchema('company_123', async () => {
 *   // All queries here automatically use company_123 schema
 *   const users = await User.all()
 *   const orders = await query(Order).where('status', 'pending').all()
 * })
 *
 * @example
 * // In background jobs
 * await withSchema(job.domainId, async () => {
 *   await processInvoices()
 * })
 */
export async function withSchema<T>(
  schema: string,
  callback: () => T | Promise<T>
): Promise<T> {
  return schemaStorage.run({ schema }, callback)
}

/**
 * Execute a function with schema isolation bypassed.
 * Useful for admin operations that need to access all schemas.
 *
 * @example
 * await withoutSchema(async () => {
 *   // Query runs without schema restriction
 *   await db.sql`SELECT * FROM information_schema.schemata`
 * })
 */
export async function withoutSchema<T>(
  callback: () => T | Promise<T>
): Promise<T> {
  return schemaStorage.run({ schema: 'public', bypass: true }, callback)
}

/**
 * Get the current schema context.
 * Returns null if not within a schema context.
 */
export function getCurrentSchemaContext(): SchemaContext | null {
  return schemaStorage.getStore() ?? null
}

/**
 * Get the current schema name.
 * Returns 'public' if not within a schema context.
 */
export function getCurrentSchema(): string {
  const context = getCurrentSchemaContext()
  return context?.bypass ? 'public' : (context?.schema ?? 'public')
}

/**
 * Check if currently running within a schema context.
 */
export function hasSchemaContext(): boolean {
  const context = getCurrentSchemaContext()
  return context !== null && !context.bypass
}