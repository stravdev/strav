import 'reflect-metadata'
import { app } from '@strav/kernel/core'
import { router } from '@strav/http/http'
import { ConfigProvider, EncryptionProvider } from '@strav/kernel/providers'
import { DatabaseProvider } from '@strav/database/providers'
import { SessionProvider } from '@strav/http/providers'
import { ViewProvider } from '@strav/view'
import BaseModel from '@strav/database/orm/base_model'
import Database from '@strav/database/database/database'
import Server from '@strav/http/http/server'
import { ExceptionHandler } from '@strav/kernel/exceptions'

// Register service providers
app
  .use(new ConfigProvider())
  .use(new DatabaseProvider())
  .use(new EncryptionProvider())
  .use(new SessionProvider())
  .use(new ViewProvider())

// Boot services (loads config, connects database, derives encryption keys, starts sessions)
await app.start()

// Initialize ORM
new BaseModel(app.resolve(Database))

// Configure router
router.useExceptionHandler(new ExceptionHandler(true))

// Load routes
await import('./start/routes')

// Start HTTP server
app.singleton(Server)
const server = app.resolve(Server)
server.start(router)
