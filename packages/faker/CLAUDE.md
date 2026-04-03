# @strav/faker

Simple and powerful fake data generator for testing in the Strav framework. Provides essential data generation with reproducible seeding support.

## Dependencies
- @strav/kernel (peer)

## Commands
- bun test
- bun run typecheck

## Architecture
- src/faker.ts — main Faker class with seeding support
- src/seed.ts — seeding and reproducibility manager
- src/generators/ — core data generators (string, number, boolean, date, array)
- src/modules/ — domain-specific modules (person, internet, lorem, company, commerce, location)
- src/data/ — static data for generation (names, words, domains)
- src/types.ts — type definitions
- src/index.ts — public API barrel exports

## Conventions
- Each module exposes simple, chainable methods
- All generators support seeding for reproducible tests
- Minimal external dependencies - only uses @strav/kernel
- Static data is lazy-loaded for performance

## Usage
```typescript
import { faker } from '@strav/faker'

// Generate data
faker.string.uuid()
faker.person.fullName()
faker.internet.email()

// Seed for reproducible tests
faker.seed(123)
```