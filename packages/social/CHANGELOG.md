# Changelog

## 0.1.1

### Added

- Facebook provider (Graph API v21.0)
- LinkedIn provider (OpenID Connect userinfo endpoint)

## 0.1.0

### Added

- Initial release with OAuth 2.0 social authentication
- Built-in providers: Google, GitHub, Discord
- `SocialManager` with driver-based architecture and custom provider extensibility
- Session-based CSRF state verification with `stateless()` opt-out
- `social` helper for fluent API access
- `AbstractProvider` base class for building custom providers
