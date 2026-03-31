# @strav/flag

Feature flags for the [Strav](https://www.npmjs.com/package/@strav/core) framework. Define, scope, and toggle features with database persistence, in-memory drivers, and per-user/team targeting.

## Install

```bash
bun add @strav/flag
bun strav install flag
```

Requires `@strav/core` as a peer dependency.

## Setup

```ts
import { FlagProvider } from '@strav/flag'

app.use(new FlagProvider())
```

## Usage

```ts
import { flag } from '@strav/flag'

// Check if a feature is active
if (await flag.active('dark-mode')) {
  // feature is enabled
}

// Scoped to a user or team
if (await flag.for(user).active('beta-dashboard')) {
  // enabled for this user
}

// Rich values
const limit = await flag.value('upload-limit', 10)
```

## Middleware

```ts
import { ensureFeature } from '@strav/flag'

router.get('/beta', ensureFeature('beta-dashboard'), betaHandler)
```

## Drivers

- **Database** — persistent feature flags in `_strav_features`
- **Array** — in-memory driver for testing

## CLI

```bash
bun strav flag:setup    # Create the features table
```

## Documentation

See the full [Flag guide](../../guides/flag.md).

## License

MIT
