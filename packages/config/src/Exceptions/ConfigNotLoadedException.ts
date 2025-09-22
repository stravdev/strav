import { Exception, type ExceptionOptions } from '@strav/kernel'

/**
 * Thrown when trying to access configuration before loading.
 */
export class ConfigNotLoadedException extends Exception {
  constructor(
    message: string = 'Configuration not loaded. Call load() first.',
    public readonly source?: string,
    options: ExceptionOptions = {}
  ) {
    super(message, options)
    this.name = 'ConfigNotLoadedException'
  }
}
