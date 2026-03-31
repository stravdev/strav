import type {
  WorkflowContext,
  WorkflowResult,
  WorkflowStep,
  StepHandler,
  StepOptions,
  ParallelEntry,
  RouteResolver,
  LoopHandler,
  LoopOptions,
  SequentialStep,
  ParallelStep,
  RouteStep,
  LoopStep,
} from './types.ts'
import { CompensationError } from './errors.ts'

/**
 * General-purpose workflow orchestrator.
 *
 * Supports sequential steps, parallel fan-out, conditional routing, and loops.
 * Each step is an arbitrary async function that receives and extends a shared context.
 * Steps can optionally define compensation functions for saga-style rollback.
 *
 * @example
 * const result = await new Workflow('order-process')
 *   .step('validate', async (ctx) => validateOrder(ctx.input.orderId))
 *   .step('charge', async (ctx) => chargeCard(ctx.results.validate.total), {
 *     compensate: async (ctx) => refundCharge(ctx.results.charge.id),
 *   })
 *   .parallel('notify', [
 *     { name: 'email', handler: async (ctx) => sendEmail(ctx) },
 *     { name: 'slack', handler: async (ctx) => notifySlack(ctx) },
 *   ])
 *   .run({ orderId: 123 })
 */
export class Workflow {
  private steps: WorkflowStep[] = []

  constructor(private name: string) {}

  /**
   * Add a sequential step. Runs after all previous steps complete.
   * The handler receives the workflow context and its return value is stored in `ctx.results[name]`.
   */
  step(name: string, handler: StepHandler, options?: StepOptions): this {
    this.steps.push({
      type: 'step',
      name,
      handler,
      compensate: options?.compensate,
    })
    return this
  }

  /**
   * Run multiple handlers in parallel. Each handler's result is stored under its name.
   */
  parallel(name: string, entries: ParallelEntry[]): this {
    this.steps.push({ type: 'parallel', name, entries })
    return this
  }

  /**
   * Route to a branch based on a resolver function's return value.
   * The resolver returns a string key that maps to one of the branches.
   * If no branch matches, the step completes silently with no result.
   */
  route(name: string, resolver: RouteResolver, branches: Record<string, StepHandler>): this {
    this.steps.push({ type: 'route', name, resolver, branches })
    return this
  }

  /**
   * Run a handler in a loop until a condition is met or max iterations reached.
   * Use `feedback` to transform the result into the next iteration's input.
   * Use `mapInput` to derive the initial input from context.
   */
  loop(name: string, handler: LoopHandler, options: LoopOptions): this {
    this.steps.push({
      type: 'loop',
      name,
      handler,
      maxIterations: options.maxIterations,
      until: options.until,
      feedback: options.feedback,
      mapInput: options.mapInput,
    })
    return this
  }

  /** Execute the workflow. */
  async run(input: Record<string, unknown>): Promise<WorkflowResult> {
    const start = performance.now()
    const ctx: WorkflowContext = { input, results: {} }
    const completed: WorkflowStep[] = []

    try {
      for (const step of this.steps) {
        switch (step.type) {
          case 'step':
            await this.runStep(step, ctx)
            break
          case 'parallel':
            await this.runParallel(step, ctx)
            break
          case 'route':
            await this.runRoute(step, ctx)
            break
          case 'loop':
            await this.runLoop(step, ctx)
            break
        }
        completed.push(step)
      }
    } catch (error) {
      await this.compensate(completed, ctx, error as Error)
      throw error
    }

    return { results: ctx.results, duration: performance.now() - start }
  }

  // ── Step Executors ─────────────────────────────────────────────────────────

  private async runStep(step: SequentialStep, ctx: WorkflowContext): Promise<void> {
    const result = await step.handler(ctx)
    ctx.results[step.name] = result
  }

  private async runParallel(step: ParallelStep, ctx: WorkflowContext): Promise<void> {
    const promises = step.entries.map(async entry => {
      const result = await entry.handler(ctx)
      ctx.results[entry.name] = result
    })
    await Promise.all(promises)
  }

  private async runRoute(step: RouteStep, ctx: WorkflowContext): Promise<void> {
    const routeKey = await step.resolver(ctx)
    const branchHandler = step.branches[routeKey]

    if (branchHandler) {
      const result = await branchHandler(ctx)
      ctx.results[step.name] = result
    }
  }

  private async runLoop(step: LoopStep, ctx: WorkflowContext): Promise<void> {
    let currentInput: unknown = step.mapInput ? step.mapInput(ctx) : ctx.input
    let lastResult: unknown
    let ran = false

    for (let i = 0; i < step.maxIterations; i++) {
      ran = true
      lastResult = await step.handler(currentInput, ctx)

      if (step.until?.(lastResult, i + 1)) break

      if (step.feedback) {
        currentInput = step.feedback(lastResult)
      }
    }

    if (ran) {
      ctx.results[step.name] = lastResult
    }
  }

  // ── Compensation ───────────────────────────────────────────────────────────

  private async compensate(
    completed: WorkflowStep[],
    ctx: WorkflowContext,
    originalError: Error
  ): Promise<void> {
    const compensationErrors: { step: string; error: Error }[] = []

    // Run compensation in reverse order
    for (let i = completed.length - 1; i >= 0; i--) {
      const step = completed[i]!
      const compensators = this.getCompensators(step)

      for (const { name, compensate } of compensators) {
        try {
          await compensate(ctx)
        } catch (err) {
          compensationErrors.push({ step: name, error: err as Error })
        }
      }
    }

    if (compensationErrors.length > 0) {
      throw new CompensationError(originalError, compensationErrors)
    }
  }

  private getCompensators(
    step: WorkflowStep
  ): { name: string; compensate: (ctx: WorkflowContext) => Promise<void> }[] {
    switch (step.type) {
      case 'step':
        return step.compensate ? [{ name: step.name, compensate: step.compensate }] : []
      case 'parallel':
        return step.entries
          .filter(e => e.compensate)
          .map(e => ({ name: e.name, compensate: e.compensate! }))
      default:
        return []
    }
  }
}
