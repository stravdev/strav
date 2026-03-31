import { StravError } from './strav_error.ts'

/**
 * Thrown when a framework service is used before being configured
 * or when an unknown driver/store/transport is requested.
 *
 * @example
 * throw new ConfigurationError('CacheManager not configured. Resolve it through the container first.')
 */
export class ConfigurationError extends StravError {}

/**
 * Thrown by `findOrFail` / `firstOrFail` when a model record is not found.
 * The ExceptionHandler renders this as a 404.
 *
 * @example
 * throw new ModelNotFoundError('User', id)
 */
export class ModelNotFoundError extends StravError {
  constructor(
    public readonly model: string,
    public readonly id?: unknown
  ) {
    super(id !== undefined ? `${model} with ID ${id} not found` : `${model} not found`)
  }
}

/**
 * Thrown on database operation failures (migrations, queries).
 *
 * @example
 * throw new DatabaseError(`Migration ${version} failed: ${cause}`)
 */
export class DatabaseError extends StravError {}

/**
 * Thrown on encryption/decryption/signing failures.
 *
 * @example
 * throw new EncryptionError('Decryption failed: invalid payload or key.')
 */
export class EncryptionError extends StravError {}

/**
 * Thrown on view template compilation or rendering failures.
 *
 * @example
 * throw new TemplateError(`Unclosed expression at line ${line}`)
 */
export class TemplateError extends StravError {}

/**
 * Thrown when an external service (AI provider, mail transport, webhook) returns an error.
 * The ExceptionHandler renders this as a 502.
 *
 * @example
 * throw new ExternalServiceError('Anthropic', 429, 'Rate limited')
 */
export class ExternalServiceError extends StravError {
  constructor(
    public readonly service: string,
    public readonly statusCode?: number,
    public readonly responseBody?: string
  ) {
    super(
      statusCode
        ? `${service} error (${statusCode}): ${responseBody ?? 'unknown'}`
        : `${service} error: ${responseBody ?? 'unknown'}`
    )
  }
}
