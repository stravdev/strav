import { expect, test, describe, beforeAll, afterAll } from 'bun:test'
import { Container } from '@strav/kernel/core'
import Configuration from '@strav/kernel/config/configuration'
import Database from '../src/database/database'
import {
  withSchema,
  withoutSchema,
  getCurrentSchema,
  hasSchemaContext,
  SchemaManager,
} from '../src/database/domain'
import { sql } from '../src/database'

describe('Multi-domain Database', () => {
  let container: Container
  let db: Database
  let manager: SchemaManager

  beforeAll(async () => {
    // Setup DI container
    container = new Container()

    // Configure database with multi-schema enabled
    const config = new Configuration({})
    // Set test database credentials via config
    config.set('database.host', '127.0.0.1')
    config.set('database.port', 5432)
    config.set('database.username', 'liva')
    config.set('database.password', 'password1234')
    config.set('database.database', 'strav_testing')
    config.set('database.multiSchema.enabled', true)

    container.singleton(Configuration, () => config)
    container.singleton(Database)
    container.singleton(SchemaManager)

    db = container.resolve(Database)
    manager = container.resolve(SchemaManager)

    // Clean up any existing test schemas
    const existingSchemas = await manager.listSchemas()
    for (const schema of existingSchemas) {
      if (schema.startsWith('test_schema_')) {
        await manager.deleteSchema(schema)
      }
    }
  })

  afterAll(async () => {
    // Clean up test schemas
    const schemas = await manager.listSchemas()
    for (const schema of schemas) {
      if (schema.startsWith('test_schema_')) {
        await manager.deleteSchema(schema)
      }
    }

    await db.close()
  })

  describe('Schema Context', () => {
    test('should set and retrieve schema context', async () => {
      expect(hasSchemaContext()).toBe(false)
      expect(getCurrentSchema()).toBe('public')

      await withSchema('test_schema', async () => {
        expect(hasSchemaContext()).toBe(true)
        expect(getCurrentSchema()).toBe('test_schema')
      })

      expect(hasSchemaContext()).toBe(false)
      expect(getCurrentSchema()).toBe('public')
    })

    test('should bypass schema context', async () => {
      await withSchema('test_schema', async () => {
        expect(hasSchemaContext()).toBe(true)

        await withoutSchema(async () => {
          expect(hasSchemaContext()).toBe(false)
          expect(getCurrentSchema()).toBe('public')
        })

        expect(hasSchemaContext()).toBe(true)
      })
    })

    test('should preserve context through async operations', async () => {
      await withSchema('test_schema', async () => {
        const schema1 = getCurrentSchema()

        await new Promise(resolve => setTimeout(resolve, 10))
        const schema2 = getCurrentSchema()

        const result = await Promise.all([
          Promise.resolve(getCurrentSchema()),
          new Promise(resolve => setTimeout(() => resolve(getCurrentSchema()), 10)),
        ])

        expect(schema1).toBe('test_schema')
        expect(schema2).toBe('test_schema')
        expect(result[0]).toBe('test_schema')
        expect(result[1]).toBe('test_schema')
      })
    })
  })

  describe('Schema Management', () => {
    test('should create and delete schema', async () => {
      const schemaName = 'test_schema_create'

      // Create schema
      await manager.createSchema(schemaName)
      expect(await manager.schemaExists(schemaName)).toBe(true)

      // Delete schema
      await manager.deleteSchema(schemaName)
      expect(await manager.schemaExists(schemaName)).toBe(false)
    })

    test('should list schemas', async () => {
      await manager.createSchema('test_schema_list_1')
      await manager.createSchema('test_schema_list_2')

      const schemas = await manager.listSchemas()
      expect(schemas).toContain('test_schema_list_1')
      expect(schemas).toContain('test_schema_list_2')

      // Clean up
      await manager.deleteSchema('test_schema_list_1')
      await manager.deleteSchema('test_schema_list_2')
    })

    test('should validate schema names', async () => {
      // Invalid characters should throw
      await expect(
        manager.createSchema('test-invalid')
      ).rejects.toThrow('Invalid schema name')

      await expect(
        manager.createSchema('TEST_UPPERCASE')
      ).rejects.toThrow('Invalid schema name')
    })

    test('should get schema statistics', async () => {
      const schema = 'test_schema_stats'
      await manager.createSchema(schema)

      // Create a test table
      await withSchema(schema, async () => {
        await sql`
          CREATE TABLE test_table (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100)
          )`

        await sql`INSERT INTO test_table (name) VALUES ('test1'), ('test2')`
      })

      const stats = await manager.getSchemaStats(schema)
      expect(stats.tables).toBeGreaterThan(0)
      expect(stats.totalRows).toBeGreaterThanOrEqual(2)
      expect(stats.sizeInBytes).toBeGreaterThan(0)

      // Clean up
      await manager.deleteSchema(schema)
    })
  })

  describe('Query Execution', () => {
    beforeAll(async () => {
      // Create test schemas with tables
      for (const schema of ['test_schema_a', 'test_schema_b']) {
        await manager.createSchema(schema)
        await withSchema(schema, async () => {
          await sql`
            CREATE TABLE users (
              id SERIAL PRIMARY KEY,
              email VARCHAR(255) UNIQUE NOT NULL,
              schema_name VARCHAR(100)
            )`
        })
      }
    })

    afterAll(async () => {
      await manager.deleteSchema('test_schema_a')
      await manager.deleteSchema('test_schema_b')
    })

    test('should isolate data between schemas', async () => {
      // Insert data in schema A
      await withSchema('test_schema_a', async () => {
        await sql`
          INSERT INTO users (email, schema_name)
          VALUES ('user_a@example.com', 'Schema A')`
      })

      // Insert data in schema B
      await withSchema('test_schema_b', async () => {
        await sql`
          INSERT INTO users (email, schema_name)
          VALUES ('user_b@example.com', 'Schema B')`
      })

      // Verify isolation - schema A
      await withSchema('test_schema_a', async () => {
        const users = await sql`SELECT * FROM users`
        expect(users).toHaveLength(1)
        expect(users[0].email).toBe('user_a@example.com')
        expect(users[0].schema_name).toBe('Schema A')
      })

      // Verify isolation - schema B
      await withSchema('test_schema_b', async () => {
        const users = await sql`SELECT * FROM users`
        expect(users).toHaveLength(1)
        expect(users[0].email).toBe('user_b@example.com')
        expect(users[0].schema_name).toBe('Schema B')
      })
    })

    test('should execute schema-specific queries', async () => {
      const result = await manager.executeSchema(
        'test_schema_a',
        'SELECT COUNT(*) as count FROM users'
      )

      expect(result[0].count).toBe('1')
    })
  })

  describe('Transactions', () => {
    beforeAll(async () => {
      await manager.createSchema('test_schema_tx')
      await withSchema('test_schema_tx', async () => {
        await sql`
          CREATE TABLE accounts (
            id SERIAL PRIMARY KEY,
            balance DECIMAL(10, 2) NOT NULL
          )`
      })
    })

    afterAll(async () => {
      await manager.deleteSchema('test_schema_tx')
    })

    test('should maintain schema context in transactions', async () => {
      await withSchema('test_schema_tx', async () => {
        // Insert initial data
        await sql`INSERT INTO accounts (balance) VALUES (100.00), (200.00)`

        // Transaction with schema context
        await sql.begin(async (tx) => {
          // Update within transaction
          await tx`UPDATE accounts SET balance = balance + 50 WHERE id = 1`
          await tx`UPDATE accounts SET balance = balance - 50 WHERE id = 2`

          // Verify within transaction
          const results = await tx`SELECT SUM(balance) as total FROM accounts`
          expect(Number(results[0].total)).toBe(300)
        })

        // Verify after transaction
        const accounts = await sql`SELECT * FROM accounts ORDER BY id`
        expect(Number(accounts[0].balance)).toBe(150)
        expect(Number(accounts[1].balance)).toBe(150)
      })
    })

    test('should rollback on error', async () => {
      await withSchema('test_schema_tx', async () => {
        const initialBalance = await sql`SELECT balance FROM accounts WHERE id = 1`

        try {
          await sql.begin(async (tx) => {
            await tx`UPDATE accounts SET balance = balance + 100 WHERE id = 1`
            throw new Error('Rollback test')
          })
        } catch (e) {
          // Expected error
        }

        const finalBalance = await sql`SELECT balance FROM accounts WHERE id = 1`
        expect(finalBalance[0].balance).toBe(initialBalance[0].balance)
      })
    })
  })
})