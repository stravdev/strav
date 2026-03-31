import { StravError } from '@stravigor/kernel'

export class FlagError extends StravError {}

export class FeatureNotDefinedError extends FlagError {
  constructor(feature: string) {
    super(`Feature "${feature}" is not defined. Register it with flag.define().`)
  }
}
