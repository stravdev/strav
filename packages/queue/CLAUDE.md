# @strav/queue

Background job processing and task scheduling for the Strav framework.

## Dependencies
- @strav/kernel (peer)
- @strav/database (peer)

## Consumed by
- @strav/signal (for queued mail/notifications)

## Commands
- bun test
- bun run typecheck

## Architecture
- src/queue/ — Queue manager, worker, job dispatching
- src/scheduler/ — Task scheduler with cron expressions
- src/providers/ — QueueProvider

## Conventions
- Jobs are stored in the database via @strav/database
- Scheduler runs standalone or via CLI (`strav scheduler:work`)
