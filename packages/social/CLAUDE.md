# @strav/social

OAuth 2.0 social authentication with a fluent, driver-based API. Built-in providers: Google, GitHub, Discord, Facebook, LinkedIn. Custom providers can be added via extend().

## Dependencies
- @strav/kernel (peer)
- @strav/http (peer)
- @strav/database (peer)

## Commands
- bun test
- bun run build

## Architecture
- src/social_manager.ts — main manager class
- src/social_provider.ts — service provider registration
- src/abstract_provider.ts — base class for social providers
- src/providers/ — provider implementations (Google, GitHub, Discord, Facebook, LinkedIn)
- src/social_account.ts — normalized social account data
- src/schema.ts — validation schemas
- src/types.ts — type definitions

## Conventions
- Social providers extend abstract_provider.ts
- Custom providers are added via extend() on the manager
- Social account data is normalized into a common shape regardless of provider
