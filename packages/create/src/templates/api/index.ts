import 'reflect-metadata'
import { app } from '@stravigor/kernel/core'
import { router } from '@stravigor/http/http'
import { ConfigProvider, EncryptionProvider } from '@stravigor/kernel/providers'
import { DatabaseProvider } from '@stravigor/database/providers'
import BaseModel from '@stravigor/database/orm/base_model'
import Database from '@stravigor/database/database/database'
import Server from '@stravigor/http/http/server'
import { ExceptionHandler } from '@stravigor/kernel/exceptions'

// Register service providers
app.use(new ConfigProvider()).use(new DatabaseProvider()).use(new EncryptionProvider())

// Boot services (loads config, connects database, derives encryption keys)
await app.start()

// Initialize ORM
new BaseModel(app.resolve(Database))

// Configure router
router.useExceptionHandler(new ExceptionHandler(true))
router.cors()

// Load routes
await import('./start/routes')

// Start HTTP server
app.singleton(Server)
const server = app.resolve(Server)
server.start(router)
