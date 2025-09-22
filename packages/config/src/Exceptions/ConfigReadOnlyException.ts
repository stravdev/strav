import { Exception, type ExceptionOptions } from '@strav/kernel'

/**
 * Thrown when configuration is frozen and modification is attempted.
 */
export class ConfigReadOnlyException extends Exception {
  constructor(
    message: string = 'Configuration is read-only and cannot be modified.',
    options: ExceptionOptions = {}
  ) {
    super(message, options)
    this.name = 'ConfigReadOnlyException'
  }
}
