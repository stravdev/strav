# @strav/create

CLI scaffolding tool to create new Strav applications. Invoked via `bun create strav`.

## Dependencies
None (standalone CLI tool).

## Commands
- bun test
- bun run build

## Architecture
- src/index.ts — entry point
- src/prompts.ts — interactive CLI prompts
- src/scaffold.ts — project scaffolding logic
- src/templates/ — project template files

## Conventions
- Templates are static files copied during scaffolding
- Prompts define the interactive setup flow
