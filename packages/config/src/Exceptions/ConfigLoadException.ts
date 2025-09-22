import { Exception, type ExceptionOptions } from '@strav/kernel'

/**
 * Thrown when configuration loading fails.
 */
export class ConfigLoadException extends Exception {
  constructor(
    message: string,
    public readonly source?: string,
    options: ExceptionOptions = {}
  ) {
    super(message, options)
    this.name = 'ConfigLoadException'
  }
}
