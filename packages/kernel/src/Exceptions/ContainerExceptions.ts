import type { Token } from '../Types'
import { Exception, type ExceptionOptions } from './Exception'

/**
 * Base exception class for all dependency injection container related errors.
 *
 * This class extends the base Exception class and provides a common foundation
 * for all container-specific exceptions. It includes an optional token property
 * to identify which service caused the error, making debugging and error tracking easier.
 *
 * All container operations that fail will throw exceptions derived from this base class,
 * allowing for consistent error handling across the dependency injection system.
 *
 * @example
 * ```typescript
 * try {
 *   container.resolve('myService');
 * } catch (error) {
 *   if (error instanceof ContainerException) {
 *     console.log(`Container Error: ${error.message}`);
 *     console.log(`Service token: ${error.token}`);
 *   }
 * }
 * ```
 */
export class ContainerException extends Exception {
  /**
   * Creates a new ContainerException instance.
   *
   * @param message - Human-readable error description
   * @param token - Optional service token that caused the error
   * @param options - Additional exception options
   */
  constructor(
    message: string,
    public token?: Token,
    options: ExceptionOptions = {}
  ) {
    super(message, options)
    this.name = 'ContainerException'
  }
}

/**
 * Exception thrown when attempting to resolve a service that hasn't been registered.
 *
 * This error occurs when the container's resolve() method is called with a token
 * that doesn't exist in the service registry. This is one of the most common
 * container errors and typically indicates:
 *
 * - Typo in the service token name
 * - Missing service registration step
 * - Incorrect dependency declaration in service provider
 * - Service was registered with a different token than expected
 * - Using constructor token instead of string token (or vice versa)
 *
 * @example
 * ```typescript
 * const container = new Container();
 *
 * try {
 *   // This will throw ServiceNotFoundException
 *   container.resolve('nonExistentService');
 * } catch (error) {
 *   if (error instanceof ServiceNotFoundException) {
 *     console.log(`Missing service: ${error.token}`);
 *     // Register the missing service or fix the token
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Common scenarios that cause this exception:
 *
 * // 1. Typo in service name
 * container.registerClass('userService', UserService);
 * container.resolve('userServcie'); // Typo: 'userServcie' instead of 'userService'
 *
 * // 2. Wrong token type
 * container.registerClass('userService', UserService);
 * container.resolve(UserService); // Using class instead of string
 *
 * // 3. Dependency not registered
 * container.registerClass('userService', UserService, ['database']); // depends on 'database'
 * // Forgot to register 'database' service
 * container.resolve('userService'); // Fails when trying to inject 'database'
 * ```
 */
export class ServiceNotFoundException extends ContainerException {
  /**
   * Creates a new ServiceNotFoundException.
   *
   * @param token - The service token that could not be found
   * @param options - Additional exception options
   *
   * @example
   * ```typescript
   * // Thrown internally by the resolver when:
   * throw new ServiceNotFoundException('userService');
   * // Results in: "Service not found: userService"
   * ```
   */
  constructor(token: Token, options: ExceptionOptions = {}) {
    super(`Service not found: ${String(token)}`, token, options)
    this.name = 'ServiceNotFoundException'
  }
}

/**
 * Exception thrown when circular dependencies are detected during service resolution.
 *
 * Circular dependencies occur when services depend on each other in a loop,
 * creating an infinite resolution cycle that would cause stack overflow.
 * The container detects these cycles and throws this exception to prevent
 * infinite recursion.
 *
 * Common circular dependency patterns:
 * - Direct circle: ServiceA → ServiceB → ServiceA
 * - Indirect circle: ServiceA → ServiceB → ServiceC → ServiceA
 * - Self-dependency: ServiceA → ServiceA
 *
 * The exception message includes the complete dependency path that forms the cycle,
 * making it easier to identify and resolve the circular reference.
 *
 * @example
 * ```typescript
 * // These registrations create a circular dependency:
 * container
 *   .registerClass('serviceA', ServiceA, ['serviceB'])
 *   .registerClass('serviceB', ServiceB, ['serviceA']);
 *
 * try {
 *   container.resolve('serviceA');
 * } catch (error) {
 *   if (error instanceof CircularDependencyException) {
 *     console.log(error.message);
 *     // "Circular dependency detected: serviceA -> serviceB -> serviceA"
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // More complex circular dependency example:
 * container
 *   .registerClass('userService', UserService, ['emailService'])
 *   .registerClass('emailService', EmailService, ['templateService'])
 *   .registerClass('templateService', TemplateService, ['userService']); // Creates circle
 *
 * // Resolving any service in the circle will throw:
 * // "Circular dependency detected: userService -> emailService -> templateService -> userService"
 * ```
 */
export class CircularDependencyException extends ContainerException {
  /**
   * Creates a new CircularDependencyException.
   *
   * @param path - Array of tokens representing the circular dependency path
   * @param options - Additional exception options
   *
   * @example
   * ```typescript
   * // For a circular dependency: A → B → C → A
   * const path = ['serviceA', 'serviceB', 'serviceC', 'serviceA'];
   * throw new CircularDependencyException(path);
   * // Message: "Circular dependency detected: serviceA -> serviceB -> serviceC -> serviceA"
   * ```
   */
  constructor(path: Token[], options: ExceptionOptions = {}) {
    super(`Circular dependency detected: ${path.map(String).join(' -> ')}`, undefined, options)
    this.name = 'CircularDependencyException'
  }
}

/**
 * @fileoverview
 *
 * ## Container Error Handling Best Practices
 *
 * When working with these container exceptions, consider these patterns:
 *
 * ### 1. Specific Exception Handling
 * ```typescript
 * try {
 *   const service = container.resolve('myService');
 * } catch (error) {
 *   if (error instanceof ServiceNotFoundException) {
 *     // Handle missing service - maybe register a default implementation
 *     console.warn(`Service '${error.token}' not found, using default`);
 *     container.registerClass(error.token as string, DefaultService);
 *     return container.resolve(error.token as string);
 *   }
 *
 *   if (error instanceof CircularDependencyException) {
 *     // Log circular dependency for debugging - this requires architectural fix
 *     console.error('Circular dependency detected:', error.message);
 *     console.error('Consider using interfaces, factory patterns, or dependency inversion');
 *     throw error; // Re-throw as this needs immediate attention
 *   }
 *
 *   // Handle other container errors
 *   if (error instanceof ContainerException) {
 *     console.error('Container Error:', error.message);
 *     if (error.token) {
 *       console.error('Related service token:', error.token);
 *     }
 *   }
 *
 *   throw error; // Re-throw non-container errors
 * }
 * ```
 *
 * ### 2. Validation and Prevention
 * ```typescript
 * // Check service availability before resolving to avoid exceptions
 * if (!container.has('optionalService')) {
 *   console.warn('Optional service not registered, using fallback');
 *   container.registerFactory('optionalService', () => new NullObjectService());
 * }
 *
 * const service = container.resolve('optionalService');
 * ```
 *
 * ### 3. Debugging Service Resolution Issues
 * ```typescript
 * // Log available services when debugging resolution issues
 * try {
 *   const service = container.resolve('problematicService');
 * } catch (error) {
 *   if (error instanceof ServiceNotFoundException) {
 *     const availableServices = container.getRegisteredTokens();
 *     console.error('Available services:', availableServices.map(String));
 *     console.error('Looking for:', error.token);
 *
 *     // Check for similar named services (typos)
 *     const similarServices = availableServices.filter(token =>
 *       String(token).toLowerCase().includes(String(error.token).toLowerCase())
 *     );
 *     if (similarServices.length > 0) {
 *       console.error('Did you mean one of these?', similarServices.map(String));
 *     }
 *   }
 *   throw error;
 * }
 * ```
 *
 * ### 4. Circular Dependency Resolution Strategies
 * ```typescript
 * // Use child containers to isolate and test dependencies
 * const testContainer = container.createChild();
 * try {
 *   testContainer.resolve('suspiciousService');
 * } catch (error) {
 *   if (error instanceof CircularDependencyException) {
 *     console.log('Circular dependency path:', error.message);
 *
 *     // Strategies to fix circular dependencies:
 *     // 1. Use factory pattern to delay dependency resolution
 *     // 2. Introduce an interface/abstraction to break the cycle
 *     // 3. Extract shared logic into a separate service
 *     // 4. Use event-driven communication instead of direct dependencies
 *     // 5. Consider if the circular dependency indicates a design problem
 *   }
 * }
 * ```
 *
 * ### 5. Production Error Monitoring
 * ```typescript
 * // Set up error monitoring for container exceptions
 * function resolveWithMonitoring<T>(container: Container, token: Token<T>): T {
 *   try {
 *     return container.resolve(token);
 *   } catch (error) {
 *     if (error instanceof ContainerException) {
 *       // Log to monitoring service (e.g., Sentry, DataDog)
 *       console.error('[CONTAINER_ERROR]', {
 *         type: error.name,
 *         message: error.message,
 *         token: error.token,
 *         timestamp: new Date().toISOString(),
 *         stack: error.stack
 *       });
 *
 *       // Increment error metrics
 *       metrics.increment('container.resolution.error', {
 *         error_type: error.name,
 *         service_token: String(error.token)
 *       });
 *     }
 *     throw error;
 *   }
 * }
 * ```
 */
