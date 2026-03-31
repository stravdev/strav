# Multi-Domain Database Support

The `@strav/database` package provides comprehensive support for multi-domain applications using PostgreSQL schemas. You can organize your database into multiple domains (e.g., `public`, `tenant`, `factory`, `marketing`), with each domain having isolated schemas while sharing the same database instance.

## Domains

Domains allow you to organize your database schemas by business domain or tenant type:

```
database/schemas/
├── public/          # System-wide schemas (users, organizations, etc.)
├── tenant/          # Tenant-specific schemas (orders, products, etc.)
├── factory/         # Factory-specific schemas (machines, production, etc.)
└── marketing/       # Marketing-specific schemas (campaigns, analytics, etc.)

database/migrations/
├── public/          # Migrations for public domain
├── tenant/          # Migrations for tenant domain
├── factory/         # Migrations for factory domain
└── marketing/       # Migrations for marketing domain
```

### Model Generation

By default, each domain gets a model prefix:
- `public` → no prefix (`User`, `Organization`)
- `tenant` → `Tenant` prefix (`TenantOrder`, `TenantProduct`)
- `factory` → `Factory` prefix (`FactoryMachine`, `FactoryProduction`)
- `marketing` → `Marketing` prefix (`MarketingCampaign`)

Prefixes can be customized in `config/generators.ts`:

```typescript
export default {
  modelNaming: {
    public: '',           // No prefix for public models
    tenant: 'Tenant',     // Custom prefix for tenant models
    factory: 'Plant',     // Custom prefix for factory models
    marketing: null,      // No prefix for marketing models
  }
}
```

## Overview

The multi-tenant implementation uses PostgreSQL's `SET search_path` to transparently route queries to the correct tenant schema without requiring qualified table names. This approach provides:

- **Complete data isolation** between tenants
- **Transparent operation** - existing queries work without modification
- **Shared connection pooling** for efficiency
- **Schema-per-tenant** architecture
- **AsyncLocalStorage** for automatic context propagation

## Configuration

Enable multi-tenant mode in your database configuration:

```typescript
// config/database.ts
export default {
  // Standard database configuration
  host: env('DB_HOST', 'localhost'),
  port: env('DB_PORT', 5432),
  database: env('DB_DATABASE', 'myapp'),
  username: env('DB_USER', 'postgres'),
  password: env('DB_PASSWORD', ''),

  // Multi-tenant configuration
  multiTenant: {
    enabled: true,
  },
}
```

## Basic Usage

### Setting Tenant Context

Use `withSchema()` to execute database operations within a specific tenant's schema:

```typescript
import { withSchema } from '@strav/database'
import { User } from '../models/User'

// All database operations within this block use company_123 schema
await withSchema('company_123', async () => {
  // ORM queries
  const users = await User.all()
  const admin = await User.findBy('role', 'admin')

  // Query builder
  const orders = await query(Order)
    .where('status', 'pending')
    .orderBy('created_at', 'DESC')
    .all()

  // Raw SQL
  const stats = await sql`
    SELECT COUNT(*) as total
    FROM users
    WHERE active = true
  `
})
```

### HTTP Integration

Create your own middleware in your app layer to extract and set tenant context:

```typescript
// app/middleware/tenant.ts
import { withSchema, withoutSchema, SchemaManager } from '@strav/database'
import type { Middleware } from '@strav/http'

export const tenantMiddleware: Middleware = async (ctx, next) => {
  // Extract tenant from subdomain
  const host = ctx.request.headers.get('host')
  const tenant = host?.split('.')[0] // tenant123.example.com -> tenant123

  if (tenant && tenant !== 'www') {
    // Map to schema name
    const schema = `tenant_${tenant}`

    // Optionally validate tenant exists
    const manager = container.resolve(SchemaManager)
    if (await manager.tenantExists(schema)) {
      return withSchema(schema, () => next())
    }
  }

  // Continue without tenant context
  return next()
}

// Alternative: Extract from header
export const headerTenantMiddleware: Middleware = async (ctx, next) => {
  const tenantId = ctx.request.headers.get('X-Tenant-ID')

  if (tenantId) {
    return withSchema(tenantId, () => next())
  }

  return next()
}

// For admin routes that need to bypass tenant isolation
export const bypassTenant: Middleware = async (ctx, next) => {
  return withoutSchema(() => next())
}
```

Then use in your routes:

```typescript
// app/routes.ts
import { router } from '@strav/http'
import { tenantMiddleware, bypassTenant } from './middleware/tenant'

// Apply tenant context to all routes
router.use(tenantMiddleware)

// Regular routes use tenant context automatically
router.get('/users', async (ctx) => {
  const users = await User.all() // Uses tenant schema
  return ctx.json(users)
})

// Admin routes can bypass tenant isolation
router.get('/admin/tenants', bypassTenant, async (ctx) => {
  const manager = container.resolve(SchemaManager)
  const tenants = await manager.listTenants() // Accesses all schemas
  return ctx.json(tenants)
})
```

## Tenant Management

The `SchemaManager` class provides utilities for schema management:

### Creating Tenants

```typescript
import { SchemaManager } from '@strav/database'

const manager = container.resolve(SchemaManager)

// Create a new tenant schema
await manager.createSchema('company_123')

// Clone structure from template schema
await manager.cloneSchema('public', 'tenant_456')
```

### Running Migrations

```typescript
// Migrate specific tenant
await manager.migrateTenant('company_123')

// Migrate all tenants
await manager.migrateAllTenants()
```

### Managing Tenants

```typescript
// Check if tenant exists
const exists = await manager.tenantExists('company_123')

// List all tenants
const tenants = await manager.listTenants()
// ['company_123', 'tenant_456', ...]

// Get tenant statistics
const stats = await manager.getTenantStats('company_123')
console.log(stats)
// { tables: 15, totalRows: 45678, sizeInBytes: 10485760 }

// Delete tenant (CAUTION: irreversible!)
await manager.deleteSchema('old_tenant')
```

## CLI Commands

The Strav CLI provides commands for working with domains:

### Generate Migrations

```bash
# Generate migration for public domain
bun strav generate:migration --scope=public --message="add user table"

# Generate migration for tenant domain
bun strav generate:migration --scope=tenant --message="add orders table"

# Generate migration for custom domain
bun strav generate:migration --scope=factory --message="add machine table"
```

### Run Migrations

```bash
# Run public migrations
bun strav migrate --scope=public

# Run tenant migrations
bun strav migrate --scope=tenant

# Run migrations for custom domain
bun strav migrate --scope=factory
```

### Rollback Migrations

```bash
# Rollback public migrations
bun strav rollback --scope=public

# Rollback last batch for tenant domain
bun strav rollback --scope=tenant

# Rollback specific batch
bun strav rollback --scope=tenant --batch=5
```

### Generate Models

```bash
# Generate models for all domains
bun strav generate:models --scope=all

# Generate models for specific domain
bun strav generate:models --scope=tenant
bun strav generate:models --scope=factory
```

## Transactions

Transactions automatically preserve tenant context:

```typescript
await withSchema('company_123', async () => {
  await transaction(async (trx) => {
    // All queries within transaction use company_123 schema
    const user = await User.create({ name: 'Alice' }, trx)
    const profile = await Profile.create({ userId: user.id }, trx)

    // Query builder with transaction
    await query(Order, trx)
      .where('user_id', user.id)
      .update({ status: 'active' })
  })
})
```

## Background Jobs

Set tenant context in background jobs and workers:

```typescript
// In your job processor
async function processJob(job: Job) {
  const { tenantId, data } = job.payload

  await withSchema(tenantId, async () => {
    // All database operations use the tenant's schema
    await processInvoices(data)
    await sendNotifications()
  })
}
```

## Admin Operations

Bypass tenant isolation for administrative tasks:

```typescript
import { withoutSchema } from '@strav/database'

// Access all schemas without tenant restriction
await withoutSchema(async () => {
  // Query across all tenant schemas
  const report = await sql`
    SELECT
      schema_name,
      (SELECT COUNT(*) FROM information_schema.tables
       WHERE table_schema = schema_name) as table_count
    FROM information_schema.schemata
    WHERE schema_name LIKE 'tenant_%'
  `
})
```

## Direct Execution

Execute queries directly in a specific tenant:

```typescript
const manager = container.resolve(SchemaManager)

// Execute query in specific tenant
const users = await manager.executeTenant(
  'company_123',
  'SELECT * FROM users WHERE active = $1',
  [true]
)
```

## Best Practices

### 1. Schema Naming

Use consistent schema naming conventions:

```typescript
// Good: predictable and safe
const schema = `tenant_${tenantId.toLowerCase()}`

// Validate schema names to prevent injection
if (!/^[a-z0-9_]+$/.test(schema)) {
  throw new Error('Invalid schema name')
}
```

### 2. Connection Pooling

Multi-tenant mode shares the connection pool efficiently. The search_path is set per-query, not per-connection, ensuring optimal resource usage.

### 3. Testing

Test with multiple tenants:

```typescript
// test/multi-tenant.test.ts
import { withSchema, SchemaManager } from '@strav/database'

beforeEach(async () => {
  const manager = container.resolve(SchemaManager)
  await manager.createSchema('test_schema_1')
  await manager.createSchema('test_schema_2')
})

afterEach(async () => {
  const manager = container.resolve(SchemaManager)
  await manager.deleteSchema('test_schema_1')
  await manager.deleteSchema('test_schema_2')
})

test('data isolation between tenants', async () => {
  // Create user in tenant 1
  await withSchema('test_schema_1', async () => {
    await User.create({ email: 'user1@example.com' })
  })

  // Create user in tenant 2
  await withSchema('test_schema_2', async () => {
    await User.create({ email: 'user2@example.com' })
  })

  // Verify isolation
  await withSchema('test_schema_1', async () => {
    const users = await User.all()
    expect(users).toHaveLength(1)
    expect(users[0].email).toBe('user1@example.com')
  })

  await withSchema('test_schema_2', async () => {
    const users = await User.all()
    expect(users).toHaveLength(1)
    expect(users[0].email).toBe('user2@example.com')
  })
})
```

### 4. Migrations

Structure your migrations to work across all tenant schemas:

```typescript
// migrations/2024_01_01_create_users_table.ts
export async function up(sql: SQL) {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `
}

export async function down(sql: SQL) {
  await sql`DROP TABLE IF EXISTS users`
}
```

Then apply to all tenants:

```bash
# Run migrations for all tenants
bun run migrate:tenants
```

### 5. Monitoring

Monitor tenant usage and performance:

```typescript
async function getTenantMetrics() {
  const manager = container.resolve(SchemaManager)
  const tenants = await manager.listTenants()

  const metrics = await Promise.all(
    tenants.map(async (tenant) => ({
      tenant,
      stats: await manager.getTenantStats(tenant),
    }))
  )

  return metrics
}
```

## Security Considerations

1. **Schema Isolation**: Each tenant's data is completely isolated at the schema level
2. **SQL Injection Protection**: Always validate schema names before use
3. **Connection Security**: The search_path is set per-query, preventing cross-tenant data leaks
4. **Audit Logging**: Track tenant context in your audit logs

```typescript
// Audit log with tenant context
function logDatabaseOperation(operation: string) {
  const tenant = getCurrentTenant()
  logger.info('Database operation', {
    operation,
    tenant: tenant?.schema ?? 'public',
    timestamp: new Date(),
  })
}
```

## Troubleshooting

### Checking Current Tenant

```typescript
import { getCurrentTenant, getCurrentSchema } from '@strav/database'

// In your code
const context = getCurrentTenant()
console.log('Current schema:', getCurrentSchema())
console.log('Has tenant context:', hasTenantContext())
```

### Debug Mode

Enable debug logging for tenant operations:

```typescript
// In development
if (process.env.NODE_ENV === 'development') {
  const original = getCurrentSchema
  getCurrentSchema = () => {
    const schema = original()
    console.log(`[TENANT] Using schema: ${schema}`)
    return schema
  }
}
```

### Common Issues

**Issue**: Queries not using tenant schema
- Check that multi-tenant mode is enabled in config
- Verify tenant context is set with `hasTenantContext()`
- Ensure middleware is applied before route handlers

**Issue**: Cannot access public schema
- Use `withoutSchema()` for operations that need public schema
- Use `bypassTenant` middleware for admin routes

**Issue**: Transaction rollback loses tenant context
- Tenant context is preserved within transactions automatically
- Check that you're not manually manipulating search_path

## API Reference

### Context Functions

- `withSchema(schema, callback)` - Execute callback within tenant context
- `withoutSchema(callback)` - Execute callback without tenant isolation
- `getCurrentTenant()` - Get current tenant context
- `getCurrentSchema()` - Get current schema name
- `hasTenantContext()` - Check if in tenant context

### SchemaManager Methods

- `createSchema(schema)` - Create new tenant schema
- `deleteSchema(schema)` - Delete tenant schema (irreversible)
- `tenantExists(schema)` - Check if tenant exists
- `listTenants()` - List all tenant schemas
- `migrateTenant(schema)` - Run migrations for tenant
- `migrateAllTenants()` - Run migrations for all tenants
- `cloneSchema(source, target)` - Copy schema structure
- `getTenantStats(schema)` - Get tenant statistics
- `executeTenant(schema, sql, params)` - Execute query in tenant

