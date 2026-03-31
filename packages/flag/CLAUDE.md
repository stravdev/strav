# @stravigor/flag

Feature flags with a unified API, scoped per-user or per-team, with optional rich values for A/B testing. Built-in drivers for PostgreSQL (persistent) and in-memory (testing).

## Dependencies
- @stravigor/kernel (peer)
- @stravigor/database (peer)
- @stravigor/http (peer)
- @stravigor/cli (peer)

## Commands
- bun test
- bun run build

## Architecture
- src/flag_manager.ts — main manager class
- src/flag_provider.ts — service provider registration
- src/feature_store.ts — feature flag storage
- src/pending_scope.ts — scoping logic
- src/drivers/ — storage backends (PostgreSQL, in-memory)
- src/commands/ — CLI commands
- src/middleware/ — HTTP middleware for flag evaluation
- src/types.ts — type definitions
- src/errors.ts — package-specific errors

## Conventions
- Drivers implement a common interface defined in types.ts
- Feature flags are scoped — always provide a scope context when evaluating
