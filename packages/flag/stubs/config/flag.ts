import { env } from '@stravigor/kernel'

export default {
  /** The default feature flag storage driver. */
  default: env('FLAG_DRIVER', 'database'),

  drivers: {
    database: {
      driver: 'database',
    },

    array: {
      driver: 'array',
    },
  },
}
