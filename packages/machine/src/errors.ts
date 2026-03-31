import { StravError } from '@stravigor/kernel'

/** Thrown when a transition is not valid from the entity's current state. */
export class TransitionError extends StravError {
  constructor(
    public readonly transition: string,
    public readonly currentState: string,
    public readonly allowedFrom?: string[]
  ) {
    super(
      allowedFrom
        ? `Cannot apply transition "${transition}" from state "${currentState}". ` +
            `Allowed from: [${allowedFrom.join(', ')}]`
        : `Transition "${transition}" is not defined.`
    )
  }
}

/** Thrown when a transition's guard rejects the transition. */
export class GuardError extends StravError {
  constructor(
    public readonly transition: string,
    public readonly currentState: string
  ) {
    super(`Guard rejected transition "${transition}" from state "${currentState}".`)
  }
}
