import { Exception, type ExceptionOptions } from '@strav/kernel'

/**
 * Thrown when a configuration source operation fails.
 */
export class ConfigSourceException extends Exception {
  constructor(
    message: string,
    public readonly operation?: string,
    public readonly sourceType?: string,
    options: ExceptionOptions = {}
  ) {
    super(message, options)
    this.name = 'ConfigSourceException'
  }
}