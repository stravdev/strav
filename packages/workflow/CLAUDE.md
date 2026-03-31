# @stravigor/workflow

General-purpose workflow orchestration for multi-step processes with sequential, parallel, conditional, and looping steps. Includes saga-style compensation for automatic rollback on failure.

## Dependencies
- @stravigor/kernel (peer)

## Consumed by
- @stravigor/brain (for AI workflow orchestration)

## Commands
- bun test
- bun run build

## Architecture
- src/workflow.ts — workflow engine and step execution
- src/types.ts — type definitions (steps, compensations, conditions)
- src/errors.ts — package-specific errors
- src/index.ts — public API

## Conventions
- Workflows are defined declaratively as step sequences
- Each step can define a compensation action for saga-style rollback
- Parallel steps run concurrently — ensure they are independent
- Conditions and loops are expressed as step types, not control flow
