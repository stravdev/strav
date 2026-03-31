import { env } from '@stravigor/kernel/helpers'

export default {
  /** Enable or disable devtools entirely. */
  enabled: env.bool('DEVTOOLS_ENABLED', true),

  storage: {
    /** Automatically prune entries older than this many hours. */
    pruneAfter: 24,
  },

  collectors: {
    request: { enabled: true, sizeLimit: 64 },
    query: { enabled: true, slow: 100 },
    exception: { enabled: true },
    log: { enabled: true, level: 'debug' },
    job: { enabled: true },
  },

  recorders: {
    slowRequests: { enabled: true, threshold: 1000, sampleRate: 1.0 },
    slowQueries: { enabled: true, threshold: 1000, sampleRate: 1.0 },
  },
}
