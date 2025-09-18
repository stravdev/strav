import { Exception, type ExceptionOptions } from './Exception'

/**
 * Base exception class for application-level errors and failures.
 *
 * ApplicationException serves as the foundation for all application-specific
 * errors that occur during the application lifecycle. It provides a consistent
 * error structure with default error codes and standardized error handling
 * patterns for application-level failures.
 *
 * This class is designed to be extended by more specific application exception
 * types rather than used directly. It establishes the common patterns and
 * conventions for application error handling.
 *
 * ## Design Principles
 *
 * - **Consistent Error Codes**: Provides default APPLICATION_ERROR code with override capability
 * - **Lifecycle Awareness**: Designed for application lifecycle error scenarios
 * - **Extensibility**: Serves as base for specific application error types
 * - **Context Preservation**: Maintains error context and causation chains
 *
 * @example
 * ```typescript
 * // Extend for specific application errors
 * class DatabaseConnectionException extends ApplicationException {
 *   constructor(connectionString: string, cause?: Error) {
 *     super(`Failed to connect to database: ${connectionString}`, {
 *       code: 'DATABASE_CONNECTION_FAILED',
 *       context: { connectionString, component: 'database' },
 *       cause
 *     });
 *   }
 * }
 *
 * // Usage with error chaining
 * try {
 *   await database.connect();
 * } catch (error) {
 *   throw new DatabaseConnectionException('postgresql://...', error);
 * }
 * ```
 */
export class ApplicationException extends Exception {
  /**
   * Creates a new ApplicationException with default application error code.
   *
   * The constructor automatically assigns the APPLICATION_ERROR code if no
   * specific code is provided, ensuring consistent error categorization
   * across the application.
   *
   * @param message - Human-readable error description
   * @param options - Optional error metadata and configuration
   *
   * @example
   * ```typescript
   * // Using default error code
   * throw new ApplicationException('Something went wrong');
   * // Results in code: 'APPLICATION_ERROR'
   *
   * // Using custom error code
   * throw new ApplicationException('Config validation failed', {
   *   code: 'CONFIG_VALIDATION_ERROR',
   *   context: { configFile: 'app.config.json' }
   * });
   * ```
   */
  constructor(message: string, options: ExceptionOptions = {}) {
    super(message, {
      ...options,
      code: options.code ?? 'APPLICATION_ERROR',
    })
  }
}

/**
 * Exception thrown when the application fails during the bootstrap phase.
 *
 * The bootstrap phase is responsible for service provider registration with
 * the dependency injection container. This exception indicates that one or
 * more service providers failed to register their services, preventing the
 * application from reaching a state where services can be resolved.
 *
 * Common causes include:
 * - Service provider registration method throwing exceptions
 * - Invalid service configurations
 * - Missing required dependencies for service registration
 * - Container configuration errors
 *
 * @example
 * ```typescript
 * // Service provider registration failure
 * class DatabaseServiceProvider implements ServiceProvider {
 *   register(container: Container): void {
 *     const config = loadDatabaseConfig(); // Throws if config invalid
 *     container.registerClass('database', DatabaseService, [config]);
 *   }
 * }
 *
 * try {
 *   await app.bootstrap();
 * } catch (error) {
 *   if (error instanceof ApplicationBootstrapException) {
 *     console.error('Bootstrap failed:', error.message);
 *     console.error('Underlying cause:', error.cause);
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Throwing with additional context
 * try {
 *   await serviceManager.registerAll();
 * } catch (error) {
 *   throw new ApplicationBootstrapException(
 *     'Failed to register critical services',
 *     error,
 *     {
 *       phase: 'service-registration',
 *       criticalServices: ['database', 'auth', 'logging']
 *     }
 *   );
 * }
 * ```
 */
export class ApplicationBootstrapException extends ApplicationException {
  /**
   * Creates a new ApplicationBootstrapException.
   *
   * @param message - Custom error message (defaults to standard bootstrap failure message)
   * @param cause - The underlying error that caused the bootstrap failure
   * @param context - Additional context about the bootstrap failure
   *
   * @example
   * ```typescript
   * // Minimal usage with default message
   * throw new ApplicationBootstrapException();
   *
   * // With custom message and cause
   * throw new ApplicationBootstrapException(
   *   'Database service provider failed to register',
   *   originalError
   * );
   *
   * // With full context
   * throw new ApplicationBootstrapException(
   *   'Multiple service providers failed during registration',
   *   aggregateError,
   *   {
   *     failedProviders: ['DatabaseServiceProvider', 'CacheServiceProvider'],
   *     totalProviders: 10,
   *     bootstrapStartTime: startTime
   *   }
   * );
   * ```
   */
  constructor(message?: string, cause?: Error, context?: Record<string, unknown>) {
    super(message || 'Failed to bootstrap application', {
      code: 'APPLICATION_BOOTSTRAP_FAILED',
      ...(cause && { cause }),
      ...(context && { context }),
    })
  }
}

/**
 * Exception thrown when the application fails during the boot phase.
 *
 * The boot phase occurs after successful bootstrap and is responsible for
 * service initialization. Service providers execute their boot() methods
 * to perform setup tasks like establishing connections, running migrations,
 * warming caches, and starting background services.
 *
 * This exception indicates that one or more services failed to initialize
 * properly, leaving the application in a partially operational state.
 *
 * Common causes include:
 * - Database connection failures
 * - External service unavailability
 * - Configuration validation errors
 * - Resource initialization failures
 * - Dependency resolution failures
 *
 * @example
 * ```typescript
 * // Database connection failure during boot
 * class DatabaseServiceProvider implements ServiceProvider {
 *   async boot(container: Container): Promise<void> {
 *     const database = container.resolve<DatabaseService>('database');
 *     await database.connect(); // May throw connection error
 *     await database.runMigrations(); // May throw migration error
 *   }
 * }
 *
 * try {
 *   await app.boot();
 * } catch (error) {
 *   if (error instanceof ApplicationBootException) {
 *     console.error('Boot failed:', error.message);
 *
 *     // Access the underlying service boot error
 *     if (error.cause instanceof ServiceBootException) {
 *       console.error('Service that failed:', error.cause.context?.serviceName);
 *     }
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Multiple service boot failures
 * try {
 *   await serviceManager.bootAll();
 * } catch (error) {
 *   throw new ApplicationBootException(
 *     'Critical services failed to initialize',
 *     error,
 *     {
 *       phase: 'service-initialization',
 *       criticalServices: ['database', 'cache', 'messageQueue'],
 *       bootStartTime: startTime,
 *       partiallyBooted: true
 *     }
 *   );
 * }
 * ```
 */
export class ApplicationBootException extends ApplicationException {
  /**
   * Creates a new ApplicationBootException.
   *
   * @param message - Custom error message (defaults to standard boot failure message)
   * @param cause - The underlying error that caused the boot failure
   * @param context - Additional context about the boot failure
   *
   * @example
   * ```typescript
   * // Simple boot failure
   * throw new ApplicationBootException();
   *
   * // With specific service context
   * throw new ApplicationBootException(
   *   'Database service failed to initialize',
   *   databaseError,
   *   {
   *     service: 'DatabaseService',
   *     operation: 'connection',
   *     retryAttempts: 3
   *   }
   * );
   *
   * // With timing and dependency information
   * throw new ApplicationBootException(
   *   'Service boot timeout exceeded',
   *   timeoutError,
   *   {
   *     timeoutMs: 30000,
   *     bootedServices: ['config', 'logging'],
   *     pendingServices: ['database', 'cache', 'email'],
   *     dependencyChain: ['config' -> 'database' -> 'email']
   *   }
   * );
   * ```
   */
  constructor(message?: string, cause?: Error, context?: Record<string, unknown>) {
    super(message || 'Failed to boot application', {
      code: 'APPLICATION_BOOT_FAILED',
      ...(cause && { cause }),
      ...(context && { context }),
    })
  }
}

/**
 * Exception thrown when the application fails during the shutdown phase.
 *
 * The shutdown phase is responsible for gracefully stopping all services
 * and cleaning up resources. Service providers execute their shutdown()
 * methods to close connections, flush data, stop background processes,
 * and release resources.
 *
 * This exception indicates that one or more services failed to shutdown
 * cleanly. Unlike boot failures, shutdown failures are often collected
 * and reported together since the shutdown process should continue even
 * when individual services fail to clean up properly.
 *
 * Common causes include:
 * - Database connection cleanup failures
 * - File handle or socket closure errors
 * - Background process termination failures
 * - External service disconnect errors
 * - Resource deallocation failures
 *
 * @example
 * ```typescript
 * // Graceful shutdown with error handling
 * process.on('SIGTERM', async () => {
 *   console.log('Received SIGTERM, shutting down gracefully...');
 *
 *   try {
 *     await app.shutdown();
 *     console.log('Application shut down successfully');
 *     process.exit(0);
 *   } catch (error) {
 *     if (error instanceof ApplicationShutdownException) {
 *       console.error('Shutdown completed with errors:', error.message);
 *
 *       // Log individual service failures
 *       if (error.cause instanceof GroupedShutdownException) {
 *         for (const failure of error.cause.failures) {
 *           console.error(`- ${failure.provider}: ${failure.error.message}`);
 *         }
 *       }
 *     }
 *     process.exit(1);
 *   }
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Forced shutdown after timeout
 * async function forceShutdown(timeoutMs: number = 30000) {
 *   const shutdownPromise = app.shutdown();
 *   const timeoutPromise = new Promise((_, reject) => {
 *     setTimeout(() => reject(new Error('Shutdown timeout')), timeoutMs);
 *   });
 *
 *   try {
 *     await Promise.race([shutdownPromise, timeoutPromise]);
 *   } catch (error) {
 *     throw new ApplicationShutdownException(
 *       'Forced shutdown due to timeout',
 *       error,
 *       {
 *         timeoutMs,
 *         forced: true,
 *         remainingServices: ['database', 'messageQueue']
 *       }
 *     );
 *   }
 * }
 * ```
 */
export class ApplicationShutdownException extends ApplicationException {
  /**
   * Creates a new ApplicationShutdownException.
   *
   * @param message - Custom error message (defaults to standard shutdown failure message)
   * @param cause - The underlying error that caused the shutdown failure
   * @param context - Additional context about the shutdown failure
   *
   * @example
   * ```typescript
   * // Basic shutdown failure
   * throw new ApplicationShutdownException();
   *
   * // With grouped service failures
   * throw new ApplicationShutdownException(
   *   'Multiple services failed to shutdown cleanly',
   *   groupedShutdownException,
   *   {
   *     totalServices: 8,
   *     failedServices: 2,
   *     shutdownDuration: 15000
   *   }
   * );
   *
   * // With forced shutdown context
   * throw new ApplicationShutdownException(
   *   'Shutdown timeout exceeded, forcing application termination',
   *   timeoutError,
   *   {
   *     timeoutMs: 30000,
   *     forced: true,
   *     cleanShutdown: false,
   *     pendingServices: ['database-connection-pool', 'background-jobs'],
   *     resourcesLeaked: true
   *   }
   * );
   * ```
   */
  constructor(message?: string, cause?: Error, context?: Record<string, unknown>) {
    super(message || 'Failed to shutdown application', {
      code: 'APPLICATION_SHUTDOWN_FAILED',
      ...(cause && { cause }),
      ...(context && { context }),
    })
  }
}

/**
 * @fileoverview
 *
 * ## Application Exception Usage Patterns
 *
 * ### 1. Application Lifecycle Error Handling
 * ```typescript
 * class Application {
 *   async start(): Promise<void> {
 *     try {
 *       await this.bootstrap();
 *     } catch (error) {
 *       throw new ApplicationBootstrapException(
 *         'Application failed to register services',
 *         error,
 *         { phase: 'bootstrap', timestamp: Date.now() }
 *       );
 *     }
 *
 *     try {
 *       await this.boot();
 *     } catch (error) {
 *       throw new ApplicationBootException(
 *         'Application failed to initialize services',
 *         error,
 *         { phase: 'boot', timestamp: Date.now() }
 *       );
 *     }
 *   }
 *
 *   async stop(): Promise<void> {
 *     try {
 *       await this.shutdown();
 *     } catch (error) {
 *       throw new ApplicationShutdownException(
 *         'Application failed to cleanup resources',
 *         error,
 *         { phase: 'shutdown', timestamp: Date.now() }
 *       );
 *     }
 *   }
 * }
 * ```
 *
 * ### 2. Error Recovery and Retry Logic
 * ```typescript
 * class ApplicationStarter {
 *   async startWithRetry(maxAttempts: number = 3): Promise<Application> {
 *     let lastError: Error | null = null;
 *
 *     for (let attempt = 1; attempt <= maxAttempts; attempt++) {
 *       try {
 *         const app = new Application();
 *         await app.start();
 *         return app;
 *       } catch (error) {
 *         lastError = error;
 *
 *         if (error instanceof ApplicationBootstrapException) {
 *           console.error(`Bootstrap attempt ${attempt} failed:`, error.message);
 *           if (attempt < maxAttempts) {
 *             await this.waitBeforeRetry(attempt);
 *           }
 *         } else if (error instanceof ApplicationBootException) {
 *           console.error(`Boot attempt ${attempt} failed:`, error.message);
 *           if (attempt < maxAttempts) {
 *             await this.waitBeforeRetry(attempt);
 *           }
 *         } else {
 *           // Non-application errors should not be retried
 *           throw error;
 *         }
 *       }
 *     }
 *
 *     throw new ApplicationException(
 *       `Failed to start application after ${maxAttempts} attempts`,
 *       { cause: lastError, context: { maxAttempts, finalAttempt: true } }
 *     );
 *   }
 *
 *   private async waitBeforeRetry(attempt: number): Promise<void> {
 *     const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // Exponential backoff
 *     await new Promise(resolve => setTimeout(resolve, delay));
 *   }
 * }
 * ```
 *
 * ### 3. Health Check Integration
 * ```typescript
 * class ApplicationHealthChecker {
 *   async checkApplicationHealth(app: Application): Promise<HealthStatus> {
 *     const checks: HealthCheck[] = [];
 *
 *     try {
 *       if (!app.isRunning()) {
 *         throw new ApplicationException('Application is not running', {
 *           code: 'APPLICATION_NOT_RUNNING',
 *           context: { status: 'unhealthy', reason: 'not-started' }
 *         });
 *       }
 *
 *       // Check individual services
 *       const container = app.getContainer();
 *       checks.push(await this.checkDatabase(container));
 *       checks.push(await this.checkCache(container));
 *       checks.push(await this.checkExternalServices(container));
 *
 *       const failedChecks = checks.filter(check => !check.healthy);
 *       if (failedChecks.length > 0) {
 *         throw new ApplicationException('Health checks failed', {
 *           code: 'HEALTH_CHECK_FAILED',
 *           context: {
 *             failedChecks: failedChecks.map(c => c.name),
 *             totalChecks: checks.length
 *           }
 *         });
 *       }
 *
 *       return { healthy: true, checks };
 *     } catch (error) {
 *       return {
 *         healthy: false,
 *         checks,
 *         error: error instanceof ApplicationException ? error :
 *                new ApplicationException('Health check error', { cause: error })
 *       };
 *     }
 *   }
 * }
 * ```
 *
 * ### 4. Monitoring and Alerting
 * ```typescript
 * class ApplicationMonitor {
 *   private alertManager: AlertManager;
 *   private logger: Logger;
 *
 *   async monitorApplication(app: Application): Promise<void> {
 *     app.on('bootstrap-failed', (error: ApplicationBootstrapException) => {
 *       this.logger.error('Application bootstrap failed', error.toJSON());
 *       this.alertManager.sendCriticalAlert('Application Bootstrap Failure', {
 *         error: error.message,
 *         code: error.code,
 *         context: error.context
 *       });
 *     });
 *
 *     app.on('boot-failed', (error: ApplicationBootException) => {
 *       this.logger.error('Application boot failed', error.toJSON());
 *       this.alertManager.sendCriticalAlert('Application Boot Failure', {
 *         error: error.message,
 *         code: error.code,
 *         context: error.context
 *       });
 *     });
 *
 *     app.on('shutdown-failed', (error: ApplicationShutdownException) => {
 *       this.logger.warn('Application shutdown had errors', error.toJSON());
 *       this.alertManager.sendWarningAlert('Application Shutdown Issues', {
 *         error: error.message,
 *         code: error.code,
 *         context: error.context
 *       });
 *     });
 *   }
 * }
 * ```
 *
 * ### 5. Testing Application Exceptions
 * ```typescript
 * describe('Application Lifecycle Exceptions', () => {
 *   test('should throw ApplicationBootstrapException on service registration failure', async () => {
 *     const app = new Application();
 *     app.register(new FailingServiceProvider());
 *
 *     try {
 *       await app.bootstrap();
 *       fail('Expected ApplicationBootstrapException');
 *     } catch (error) {
 *       expect(error).toBeInstanceOf(ApplicationBootstrapException);
 *       expect(error.code).toBe('APPLICATION_BOOTSTRAP_FAILED');
 *       expect(error.cause).toBeDefined();
 *     }
 *   });
 *
 *   test('should throw ApplicationBootException on service initialization failure', async () => {
 *     const app = new Application();
 *     app.register(new BootFailingServiceProvider());
 *
 *     await app.bootstrap();
 *
 *     try {
 *       await app.boot();
 *       fail('Expected ApplicationBootException');
 *     } catch (error) {
 *       expect(error).toBeInstanceOf(ApplicationBootException);
 *       expect(error.code).toBe('APPLICATION_BOOT_FAILED');
 *       expect(error.message).toContain('Failed to boot application');
 *     }
 *   });
 *
 *   test('should throw ApplicationShutdownException on cleanup failure', async () => {
 *     const app = new Application();
 *     app.register(new ShutdownFailingServiceProvider());
 *
 *     await app.start();
 *
 *     try {
 *       await app.shutdown();
 *       fail('Expected ApplicationShutdownException');
 *     } catch (error) {
 *       expect(error).toBeInstanceOf(ApplicationShutdownException);
 *       expect(error.code).toBe('APPLICATION_SHUTDOWN_FAILED');
 *       expect(error.cause).toBeInstanceOf(GroupedShutdownException);
 *     }
 *   });
 * });
 * ```
 */
