# @strav/cli

CLI framework and code generators for the Strav framework. Provides the `strav` binary.

## Dependencies
- @strav/kernel (peer)
- @strav/http (peer)
- @strav/database (peer)
- @strav/queue (peer)
- @strav/signal (peer)

## Commands
- bun test
- bun run typecheck

## Architecture
- src/cli/ — CLI bootstrap, command loader, strav.ts entry point
- src/commands/ — Built-in commands (migrations, queue, scheduler, generators, db seed)
- src/generators/ — Code generators (model, route, API, test, doc)

## Domain Support
CLI commands now support dynamic domains instead of hardcoded 'public'/'tenants':
- Commands auto-discover available domains from schema directories (configurable via `config/generators.ts`)
- Domains: public (always exists), plus any custom domains (tenant, factory, marketing, etc.)
- Migration commands: `--scope` parameter accepts any discovered domain
- Model generation: `--scope` parameter accepts any domain or 'all'
- Model prefixes: public = no prefix, others = PascalCase by default (configurable)

## Database Path Configuration
Database paths for schemas and migrations are configurable via `config/generators.ts`:
- Default schemas path: `database/schemas`
- Default migrations path: `database/migrations`
- Override in config to use custom locations (e.g., `src/db/schemas`, `src/db/migrations`)

## Conventions
- Commands are auto-loaded by command_loader.ts
- Generators output code that imports from the split packages (@strav/kernel, @strav/http, etc.)
- The `strav` binary is declared in package.json bin field
- Domains are validated against filesystem discovery to prevent invalid domain names
