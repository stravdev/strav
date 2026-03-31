# @strav/devtools

Debug inspector and performance monitor for the [Strav](https://www.npmjs.com/package/@strav/core) framework. Request inspector, SQL query profiler, exception tracker, log viewer, and APM dashboard.

## Install

```bash
bun add -d @strav/devtools
bun strav install devtools
```

Requires `@strav/core` as a peer dependency.

## Setup

```ts
import { DevtoolsProvider } from '@strav/devtools'

app.use(new DevtoolsProvider())
```

The provider auto-registers the middleware and serves the dashboard at `/_devtools`.

## Collectors

Collectors capture data from your application:

- **RequestCollector** — HTTP requests and responses
- **QueryCollector** — SQL queries with timing
- **ExceptionCollector** — Unhandled exceptions
- **LogCollector** — Log entries
- **JobCollector** — Queue job execution

## Recorders

Recorders aggregate data for performance monitoring:

- **SlowRequestsRecorder** — Tracks slow HTTP requests
- **SlowQueriesRecorder** — Tracks slow SQL queries

## Usage

```ts
import { devtools } from '@strav/devtools'

// Access collector data programmatically
const entries = await devtools.entries({ type: 'request', limit: 50 })
const aggregates = await devtools.aggregates('slow-requests', '1h')
```

## CLI

```bash
bun strav devtools:setup    # Create the devtools tables
bun strav devtools:prune    # Clean up old entries
```

## Documentation

See the full [Devtools guide](../../guides/devtools.md).

## License

MIT
