import { Exception, type ExceptionOptions } from '@strav/kernel'

/**
 * Thrown when service provider configuration is invalid.
 */
export class ConfigServiceProviderException extends Exception {
  constructor(message: string, options: ExceptionOptions = {}) {
    super(message, options)
    this.name = 'ConfigServiceProviderException'
  }
}
