// ── Machine Definition ──────────────────────────────────────────────────────

export interface TransitionDefinition<TState extends string = string> {
  from: TState | TState[]
  to: TState
}

export interface MachineDefinition<
  TState extends string = string,
  TTransition extends string = string,
> {
  /** The field on the entity that holds the state value. */
  field: string
  /** The initial state for new entities. */
  initial: TState
  /** All valid states. */
  states: TState[]
  /** Named transitions with from/to state definitions. */
  transitions: Record<TTransition, TransitionDefinition<TState>>
  /** Guard functions that must return true for a transition to proceed. */
  guards?: Partial<Record<TTransition, (entity: any) => boolean | Promise<boolean>>>
  /** Side effects to run after a transition (before persistence). */
  effects?: Partial<
    Record<
      TTransition,
      (entity: any, meta: TransitionMeta<TState, TTransition>) => void | Promise<void>
    >
  >
  /** Event names to emit via Emitter after a transition completes. */
  events?: Partial<Record<TTransition, string>>
}

// ── Transition Meta ─────────────────────────────────────────────────────────

export interface TransitionMeta<
  TState extends string = string,
  TTransition extends string = string,
> {
  from: TState
  to: TState
  transition: TTransition
}

// ── Machine Interface ───────────────────────────────────────────────────────

export interface Machine<TState extends string = string, TTransition extends string = string> {
  /** The machine definition. */
  readonly definition: MachineDefinition<TState, TTransition>

  /** Get the current state of an entity. */
  state(entity: any): TState

  /** Check if an entity is in a specific state. */
  is(entity: any, state: TState): boolean

  /** Check if a transition can be applied (valid from-state + guard passes). */
  can(entity: any, transition: TTransition): boolean | Promise<boolean>

  /** List all transitions available from the entity's current state. */
  availableTransitions(entity: any): TTransition[]

  /**
   * Apply a transition to an entity.
   * Validates the from-state, runs the guard, mutates the field, runs the effect, and emits the event.
   * Does NOT persist — caller is responsible for saving.
   */
  apply(entity: any, transition: TTransition): Promise<TransitionMeta<TState, TTransition>>
}
