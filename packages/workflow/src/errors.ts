import { StravError } from '@stravigor/kernel'

/** Thrown when a workflow step fails during execution. */
export class WorkflowError extends StravError {
  constructor(
    public readonly step: string,
    public override readonly cause: Error
  ) {
    super(`Workflow step "${step}" failed: ${cause.message}`)
  }
}

/** Thrown when compensation fails. Contains the original step error and all compensation errors. */
export class CompensationError extends StravError {
  constructor(
    public readonly originalError: Error,
    public readonly compensationErrors: { step: string; error: Error }[]
  ) {
    const failures = compensationErrors.map(e => `${e.step}: ${e.error.message}`).join(', ')
    super(
      `Compensation failed for ${compensationErrors.length} step(s) [${failures}]. ` +
        `Original error: ${originalError.message}`
    )
  }
}
