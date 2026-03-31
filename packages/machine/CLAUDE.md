# @strav/machine

Declarative state machines for domain models — define states, transitions, guards, side effects, and events in a single definition. Use standalone or as an ORM mixin with auto-persistence via stateful().

## Dependencies
- @strav/kernel (peer)
- @strav/database (peer)

## Commands
- bun test
- bun run build

## Architecture
- src/machine.ts — state machine engine
- src/stateful.ts — ORM mixin for auto-persisted state machines
- src/types.ts — type definitions
- src/errors.ts — package-specific errors
- src/index.ts — public API

## Conventions
- State machines are defined declaratively as configuration objects
- Use stateful() mixin to bind a machine to an ORM model
- Guards run before transitions, side effects run after
