import { StravError } from '@stravigor/kernel'

export class MontaigneError extends StravError {}

export class MontaigneConfigError extends MontaigneError {
  constructor(param: string, message: string) {
    super(`Montaigne config error for "${param}": ${message}`)
  }
}
