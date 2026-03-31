import { env } from '@stravigor/kernel/helpers/env'

export default {
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 3000),
  domain: env('DOMAIN', 'localhost'),
}
