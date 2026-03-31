// ── Workflow Context ─────────────────────────────────────────────────────────

export interface WorkflowContext {
  input: Record<string, unknown>
  results: Record<string, unknown>
}

// ── Workflow Result ─────────────────────────────────────────────────────────

export interface WorkflowResult {
  results: Record<string, unknown>
  duration: number
}

// ── Handlers ────────────────────────────────────────────────────────────────

/** Handler for sequential, parallel, and route steps. Receives full context. */
export type StepHandler = (ctx: WorkflowContext) => Promise<unknown>

/** Handler for loop steps. Receives current iteration input + full context. */
export type LoopHandler = (input: unknown, ctx: WorkflowContext) => Promise<unknown>

/** Route resolver. Returns the branch key to dispatch to. */
export type RouteResolver = (ctx: WorkflowContext) => string | Promise<string>

// ── Step Options ────────────────────────────────────────────────────────────

export interface StepOptions {
  compensate?: (ctx: WorkflowContext) => Promise<void>
}

export interface ParallelEntry {
  name: string
  handler: StepHandler
  compensate?: (ctx: WorkflowContext) => Promise<void>
}

export interface LoopOptions<T = unknown> {
  maxIterations: number
  until?: (result: T, iteration: number) => boolean
  feedback?: (result: T) => unknown
  mapInput?: (ctx: WorkflowContext) => unknown
}

// ── Internal Step Definitions ───────────────────────────────────────────────

export interface SequentialStep {
  type: 'step'
  name: string
  handler: StepHandler
  compensate?: (ctx: WorkflowContext) => Promise<void>
}

export interface ParallelStep {
  type: 'parallel'
  name: string
  entries: ParallelEntry[]
}

export interface RouteStep {
  type: 'route'
  name: string
  resolver: RouteResolver
  branches: Record<string, StepHandler>
}

export interface LoopStep {
  type: 'loop'
  name: string
  handler: LoopHandler
  maxIterations: number
  until?: (result: unknown, iteration: number) => boolean
  feedback?: (result: unknown) => unknown
  mapInput?: (ctx: WorkflowContext) => unknown
}

export type WorkflowStep = SequentialStep | ParallelStep | RouteStep | LoopStep
