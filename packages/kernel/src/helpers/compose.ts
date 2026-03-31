/**
 * Normalizes a constructor to satisfy TypeScript's mixin constraint.
 *
 * TypeScript requires mixin base classes to have a `new (...args: any[]) => any`
 * constructor. This type widens any class constructor while preserving its
 * instance type and static members.
 *
 * @see https://github.com/microsoft/TypeScript/issues/37142
 *
 * @example
 * function myMixin<T extends NormalizeConstructor<typeof BaseModel>>(superclass: T) {
 *   return class extends superclass {
 *     greet() { return 'hello' }
 *   }
 * }
 */
export type NormalizeConstructor<T extends new (...args: any[]) => any> = {
  new (...args: any[]): InstanceType<T>
} & Omit<T, 'constructor'>

interface MixinFunction<In, Out> {
  (superclass: In): Out
}

/**
 * Compose a class by applying mixins left-to-right.
 *
 * Eliminates deeply nested mixin syntax and provides full type safety
 * for up to 8 mixins.
 *
 * @example
 * import { compose } from '@stravigor/kernel/helpers'
 * import { BaseModel } from '@stravigor/database/orm'
 * import { billable } from '@stravigor/stripe'
 *
 * // Without compose (nested):
 * class User extends billable(softDeletes(BaseModel)) { }
 *
 * // With compose (flat):
 * class User extends compose(BaseModel, softDeletes, billable) { }
 */
export function compose<T extends new (...args: any[]) => any, A>(
  superclass: T,
  mixinA: MixinFunction<T, A>
): A
export function compose<T extends new (...args: any[]) => any, A, B>(
  superclass: T,
  mixinA: MixinFunction<T, A>,
  mixinB: MixinFunction<A, B>
): B
export function compose<T extends new (...args: any[]) => any, A, B, C>(
  superclass: T,
  mixinA: MixinFunction<T, A>,
  mixinB: MixinFunction<A, B>,
  mixinC: MixinFunction<B, C>
): C
export function compose<T extends new (...args: any[]) => any, A, B, C, D>(
  superclass: T,
  mixinA: MixinFunction<T, A>,
  mixinB: MixinFunction<A, B>,
  mixinC: MixinFunction<B, C>,
  mixinD: MixinFunction<C, D>
): D
export function compose<T extends new (...args: any[]) => any, A, B, C, D, E>(
  superclass: T,
  mixinA: MixinFunction<T, A>,
  mixinB: MixinFunction<A, B>,
  mixinC: MixinFunction<B, C>,
  mixinD: MixinFunction<C, D>,
  mixinE: MixinFunction<D, E>
): E
export function compose<T extends new (...args: any[]) => any, A, B, C, D, E, F>(
  superclass: T,
  mixinA: MixinFunction<T, A>,
  mixinB: MixinFunction<A, B>,
  mixinC: MixinFunction<B, C>,
  mixinD: MixinFunction<C, D>,
  mixinE: MixinFunction<D, E>,
  mixinF: MixinFunction<E, F>
): F
export function compose<T extends new (...args: any[]) => any, A, B, C, D, E, F, G>(
  superclass: T,
  mixinA: MixinFunction<T, A>,
  mixinB: MixinFunction<A, B>,
  mixinC: MixinFunction<B, C>,
  mixinD: MixinFunction<C, D>,
  mixinE: MixinFunction<D, E>,
  mixinF: MixinFunction<E, F>,
  mixinG: MixinFunction<F, G>
): G
export function compose<T extends new (...args: any[]) => any, A, B, C, D, E, F, G, H>(
  superclass: T,
  mixinA: MixinFunction<T, A>,
  mixinB: MixinFunction<A, B>,
  mixinC: MixinFunction<B, C>,
  mixinD: MixinFunction<C, D>,
  mixinE: MixinFunction<D, E>,
  mixinF: MixinFunction<E, F>,
  mixinG: MixinFunction<F, G>,
  mixinH: MixinFunction<G, H>
): H
export function compose(superclass: any, ...mixins: Function[]) {
  return mixins.reduce((c, mixin) => mixin(c), superclass)
}
