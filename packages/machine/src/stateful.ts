import type { BaseModel } from '@stravigor/database'
import type { NormalizeConstructor } from '@stravigor/kernel'
import type { Machine, TransitionMeta } from './types.ts'

/**
 * Mixin that adds state machine methods to a BaseModel subclass.
 *
 * @example
 * import { BaseModel } from '@stravigor/database'
 * import { defineMachine, stateful } from '@stravigor/machine'
 *
 * const orderMachine = defineMachine({
 *   field: 'status',
 *   initial: 'pending',
 *   states: ['pending', 'processing', 'shipped'],
 *   transitions: {
 *     process: { from: 'pending', to: 'processing' },
 *     ship:    { from: 'processing', to: 'shipped' },
 *   },
 * })
 *
 * class Order extends stateful(BaseModel, orderMachine) {
 *   declare id: number
 *   declare status: string
 * }
 *
 * const order = await Order.find(1)
 * order.is('pending')            // true
 * order.can('process')           // true
 * await order.transition('process')  // validates, mutates, saves, emits
 *
 * // Composable with other mixins:
 * import { compose } from '@stravigor/kernel'
 * class Order extends compose(BaseModel, searchable, m => stateful(m, orderMachine)) { }
 */
export function stateful<T extends NormalizeConstructor<typeof BaseModel>>(
  Base: T,
  machine: Machine
) {
  return class Stateful extends Base {
    /** Check if this model instance is in the given state. */
    is(state: string): boolean {
      return machine.is(this, state)
    }

    /** Check if a transition can be applied to this model instance. */
    can(transition: string): boolean | Promise<boolean> {
      return machine.can(this, transition)
    }

    /** List all transitions available from this model's current state. */
    availableTransitions(): string[] {
      return machine.availableTransitions(this)
    }

    /**
     * Apply a transition: validate, mutate, save, and emit event.
     * Throws `TransitionError` if the transition is invalid from the current state.
     * Throws `GuardError` if the guard rejects the transition.
     */
    async transition(name: string): Promise<TransitionMeta> {
      const meta = await machine.apply(this, name)
      await this.save()
      return meta
    }

    /** Query scope: filter records in the given state(s). */
    static inState(state: string | string[]) {
      const states = Array.isArray(state) ? state : [state]
      return (this as any).query().whereIn(machine.definition.field, states)
    }
  }
}
