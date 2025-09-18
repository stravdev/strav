/**
 * Configuration options for creating Exception instances.
 *
 * This interface defines the optional metadata that can be attached to exceptions
 * to provide additional context for debugging, logging, and error handling.
 *
 * @example
 * ```typescript
 * const options: ExceptionOptions = {
 *   code: 'USER_NOT_FOUND',
 *   context: { userId: '123', operation: 'getUserProfile' },
 *   cause: originalDatabaseError
 * };
 * ```
 */
export interface ExceptionOptions {
  /**
   * Optional error code for categorization and programmatic handling.
   * Should follow a consistent naming convention (e.g., UPPER_SNAKE_CASE).
   */
  code?: string

  /**
   * Additional context data relevant to the error.
   * Useful for debugging and providing detailed error information.
   */
  context?: Record<string, unknown>

  /**
   * The underlying error that caused this exception.
   * Maintains the error chain for better debugging.
   */
  cause?: Error
}

/**
 * Abstract base exception class that provides enhanced error handling capabilities.
 *
 * The Exception class extends the native JavaScript Error class with additional
 * metadata and standardized error handling patterns. It serves as the foundation
 * for all custom exceptions in the application, providing consistent structure
 * and enhanced debugging capabilities.
 *
 * ## Key Features
 *
 * - **Error Chaining**: Preserves the original error cause for complete error context
 * - **Structured Context**: Attaches relevant metadata for debugging and logging
 * - **Error Codes**: Supports categorization for programmatic error handling
 * - **JSON Serialization**: Provides clean serialization for APIs and logging
 * - **Stack Trace Preservation**: Maintains accurate stack traces for debugging
 *
 * ## Design Principles
 *
 * This class follows modern error handling best practices:
 * - Immutable error properties to prevent accidental modification
 * - Consistent error structure across the application
 * - Support for error aggregation and chaining
 * - Clean separation between error data and presentation
 *
 * ## Usage Patterns
 *
 * The Exception class is designed to be extended by specific exception types
 * rather than used directly. This provides type safety and semantic clarity
 * for different error conditions.
 *
 * @example
 * ```typescript
 * // Define a specific exception type
 * class UserNotFoundException extends Exception {
 *   constructor(userId: string, cause?: Error) {
 *     super(`User with ID '${userId}' not found`, {
 *       code: 'USER_NOT_FOUND',
 *       context: { userId, operation: 'findUser' },
 *       cause
 *     });
 *   }
 * }
 *
 * // Usage with error chaining
 * try {
 *   await database.findUser(userId);
 * } catch (dbError) {
 *   throw new UserNotFoundException(userId, dbError);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Error handling with context
 * try {
 *   const user = await userService.getUser(userId);
 * } catch (error) {
 *   if (error instanceof UserNotFoundException) {
 *     console.log('User ID:', error.context?.userId);
 *     console.log('Error code:', error.code);
 *     console.log('Original cause:', error.cause);
 *   }
 * }
 * ```
 */
export abstract class Exception extends Error {
  /**
   * Optional error code for categorization and programmatic handling.
   * Readonly to prevent accidental modification after construction.
   */
  public readonly code?: string | undefined

  /**
   * Additional context data relevant to the error.
   * Readonly to prevent accidental modification after construction.
   */
  public readonly context?: Record<string, unknown> | undefined

  /**
   * Creates a new Exception instance with enhanced error metadata.
   *
   * The constructor automatically sets the exception name to the class name,
   * preserves stack traces, and handles error chaining. All metadata is
   * made immutable to prevent accidental modification.
   *
   * @param message - Human-readable error description
   * @param options - Optional metadata and configuration
   *
   * @example
   * ```typescript
   * class ValidationException extends Exception {
   *   constructor(field: string, value: unknown, rule: string) {
   *     super(`Validation failed for field '${field}'`, {
   *       code: 'VALIDATION_ERROR',
   *       context: { field, value, rule, timestamp: new Date().toISOString() }
   *     });
   *   }
   * }
   *
   * // Usage
   * throw new ValidationException('email', 'invalid-email', 'email-format');
   * ```
   *
   * @example
   * ```typescript
   * class DatabaseException extends Exception {
   *   constructor(operation: string, cause: Error) {
   *     super(`Database operation '${operation}' failed`, {
   *       code: 'DATABASE_ERROR',
   *       context: {
   *         operation,
   *         timestamp: Date.now(),
   *         connectionId: getConnectionId()
   *       },
   *       cause
   *     });
   *   }
   * }
   *
   * // Usage with error chaining
   * try {
   *   await database.query(sql);
   * } catch (originalError) {
   *   throw new DatabaseException('user_query', originalError);
   * }
   * ```
   */
  constructor(message: string, options: ExceptionOptions = {}) {
    // Call parent constructor with message and cause for proper error chaining
    super(message, { cause: options.cause })

    // Set the exception name to the actual class name for better debugging
    this.name = this.constructor.name

    // Assign immutable metadata
    this.code = options.code
    this.context = options.context

    // Capture stack trace if available (Node.js and modern browsers)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }

    // Ensure cause is properly set (redundant but explicit for clarity)
    if (options.cause) {
      this.cause = options.cause
    }
  }

  /**
   * Serializes the exception to a JSON object for logging or API responses.
   *
   * This method provides a clean, structured representation of the exception
   * that can be safely serialized and transmitted. It excludes potentially
   * sensitive information while preserving debugging context.
   *
   * The serialized format is designed to be:
   * - Safe for logging systems
   * - Suitable for API error responses
   * - Readable for debugging purposes
   * - Consistent across all exception types
   *
   * @returns A plain object representation of the exception
   *
   * @example
   * ```typescript
   * const exception = new UserNotFoundException('user123');
   * console.log(JSON.stringify(exception.toJSON(), null, 2));
   * // Output:
   * // {
   * //   "name": "UserNotFoundException",
   * //   "message": "User with ID 'user123' not found",
   * //   "code": "USER_NOT_FOUND",
   * //   "context": { "userId": "user123", "operation": "findUser" },
   * //   "stack": "UserNotFoundException: User with ID 'user123' not found\n    at ..."
   * // }
   * ```
   *
   * @example
   * ```typescript
   * // API error response
   * app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
   *   if (error instanceof Exception) {
   *     const errorResponse = error.toJSON();
   *
   *     // Remove stack trace in production
   *     if (process.env.NODE_ENV === 'production') {
   *       delete errorResponse.stack;
   *     }
   *
   *     res.status(500).json({
   *       error: errorResponse,
   *       timestamp: new Date().toISOString(),
   *       requestId: req.id
   *     });
   *   } else {
   *     next(error);
   *   }
   * });
   * ```
   *
   * @example
   * ```typescript
   * // Structured logging
   * class Logger {
   *   logError(error: Error, additionalContext?: Record<string, unknown>) {
   *     const logEntry = {
   *       level: 'error',
   *       timestamp: new Date().toISOString(),
   *       ...(error instanceof Exception ? error.toJSON() : {
   *         name: error.name,
   *         message: error.message,
   *         stack: error.stack
   *       }),
   *       ...additionalContext
   *     };
   *
   *     console.error(JSON.stringify(logEntry));
   *   }
   * }
   * ```
   */
  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      stack: this.stack,
    }
  }
}

/**
 * @fileoverview
 *
 * ## Exception Implementation Patterns
 *
 * ### 1. Domain-Specific Exceptions
 * ```typescript
 * // User domain exceptions
 * class UserNotFoundException extends Exception {
 *   constructor(userId: string) {
 *     super(`User with ID '${userId}' not found`, {
 *       code: 'USER_NOT_FOUND',
 *       context: { userId, domain: 'user' }
 *     });
 *   }
 * }
 *
 * class UserAlreadyExistsException extends Exception {
 *   constructor(email: string) {
 *     super(`User with email '${email}' already exists`, {
 *       code: 'USER_ALREADY_EXISTS',
 *       context: { email, domain: 'user' }
 *     });
 *   }
 * }
 *
 * // Payment domain exceptions
 * class PaymentFailedException extends Exception {
 *   constructor(amount: number, currency: string, reason: string, cause?: Error) {
 *     super(`Payment of ${amount} ${currency} failed: ${reason}`, {
 *       code: 'PAYMENT_FAILED',
 *       context: { amount, currency, reason, domain: 'payment' },
 *       cause
 *     });
 *   }
 * }
 * ```
 *
 * ### 2. Validation Exceptions
 * ```typescript
 * interface ValidationError {
 *   field: string;
 *   value: unknown;
 *   constraint: string;
 *   message: string;
 * }
 *
 * class ValidationException extends Exception {
 *   constructor(errors: ValidationError[]) {
 *     const fieldNames = errors.map(e => e.field).join(', ');
 *     super(`Validation failed for fields: ${fieldNames}`, {
 *       code: 'VALIDATION_ERROR',
 *       context: {
 *         errors,
 *         fieldCount: errors.length,
 *         fields: fieldNames
 *       }
 *     });
 *   }
 *
 *   getFieldErrors(field: string): ValidationError[] {
 *     const errors = this.context?.errors as ValidationError[] || [];
 *     return errors.filter(error => error.field === field);
 *   }
 *
 *   hasFieldError(field: string): boolean {
 *     return this.getFieldErrors(field).length > 0;
 *   }
 * }
 *
 * // Usage
 * const errors: ValidationError[] = [
 *   { field: 'email', value: 'invalid', constraint: 'email', message: 'Invalid email format' },
 *   { field: 'age', value: -1, constraint: 'min', message: 'Age must be positive' }
 * ];
 *
 * throw new ValidationException(errors);
 * ```
 *
 * ### 3. HTTP Exceptions with Status Codes
 * ```typescript
 * abstract class HttpException extends Exception {
 *   public readonly statusCode: number;
 *
 *   constructor(message: string, statusCode: number, options: ExceptionOptions = {}) {
 *     super(message, {
 *       ...options,
 *       context: { ...options.context, statusCode }
 *     });
 *     this.statusCode = statusCode;
 *   }
 *
 *   toJSON(): Record<string, unknown> {
 *     return {
 *       ...super.toJSON(),
 *       statusCode: this.statusCode
 *     };
 *   }
 * }
 *
 * class BadRequestException extends HttpException {
 *   constructor(message: string, context?: Record<string, unknown>) {
 *     super(message, 400, { code: 'BAD_REQUEST', context });
 *   }
 * }
 *
 * class UnauthorizedException extends HttpException {
 *   constructor(message: string = 'Unauthorized') {
 *     super(message, 401, { code: 'UNAUTHORIZED' });
 *   }
 * }
 *
 * class NotFoundException extends HttpException {
 *   constructor(resource: string, id: string) {
 *     super(`${resource} with ID '${id}' not found`, 404, {
 *       code: 'NOT_FOUND',
 *       context: { resource, id }
 *     });
 *   }
 * }
 * ```
 *
 * ### 4. Exception Aggregation
 * ```typescript
 * class AggregateException extends Exception {
 *   public readonly innerExceptions: Exception[];
 *
 *   constructor(message: string, exceptions: Exception[]) {
 *     super(message, {
 *       code: 'AGGREGATE_ERROR',
 *       context: {
 *         exceptionCount: exceptions.length,
 *         exceptionTypes: exceptions.map(e => e.name)
 *       }
 *     });
 *     this.innerExceptions = exceptions;
 *   }
 *
 *   toJSON(): Record<string, unknown> {
 *     return {
 *       ...super.toJSON(),
 *       innerExceptions: this.innerExceptions.map(e => e.toJSON())
 *     };
 *   }
 * }
 *
 * // Usage for batch operations
 * const failures: Exception[] = [];
 *
 * for (const user of users) {
 *   try {
 *     await processUser(user);
 *   } catch (error) {
 *     if (error instanceof Exception) {
 *       failures.push(error);
 *     }
 *   }
 * }
 *
 * if (failures.length > 0) {
 *   throw new AggregateException(
 *     `Failed to process ${failures.length} out of ${users.length} users`,
 *     failures
 *   );
 * }
 * ```
 *
 * ### 5. Exception Factory Pattern
 * ```typescript
 * class ExceptionFactory {
 *   static userNotFound(userId: string): UserNotFoundException {
 *     return new UserNotFoundException(userId);
 *   }
 *
 *   static validationFailed(errors: ValidationError[]): ValidationException {
 *     return new ValidationException(errors);
 *   }
 *
 *   static databaseError(operation: string, cause: Error): DatabaseException {
 *     return new DatabaseException(operation, cause);
 *   }
 *
 *   static fromError(error: Error, context?: Record<string, unknown>): Exception {
 *     if (error instanceof Exception) {
 *       return error;
 *     }
 *
 *     return new GenericException(error.message, {
 *       code: 'UNKNOWN_ERROR',
 *       context: { originalName: error.name, ...context },
 *       cause: error
 *     });
 *   }
 * }
 *
 * // Usage
 * throw ExceptionFactory.userNotFound('user123');
 * throw ExceptionFactory.databaseError('findUser', dbError);
 * ```
 *
 * ### 6. Exception Middleware and Handlers
 * ```typescript
 * // Express error handler
 * function exceptionHandler(
 *   error: Error,
 *   req: Request,
 *   res: Response,
 *   next: NextFunction
 * ) {
 *   if (error instanceof HttpException) {
 *     const response = error.toJSON();
 *
 *     if (process.env.NODE_ENV === 'production') {
 *       delete response.stack;
 *     }
 *
 *     return res.status(error.statusCode).json({
 *       error: response,
 *       timestamp: new Date().toISOString(),
 *       path: req.path
 *     });
 *   }
 *
 *   if (error instanceof Exception) {
 *     const response = error.toJSON();
 *
 *     return res.status(500).json({
 *       error: response,
 *       timestamp: new Date().toISOString(),
 *       path: req.path
 *     });
 *   }
 *
 *   // Handle non-Exception errors
 *   next(error);
 * }
 *
 * // Global exception logger
 * class ExceptionLogger {
 *   static log(error: Error, context?: Record<string, unknown>) {
 *     const logEntry = {
 *       timestamp: new Date().toISOString(),
 *       level: 'error',
 *       ...(error instanceof Exception ? error.toJSON() : {
 *         name: error.name,
 *         message: error.message,
 *         stack: error.stack
 *       }),
 *       ...context
 *     };
 *
 *     console.error(JSON.stringify(logEntry, null, 2));
 *   }
 * }
 * ```
 */
