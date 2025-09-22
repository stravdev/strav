import { Exception, type ExceptionOptions } from '@strav/kernel'

/**
 * Thrown when no loader is available for a source format.
 */
export class UnsupportedFormatException extends Exception {
  constructor(
    message: string,
    public readonly format?: string,
    options: ExceptionOptions = {}
  ) {
    super(message, options)
    this.name = 'UnsupportedFormatException'
  }
}
