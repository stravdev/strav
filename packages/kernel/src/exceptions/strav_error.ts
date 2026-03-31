/**
 * Base error class for all Strav framework errors.
 *
 * Enables `instanceof StravError` to catch any framework error.
 */
export class StravError extends Error {
  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
  }
}
