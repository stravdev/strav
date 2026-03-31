import { StravError } from '@stravigor/kernel'

export class KhaldunError extends StravError {}

export class KhaldunConfigError extends KhaldunError {
  constructor(param: string, message: string) {
    super(`Khaldun config error for "${param}": ${message}`)
  }
}
