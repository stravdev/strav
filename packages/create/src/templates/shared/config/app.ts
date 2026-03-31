import { env } from '@stravigor/kernel/helpers/env'

export default {
  env: env('APP_ENV', 'local'),
  debug: env.bool('APP_DEBUG', true),
  key: env('APP_KEY'),
}
