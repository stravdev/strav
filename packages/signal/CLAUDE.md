# @strav/signal

Communication layer for the Strav framework — mail, notifications, and real-time broadcasting.

## Dependencies
- @strav/kernel (peer)
- @strav/http (peer)
- @strav/database (peer)
- @strav/queue (peer)

## Commands
- bun test
- bun run typecheck

## Architecture
- src/mail/ — MailManager, transports (SMTP, Resend, SendGrid, Mailgun, Alibaba, Log)
- src/notification/ — NotificationManager, channels (email, database, webhook, Discord)
- src/broadcast/ — WebSocket broadcasting manager and client
- src/providers/ — MailProvider, NotificationProvider, BroadcastProvider

## Conventions
- Mail uses view engine from @strav/http for HTML templates
- Notifications can be queued via @strav/queue
- Broadcast depends on @strav/http's Router for WebSocket upgrade
