import { env } from '@strav/kernel/helpers/env'

export default {
  env: env('APP_ENV', 'local'),
  debug: env.bool('APP_DEBUG', true),
  key: env('APP_KEY'),
}
