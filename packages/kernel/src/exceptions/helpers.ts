import { HttpException, ValidationError } from './http_exception.ts'

/**
 * Throw an HTTP exception. Caught by the ExceptionHandler and rendered
 * as a JSON error response.
 *
 * @example
 * import { abort } from '@stravigor/kernel/exceptions'
 *
 * const project = await Project.find(id)
 * if (!project) abort(404, 'Project not found')
 *
 * abort(403, 'You cannot access this resource')
 *
 * // Validation errors with structured field data
 * abort(422, { email: ['Required'], name: ['Too short'] })
 */
export function abort(status: 422, errors: Record<string, string[]>): never
export function abort(status: number, message?: string): never
export function abort(status: number, messageOrErrors?: string | Record<string, string[]>): never {
  if (status === 422 && typeof messageOrErrors === 'object') {
    throw new ValidationError(messageOrErrors)
  }
  throw new HttpException(status, typeof messageOrErrors === 'string' ? messageOrErrors : undefined)
}
