# @stravigor/flag

Feature flags for the [Strav](https://www.npmjs.com/package/@stravigor/core) framework. Define, scope, and toggle features with database persistence, in-memory drivers, and per-user/team targeting.

## Install

```bash
bun add @stravigor/flag
bun strav install flag
```

Requires `@stravigor/core` as a peer dependency.

## Setup

```ts
import { FlagProvider } from '@stravigor/flag'

app.use(new FlagProvider())
```

## Usage

```ts
import { flag } from '@stravigor/flag'

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
import { ensureFeature } from '@stravigor/flag'

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
