import { env } from '@strav/kernel/helpers/env'

export default {
  key: env('APP_KEY'),
  previousKeys: [],
}
