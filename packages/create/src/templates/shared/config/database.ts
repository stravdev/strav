import { env } from '@strav/kernel/helpers/env'

export default {
  host: env('DB_HOST', '127.0.0.1'),
  port: env.int('DB_PORT', 5432),
  username: env('DB_USERNAME', 'postgres'),
  password: env('DB_PASSWORD', ''),
  database: env('DB_DATABASE', '__DB_NAME__'),
  pool: env.int('DB_POOL_MAX', 10),
  idleTimeout: env.int('DB_IDLE_TIMEOUT', 20),
}
