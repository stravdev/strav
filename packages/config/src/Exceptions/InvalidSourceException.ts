import { Exception, type ExceptionOptions } from '@strav/kernel'

/**
 * Thrown when source is invalid or inaccessible.
 */
export class InvalidSourceException extends Exception {
  constructor(
    message: string,
    public readonly sourceType?: string,
    options: ExceptionOptions = {}
  ) {
    super(message, options)
    this.name = 'InvalidSourceException'
  }
}
