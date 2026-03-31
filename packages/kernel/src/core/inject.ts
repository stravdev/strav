import 'reflect-metadata'

/** Symbol used to mark a class as injectable. */
export const INJECTABLE = Symbol('inject:injectable')

/**
 * Class decorator that marks a class as injectable.
 *
 * With `emitDecoratorMetadata` enabled, TypeScript automatically emits
 * constructor parameter type metadata (`design:paramtypes`). The container
 * reads this metadata to auto-resolve dependencies by class reference.
 *
 * Works as both `@inject` and `@inject()`.
 *
 * @example
 * @inject
 * class UserService {
 *   constructor(protected db: Database, protected logger: Logger) {}
 * }
 *
 * container.singleton(Database)
 * container.singleton(Logger)
 * container.singleton(UserService)
 * container.resolve(UserService) // db and logger auto-injected by type
 */
export function inject<T extends Function>(target: T): void
export function inject(): <T extends Function>(target: T) => void
export function inject(target?: any) {
  const mark = (cls: any) => {
    Object.defineProperty(cls, INJECTABLE, { value: true, enumerable: false })
  }
  if (typeof target === 'function') {
    mark(target)
    return
  }
  return (cls: any) => {
    mark(cls)
  }
}
