/**
 * Read an environment variable with an optional default.
 *
 * Bun auto-loads `.env`, so all variables are available via `process.env`.
 *
 * @example
 * env('DB_HOST', '127.0.0.1')
 * env('APP_KEY') // throws if not set and no default
 */
function env(key: string, defaultValue: string): string
function env(key: string, defaultValue: null): string | null
function env(key: string): string
function env(key: string, defaultValue?: string | null): string | null {
  const value = process.env[key]
  if (value !== undefined) return value
  if (defaultValue !== undefined) return defaultValue
  throw new Error(`Environment variable "${key}" is not set`)
}

/** Read an environment variable as an integer. */
env.int = (key: string, defaultValue?: number): number => {
  const raw = process.env[key]
  if (raw !== undefined) {
    const parsed = parseInt(raw, 10)
    if (!isNaN(parsed)) return parsed
  }
  if (defaultValue !== undefined) return defaultValue
  throw new Error(`Environment variable "${key}" is not set or not a valid integer`)
}

/** Read an environment variable as a float. */
env.float = (key: string, defaultValue?: number): number => {
  const raw = process.env[key]
  if (raw !== undefined) {
    const parsed = parseFloat(raw)
    if (!isNaN(parsed)) return parsed
  }
  if (defaultValue !== undefined) return defaultValue
  throw new Error(`Environment variable "${key}" is not set or not a valid number`)
}

/** Read an environment variable as a boolean. Truthy: `'true'`, `'1'`, `'yes'`. */
env.bool = (key: string, defaultValue?: boolean): boolean => {
  const raw = process.env[key]
  if (raw !== undefined) return ['true', '1', 'yes'].includes(raw.toLowerCase())
  if (defaultValue !== undefined) return defaultValue
  throw new Error(`Environment variable "${key}" is not set`)
}

export { env }
