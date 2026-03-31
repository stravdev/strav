import type { SQL } from 'bun'
import Database from '../database'
import MigrationRunner from '../migration/runner'
import MigrationTracker from '../migration/tracker'
import { withSchema, withoutSchema } from './context'
import { inject } from '@strav/kernel/core/inject'

/**
 * Schema manager for multi-domain database operations.
 * Handles schema creation, deletion, and migrations per domain.
 */
@inject
export class SchemaManager {
  private db: SQL
  private database: Database

  constructor(database: Database) {
    this.database = database
    this.db = database.sql
  }

  /**
   * Create a new schema for a domain.
   *
   * @example
   * const manager = container.resolve(SchemaManager)
   * await manager.createSchema('company_123')
   */
  async createSchema(schema: string): Promise<void> {
    await withoutSchema(async () => {
      // Validate schema name (prevent SQL injection)
      if (!/^[a-z0-9_]+$/.test(schema)) {
        throw new Error(`Invalid schema name: ${schema}. Only lowercase letters, numbers, and underscores are allowed.`)
      }

      // Create the schema
      await this.db.unsafe(`CREATE SCHEMA IF NOT EXISTS "${schema}"`)

      // Grant permissions to the current user
      const currentUser = await this.getCurrentUser()
      if (currentUser) {
        await this.db.unsafe(`GRANT ALL ON SCHEMA "${schema}" TO "${currentUser}"`)
      }
    })
  }

  /**
   * Delete a domain's schema and all its data.
   * USE WITH CAUTION - This is irreversible!
   *
   * @example
   * await manager.deleteSchema('company_123')
   */
  async deleteSchema(schema: string): Promise<void> {
    await withoutSchema(async () => {
      // Validate schema name
      if (!/^[a-z0-9_]+$/.test(schema)) {
        throw new Error(`Invalid schema name: ${schema}`)
      }

      // Don't allow deletion of system schemas
      if (['public', 'pg_catalog', 'information_schema'].includes(schema)) {
        throw new Error(`Cannot delete system schema: ${schema}`)
      }

      // Drop the schema and all objects within it
      await this.db.unsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`)
    })
  }

  /**
   * Check if a schema exists.
   *
   * @example
   * const exists = await manager.schemaExists('company_123')
   */
  async schemaExists(schema: string): Promise<boolean> {
    const result = await withoutSchema(async () => {
      return this.db.unsafe(
        `SELECT EXISTS (
          SELECT 1 FROM information_schema.schemata
          WHERE schema_name = $1
        ) as exists`,
        [schema]
      )
    })

    return result[0]?.exists ?? false
  }

  /**
   * List all domain schemas (excluding system schemas).
   *
   * @example
   * const schemas = await manager.listSchemas()
   * console.log(schemas) // ['company_123', 'factory_456']
   */
  async listSchemas(): Promise<string[]> {
    const result = await withoutSchema(async () => {
      return this.db.unsafe(`
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name NOT IN ('public', 'pg_catalog', 'information_schema', 'pg_toast')
          AND schema_name NOT LIKE 'pg_%'
        ORDER BY schema_name
      `)
    })

    return result.map((row: any) => row.schema_name)
  }

  /**
   * Run migrations for a specific schema.
   *
   * @example
   * await manager.migrateSchema('company_123')
   */
  async migrateSchema(schema: string, migrationsPath: string = 'database/migrations/domains'): Promise<void> {
    await withSchema(schema, async () => {
      const tracker = new MigrationTracker(this.database, 'domains')
      const runner = new MigrationRunner(this.database, tracker, migrationsPath, 'domains')
      await runner.run()
    })
  }

  /**
   * Run migrations for all schemas.
   *
   * @example
   * await manager.migrateAllSchemas()
   */
  async migrateAllSchemas(migrationsPath?: string): Promise<void> {
    const schemas = await this.listSchemas()

    for (const schema of schemas) {
      console.log(`Migrating schema: ${schema}`)
      await this.migrateSchema(schema, migrationsPath)
    }
  }

  /**
   * Copy schema structure from one schema to another.
   * Useful for creating new domains with the same structure.
   *
   * @example
   * await manager.cloneSchema('public', 'company_123')
   */
  async cloneSchema(sourceSchema: string, targetSchema: string): Promise<void> {
    await withoutSchema(async () => {
      // Validate schema names
      if (!/^[a-z0-9_]+$/.test(sourceSchema) || !/^[a-z0-9_]+$/.test(targetSchema)) {
        throw new Error('Invalid schema name')
      }

      // Create target schema
      await this.createSchema(targetSchema)

      // Get all tables from source schema
      const tables = await this.db.unsafe(`
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = $1
      `, [sourceSchema])

      // Copy each table structure (without data)
      for (const { tablename } of tables as Array<{ tablename: string }>) {
        await this.db.unsafe(`
          CREATE TABLE "${targetSchema}"."${tablename}"
          (LIKE "${sourceSchema}"."${tablename}" INCLUDING ALL)
        `)
      }

      // Copy sequences
      const sequences = await this.db.unsafe(`
        SELECT sequence_name
        FROM information_schema.sequences
        WHERE sequence_schema = $1
      `, [sourceSchema])

      for (const { sequence_name } of sequences) {
        const seqDef = await this.db.unsafe(`
          SELECT pg_get_serial_sequence($1, $2) as seq_def
        `, [`${sourceSchema}.${sequence_name}`, 'id'])

        if (seqDef[0]?.seq_def) {
          await this.db.unsafe(`
            CREATE SEQUENCE "${targetSchema}"."${sequence_name}"
          `)
        }
      }
    })
  }

  /**
   * Get the current database user.
   */
  private async getCurrentUser(): Promise<string | null> {
    const result = await this.db.unsafe('SELECT current_user')
    return result[0]?.current_user ?? null
  }

  /**
   * Execute a raw SQL query within a specific schema context.
   *
   * @example
   * const users = await manager.executeSchema('company_123',
   *   'SELECT * FROM users WHERE active = $1', [true]
   * )
   */
  async executeSchema<T = any>(
    schema: string,
    sql: string,
    params?: any[]
  ): Promise<T[]> {
    return withSchema(schema, async () => {
      return this.db.unsafe(sql, params) as Promise<T[]>
    })
  }

  /**
   * Get table statistics for a schema.
   *
   * @example
   * const stats = await manager.getSchemaStats('company_123')
   */
  async getSchemaStats(schema: string): Promise<{
    tables: number
    totalRows: number
    sizeInBytes: number
  }> {
    const result = await withoutSchema(async () => {
      // Count tables
      const tableCount = await this.db.unsafe(`
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_schema = $1
          AND table_type = 'BASE TABLE'
      `, [schema])

      // Get total row count across all tables
      const tables = await this.db.unsafe(`
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = $1
      `, [schema])

      let totalRows = 0
      for (const { tablename } of tables as Array<{ tablename: string }>) {
        const countResult = await this.db.unsafe(
          `SELECT COUNT(*) as count FROM "${schema}"."${tablename}"`
        )
        totalRows += Number(countResult[0]?.count ?? 0)
      }

      // Get schema size
      const sizeResult = await this.db.unsafe(`
        SELECT pg_size_pretty(
          SUM(pg_total_relation_size(quote_ident(schemaname)||'.'||quote_ident(tablename)))
        ) as size,
        SUM(pg_total_relation_size(quote_ident(schemaname)||'.'||quote_ident(tablename))) as bytes
        FROM pg_tables
        WHERE schemaname = $1
      `, [schema])

      return {
        tables: Number(tableCount[0]?.count ?? 0),
        totalRows,
        sizeInBytes: Number(sizeResult[0]?.bytes ?? 0),
      }
    })

    return result
  }
}