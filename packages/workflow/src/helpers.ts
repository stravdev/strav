import { Workflow } from './workflow.ts'

/** Create a new workflow instance. */
export function workflow(name: string): Workflow {
  return new Workflow(name)
}
