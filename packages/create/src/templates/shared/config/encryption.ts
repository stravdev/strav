import { env } from '@stravigor/kernel/helpers/env'

export default {
  key: env('APP_KEY'),
  previousKeys: [],
}
