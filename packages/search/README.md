# @strav/search

Full-text search for the [Strav](https://www.npmjs.com/package/@strav/core) framework. Unified API for Meilisearch, Typesense, and Algolia with automatic indexing via model events.

## Install

```bash
bun add @strav/search
bun strav install search
```

Requires `@strav/core` as a peer dependency.

## Setup

```ts
import { SearchProvider } from '@strav/search'

app.use(new SearchProvider())
```

## Searchable Models

```ts
import { searchable } from '@strav/search'

class Post extends searchable(BaseModel) {
  static searchableAs = 'posts'

  toSearchableDocument() {
    return { id: this.id, title: this.title, body: this.body }
  }
}
```

## Usage

```ts
import { search } from '@strav/search'

// Search
const results = await search.query('posts', 'hello world', {
  filters: 'status = published',
  limit: 20,
})

// Manual indexing
await search.index('posts', [{ id: 1, title: 'Hello' }])
await search.delete('posts', ['1'])
```

## Drivers

- **Meilisearch** — fast, typo-tolerant, self-hosted
- **Typesense** — open-source, instant search
- **Algolia** — hosted search-as-a-service
- **Null** — no-op driver for testing

## CLI

```bash
bun strav search:import    # Import all searchable models
bun strav search:flush     # Flush all indexes
```

## Documentation

See the full [Search guide](../../guides/search.md).

## License

MIT
