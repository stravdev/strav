# @strav/devtools

Application debugging and performance monitoring. Combines a request inspector with an APM dashboard. Captures requests, queries, exceptions, logs, and jobs. Serves a built-in SPA dashboard at `/_devtools`.

## Dependencies
- @strav/kernel (peer)
- @strav/http (peer)
- @strav/database (peer)
- @strav/cli (peer)

## Commands
- bun test
- bun run build

## Architecture
- src/devtools_manager.ts — main manager class
- src/devtools_provider.ts — service provider registration
- src/collectors/ — data collectors (requests, queries, logs, etc.)
- src/recorders/ — metric recorders for APM
- src/storage/ — collected data storage backends
- src/dashboard/ — SPA frontend served at /_devtools
- src/commands/ — CLI commands
- src/types.ts — type definitions
- src/errors.ts — package-specific errors

## Conventions
- Collectors capture individual entries, recorders aggregate metrics
- Dashboard is self-contained in src/dashboard/ — bundled as static assets
- Should only be enabled in development environments
