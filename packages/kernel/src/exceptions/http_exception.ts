import { StravError } from './strav_error.ts'

const STATUS_MESSAGES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthenticated',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Validation Failed',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
}

/**
 * HTTP-aware exception. Throw from handlers or middleware to produce
 * an error response with the given status code.
 *
 * @example
 * throw new HttpException(403, 'You cannot access this resource')
 */
export class HttpException extends StravError {
  constructor(
    public readonly status: number,
    message?: string,
    public readonly body?: unknown
  ) {
    super(message ?? STATUS_MESSAGES[status] ?? `HTTP Error ${status}`)
  }
}

/**
 * 400 Bad Request.
 *
 * @example
 * throw new BadRequestError('Malformed JSON in request body')
 */
export class BadRequestError extends HttpException {
  constructor(message?: string) {
    super(400, message)
  }
}

/**
 * 401 Unauthenticated.
 *
 * @example
 * throw new AuthenticationError()
 * throw new AuthenticationError('Token expired')
 */
export class AuthenticationError extends HttpException {
  constructor(message?: string) {
    super(401, message)
  }
}

/**
 * 403 Forbidden.
 *
 * @example
 * throw new AuthorizationError('You do not own this resource')
 */
export class AuthorizationError extends HttpException {
  constructor(message?: string) {
    super(403, message)
  }
}

/**
 * 404 Not Found.
 *
 * @example
 * throw new NotFoundError('Project not found')
 */
export class NotFoundError extends HttpException {
  constructor(message?: string) {
    super(404, message)
  }
}

/**
 * 409 Conflict.
 *
 * @example
 * throw new ConflictError('A project with this slug already exists')
 */
export class ConflictError extends HttpException {
  constructor(message?: string) {
    super(409, message)
  }
}

/**
 * 422 Validation Failed — carries structured field errors.
 *
 * @example
 * throw new ValidationError({ email: ['Required'], name: ['Too short'] })
 */
export class ValidationError extends HttpException {
  constructor(
    public readonly errors: Record<string, string[]>,
    message?: string
  ) {
    super(422, message ?? 'Validation Failed', errors)
  }
}

/**
 * 429 Too Many Requests — optionally carries a retry-after value.
 *
 * @example
 * throw new RateLimitError(60)  // retry after 60 seconds
 */
export class RateLimitError extends HttpException {
  constructor(
    public readonly retryAfter?: number,
    message?: string
  ) {
    super(429, message)
  }
}

/**
 * 500 Internal Server Error.
 *
 * @example
 * throw new ServerError('Unexpected state in payment processor')
 */
export class ServerError extends HttpException {
  constructor(message?: string) {
    super(500, message)
  }
}
