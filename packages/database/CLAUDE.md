# @stravigor/database

Database layer for the Strav framework — query builder, ORM, schema builder, and migrations.

## Dependencies
- @stravigor/kernel (peer)

## Commands
- bun test
- bun run typecheck

## Architecture
- src/database/ — Database connections, query builder, migrations, introspector, seeder
  - src/database/domain/ — Multi-domain support (SchemaManager, context switching)
  - src/database/migration/ — Migration system with scope support (public/domains)
- src/orm/ — BaseModel, decorators, query builder re-export
- src/schema/ — Schema builder (field definitions, type builder, associations)
  - SchemaRegistry supports scoped discovery (public/domains)
- src/helpers/ — identity.ts (extractUserId — moved here from kernel because it depends on BaseModel)
- src/providers/ — DatabaseProvider

## Conventions
- database and orm are tightly coupled (circular dependency) — they stay together
- extractUserId lives here in src/helpers/identity.ts, not in kernel
- String helpers (toSnakeCase, toCamelCase) are imported from @stravigor/kernel/helpers

## Multi-domain Support
- Uses PostgreSQL schemas for domain isolation
- `MigrationTracker` uses separate tracking tables:
  - `_strav_migrations` for public schema
  - `_strav_{domain}_migrations` for domain schemas
- `MigrationRunner` accepts scope parameter ('public' or domain name)
- `SchemaRegistry.discover()` supports scoped discovery
- `SchemaManager` handles domain schema creation, deletion, and migrations
- Context switching via `withSchema()` and `withoutSchema()` functions
