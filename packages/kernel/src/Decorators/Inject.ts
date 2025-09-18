import type { Constructor } from '../Types'
import { MetadataManager } from '../Utils/MetadataManager'

/**
 * Universal decorator that automatically detects dependencies for both classes and methods.
 *
 * **For Classes (Constructor Injection):**
 * - Automatically detects constructor parameters that are objects/classes and treats them as dependencies
 * - Non-object parameters must have default values and are ignored
 *
 * **For Methods (Method Injection):**
 * - Automatically detects method parameters that are objects/classes and treats them as dependencies
 * - Non-object parameters must have default values and are ignored
 *
 * @example
 * ```typescript
 * // Class-level usage
 * @Inject()
 * class UserService {
 *   constructor(
 *     private db: DatabaseService,     // Auto-detected dependency
 *     private logger: Logger,          // Auto-detected dependency
 *     private retryCount = 3          // Primitive with default - ignored
 *   ) {}
 * }
 *
 * // Method-level usage
 * class SomeService {
 *   @Inject()
 *   setupEmail(
 *     emailService: EmailService,     // Auto-detected dependency
 *     maxRetries = 5                  // Primitive with default - ignored
 *   ) {}
 * }
 * ```
 */
export function Inject(): ClassDecorator & MethodDecorator {
  return function (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) {
    if (propertyKey === undefined) {
      // Class decorator - constructor injection
      const constructorTarget = target as Constructor
      const dependencies = MetadataManager.extractConstructorDependencies(constructorTarget)
      MetadataManager.markAsInjectable(constructorTarget, dependencies)
      return target
    } else {
      // Method decorator - method injection
      const dependencies = MetadataManager.extractMethodDependencies(target, propertyKey)
      MetadataManager.storeMethodDependencies(target, propertyKey, dependencies)
    }
  }
}
