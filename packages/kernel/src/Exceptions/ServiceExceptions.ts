import { Exception, type ExceptionOptions } from './Exception'

/**
 * Enumeration of standardized service error codes for consistent error categorization.
 *
 * These error codes provide a structured way to categorize service-related failures
 * across the application lifecycle. They enable programmatic error handling and
 * facilitate monitoring and alerting systems.
 *
 * @example
 * ```typescript
 * // Programmatic error handling
 * try {
 *   await serviceProvider.register(container);
 * } catch (error) {
 *   if (error.code === ServiceErrorCodes.REGISTRATION_FAILED) {
 *     // Handle registration-specific failure
 *     logger.error('Service registration failed', { service: error.context?.serviceName });
 *   }
 * }
 * ```
 */
export enum ServiceErrorCodes {
  /** Generic service error when no specific category applies */
  SERVICE_ERROR = 'SERVICE_ERROR',

  /** Service failed during registration phase with the DI container */
  REGISTRATION_FAILED = 'SERVICE_REGISTRATION_FAILED',

  /** Service failed during boot/initialization phase */
  BOOT_FAILED = 'SERVICE_BOOT_FAILED',

  /** Service failed during shutdown/cleanup phase */
  SHUTDOWN_FAILED = 'SERVICE_SHUTDOWN_FAILED',
}

/**
 * Base exception class for all service-related errors and failures.
 *
 * ServiceException serves as the foundation for service-specific errors that
 * occur during service provider lifecycle operations. It provides standardized
 * error codes, consistent context structure, and specialized error handling
 * patterns for service-related failures.
 *
 * This class establishes common patterns for service error handling while
 * allowing specific service exception types to provide detailed context
 * about the nature and cause of failures.
 *
 * ## Design Principles
 *
 * - **Standardized Error Codes**: Uses ServiceErrorCodes enum for consistency
 * - **Service Context**: Always includes service identification in error context
 * - **Lifecycle Awareness**: Designed for service provider lifecycle errors
 * - **Extensibility**: Base for specific service error types
 *
 * @example
 * ```typescript
 * // Custom service exception
 * class DatabaseConnectionException extends ServiceException {
 *   constructor(serviceName: string, connectionString: string, cause?: Error) {
 *     super(`Database service failed to connect: ${connectionString}`, {
 *       code: 'DATABASE_CONNECTION_FAILED',
 *       context: {
 *         serviceName,
 *         connectionString,
 *         component: 'database',
 *         operation: 'connect'
 *       },
 *       cause
 *     });
 *   }
 * }
 * ```
 */
export class ServiceException extends Exception {
  /**
   * Creates a new ServiceException with default service error code.
   *
   * Automatically assigns SERVICE_ERROR code if no specific code is provided,
   * ensuring all service exceptions have appropriate categorization.
   *
   * @param message - Human-readable error description
   * @param options - Optional error metadata and configuration
   *
   * @example
   * ```typescript
   * // Generic service error
   * throw new ServiceException('Service operation failed');
   *
   * // Service error with context
   * throw new ServiceException('Cache service unavailable', {
   *   context: {
   *     serviceName: 'CacheService',
   *     operation: 'set',
   *     key: 'user:123'
   *   }
   * });
   * ```
   */
  constructor(message: string, options: ExceptionOptions = {}) {
    super(message, {
      ...options,
      code: options.code ?? ServiceErrorCodes.SERVICE_ERROR,
    })
  }
}

/**
 * Exception thrown when a service provider fails during the registration phase.
 *
 * The registration phase occurs when service providers register their services
 * with the dependency injection container. This exception indicates that a
 * service provider's register() method failed, preventing the service from
 * being available for dependency resolution.
 *
 * Registration failures typically occur due to:
 * - Invalid service configurations
 * - Missing required dependencies for registration
 * - Container configuration errors
 * - Resource allocation failures during registration
 * - Circular dependency detection during registration setup
 *
 * @example
 * ```typescript
 * // Service provider with registration failure
 * class DatabaseServiceProvider implements ServiceProvider {
 *   register(container: Container): void {
 *     try {
 *       const config = this.loadDatabaseConfig();
 *       container.registerClass('database', DatabaseService, ['config']);
 *     } catch (error) {
 *       throw new ServiceRegistrationException(
 *         'DatabaseServiceProvider',
 *         error,
 *         { configPath: './config/database.json' }
 *       );
 *     }
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Handling registration failures
 * try {
 *   await serviceManager.registerAll();
 * } catch (error) {
 *   if (error instanceof ServiceRegistrationException) {
 *     console.error(`Service registration failed: ${error.context?.serviceName}`);
 *     console.error('Underlying cause:', error.cause?.message);
 *
 *     // Attempt recovery or alternative registration
 *     if (error.context?.serviceName === 'CacheService') {
 *       registerFallbackCache(container);
 *     }
 *   }
 * }
 * ```
 */
export class ServiceRegistrationException extends ServiceException {
  /**
   * Creates a new ServiceRegistrationException.
   *
   * @param serviceName - Name of the service that failed to register
   * @param cause - The underlying error that caused the registration failure
   * @param context - Additional context about the registration failure
   *
   * @example
   * ```typescript
   * // Basic registration failure
   * throw new ServiceRegistrationException('EmailService');
   *
   * // With underlying cause
   * throw new ServiceRegistrationException(
   *   'DatabaseService',
   *   configError,
   *   {
   *     configFile: 'database.config.json',
   *     requiredFields: ['host', 'port', 'database']
   *   }
   * );
   *
   * // With detailed context
   * throw new ServiceRegistrationException(
   *   'PaymentService',
   *   validationError,
   *   {
   *     provider: 'PaymentServiceProvider',
   *     dependencies: ['config', 'logger', 'httpClient'],
   *     registrationPhase: 'dependency-validation',
   *     timestamp: Date.now()
   *   }
   * );
   * ```
   */
  constructor(serviceName: string, cause?: Error, context?: Record<string, unknown>) {
    super(`Failed to register service: ${serviceName}`, {
      code: ServiceErrorCodes.REGISTRATION_FAILED,
      ...(cause && { cause }),
      context: { serviceName, ...context },
    })
  }
}

/**
 * Exception thrown when a service provider fails during the boot phase.
 *
 * The boot phase occurs after successful service registration and is responsible
 * for service initialization. Service providers execute their boot() methods to
 * perform setup tasks like establishing connections, running migrations, warming
 * caches, and starting background processes.
 *
 * Boot failures indicate that a service failed to initialize properly, which
 * may leave the application in a partially operational state or prevent
 * dependent services from functioning correctly.
 *
 * Common boot failure causes include:
 * - Database connection failures
 * - External service unavailability
 * - Configuration validation errors during initialization
 * - Resource initialization failures (file system, network, etc.)
 * - Dependency resolution failures during boot
 * - Service-specific initialization logic failures
 *
 * @example
 * ```typescript
 * // Service provider with boot failure
 * class DatabaseServiceProvider implements ServiceProvider {
 *   async boot(container: Container): Promise<void> {
 *     try {
 *       const database = container.resolve<DatabaseService>('database');
 *       await database.connect();
 *       await database.runMigrations();
 *       await database.validateSchema();
 *     } catch (error) {
 *       throw new ServiceBootException(
 *         'DatabaseService',
 *         error,
 *         {
 *           operation: 'initialization',
 *           steps: ['connect', 'migrate', 'validate'],
 *           failedStep: this.identifyFailedStep(error)
 *         }
 *       );
 *     }
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Boot failure with retry logic
 * class EmailServiceProvider implements ServiceProvider {
 *   async boot(container: Container): Promise<void> {
 *     const maxRetries = 3;
 *     let lastError: Error;
 *
 *     for (let attempt = 1; attempt <= maxRetries; attempt++) {
 *       try {
 *         const emailService = container.resolve<EmailService>('emailService');
 *         await emailService.connect();
 *         return; // Success
 *       } catch (error) {
 *         lastError = error;
 *         if (attempt < maxRetries) {
 *           await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
 *         }
 *       }
 *     }
 *
 *     throw new ServiceBootException(
 *       'EmailService',
 *       lastError!,
 *       {
 *         retryAttempts: maxRetries,
 *         bootStrategy: 'retry-with-backoff'
 *       }
 *     );
 *   }
 * }
 * ```
 */
export class ServiceBootException extends ServiceException {
  /**
   * Creates a new ServiceBootException.
   *
   * @param serviceName - Name of the service that failed to boot
   * @param cause - The underlying error that caused the boot failure
   * @param context - Additional context about the boot failure
   *
   * @example
   * ```typescript
   * // Simple boot failure
   * throw new ServiceBootException('CacheService');
   *
   * // With connection failure context
   * throw new ServiceBootException(
   *   'RedisService',
   *   connectionError,
   *   {
   *     host: 'redis.example.com',
   *     port: 6379,
   *     timeout: 5000,
   *     operation: 'connection'
   *   }
   * );
   *
   * // With complex initialization context
   * throw new ServiceBootException(
   *   'MessageQueueService',
   *   initError,
   *   {
   *     provider: 'MessageQueueServiceProvider',
   *     queues: ['email', 'notifications', 'processing'],
   *     initializationSteps: ['connect', 'declare-queues', 'setup-consumers'],
   *     failedStep: 'setup-consumers',
   *     partiallyInitialized: true
   *   }
   * );
   * ```
   */
  constructor(serviceName: string, cause?: Error, context?: Record<string, unknown>) {
    super(`Failed to boot service: ${serviceName}`, {
      code: ServiceErrorCodes.BOOT_FAILED,
      ...(cause && { cause }),
      context: { serviceName, ...context },
    })
  }
}

/**
 * Exception thrown when a service provider fails during the shutdown phase.
 *
 * The shutdown phase is responsible for gracefully stopping services and
 * cleaning up resources. Service providers execute their shutdown() methods
 * to close connections, flush data, stop background processes, and release
 * allocated resources.
 *
 * Shutdown failures indicate that a service failed to clean up properly,
 * which may result in resource leaks, data loss, or prevent graceful
 * application termination. Unlike other lifecycle failures, shutdown
 * failures are often collected and reported together since shutdown
 * should continue even when individual services fail.
 *
 * Common shutdown failure causes include:
 * - Database connection cleanup failures
 * - File handle or socket closure errors
 * - Background process termination failures
 * - External service disconnect errors
 * - Data flush or persistence failures
 * - Resource deallocation failures
 *
 * @example
 * ```typescript
 * // Service provider with shutdown failure
 * class DatabaseServiceProvider implements ServiceProvider {
 *   async shutdown(container: Container): Promise<void> {
 *     try {
 *       const database = container.resolve<DatabaseService>('database');
 *       await database.flushPendingWrites();
 *       await database.closeConnections();
 *       await database.releaseResources();
 *     } catch (error) {
 *       throw new ServiceShutdownException(
 *         'DatabaseService',
 *         error,
 *         {
 *           operation: 'cleanup',
 *           steps: ['flush', 'disconnect', 'release'],
 *           gracefulShutdown: false
 *         }
 *       );
 *     }
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Handling shutdown failures
 * try {
 *   await serviceManager.shutdownAll();
 * } catch (error) {
 *   if (error instanceof GroupedShutdownException) {
 *     console.error(`${error.failures.length} services failed to shutdown:`);
 *
 *     for (const failure of error.failures) {
 *       console.error(`- ${failure.provider}: ${failure.error.message}`);
 *
 *       // Log additional context for debugging
 *       if (failure.error.context) {
 *         console.error('  Context:', failure.error.context);
 *       }
 *     }
 *   }
 * }
 * ```
 */
export class ServiceShutdownException extends ServiceException {
  /**
   * Creates a new ServiceShutdownException.
   *
   * @param serviceName - Name of the service that failed to shutdown
   * @param cause - The underlying error that caused the shutdown failure
   * @param context - Additional context about the shutdown failure
   *
   * @example
   * ```typescript
   * // Basic shutdown failure
   * throw new ServiceShutdownException('FileSystemService');
   *
   * // With resource cleanup context
   * throw new ServiceShutdownException(
   *   'ConnectionPoolService',
   *   timeoutError,
   *   {
   *     activeConnections: 5,
   *     timeoutMs: 30000,
   *     operation: 'connection-cleanup'
   *   }
   * );
   *
   * // With partial cleanup context
   * throw new ServiceShutdownException(
   *   'BackgroundJobService',
   *   processingError,
   *   {
   *     provider: 'JobServiceProvider',
   *     pendingJobs: 12,
   *     completedJobs: 8,
   *     shutdownTimeout: 60000,
   *     forcedTermination: true,
   *     resourcesLeaked: ['worker-threads', 'temp-files']
   *   }
   * );
   * ```
   */
  constructor(serviceName: string, cause?: Error, context?: Record<string, unknown>) {
    super(`Failed to shutdown service: ${serviceName}`, {
      code: ServiceErrorCodes.SHUTDOWN_FAILED,
      ...(cause && { cause }),
      context: { serviceName, ...context },
    })
  }
}

/**
 * Aggregated exception that contains multiple service shutdown failures.
 *
 * GroupedShutdownException is used to collect and report multiple shutdown
 * failures that occur during the application shutdown process. Since shutdown
 * should continue even when individual services fail, this exception allows
 * the system to attempt shutdown of all services while preserving information
 * about any failures that occurred.
 *
 * This pattern enables:
 * - Complete shutdown attempts for all services
 * - Detailed failure reporting for each failed service
 * - Graceful degradation during shutdown
 * - Comprehensive logging and monitoring of shutdown issues
 *
 * @example
 * ```typescript
 * // Service manager collecting shutdown failures
 * class ServiceManager {
 *   async shutdownAll(): Promise<void> {
 *     const failures: Array<{ provider: string; error: ServiceShutdownException }> = [];
 *
 *     for (const provider of this.providers) {
 *       try {
 *         await provider.shutdown(this.container);
 *       } catch (error) {
 *         const shutdownError = error instanceof ServiceShutdownException
 *           ? error
 *           : new ServiceShutdownException(provider.name, error);
 *
 *         failures.push({ provider: provider.name, error: shutdownError });
 *       }
 *     }
 *
 *     if (failures.length > 0) {
 *       throw new GroupedShutdownException(failures);
 *     }
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Handling grouped shutdown failures
 * try {
 *   await app.shutdown();
 * } catch (error) {
 *   if (error instanceof GroupedShutdownException) {
 *     // Log summary
 *     console.error(`Shutdown completed with ${error.failures.length} failures`);
 *
 *     // Log individual failures
 *     for (const failure of error.failures) {
 *       console.error(`Failed: ${failure.provider}`);
 *       console.error(`Error: ${failure.error.message}`);
 *       console.error(`Context:`, failure.error.context);
 *     }
 *
 *     // Send monitoring alerts
 *     await alertManager.sendShutdownFailureAlert({
 *       failureCount: error.failures.length,
 *       failures: error.failures.map(f => ({
 *         provider: f.provider,
 *         error: f.error.message
 *       }))
 *     });
 *   }
 * }
 * ```
 */
export class GroupedShutdownException extends Exception {
  /**
   * Array of individual shutdown failures with provider context.
   * Each failure contains the provider name and the specific shutdown exception.
   */
  public readonly failures: Array<{ provider: string; error: ServiceShutdownException }>

  /**
   * Creates a new GroupedShutdownException from multiple shutdown failures.
   *
   * Automatically generates a comprehensive error message that summarizes
   * all failed providers and their individual error messages.
   *
   * @param failures - Array of shutdown failures with provider context
   *
   * @example
   * ```typescript
   * const failures = [
   *   {
   *     provider: 'DatabaseServiceProvider',
   *     error: new ServiceShutdownException('DatabaseService', connectionError)
   *   },
   *   {
   *     provider: 'CacheServiceProvider',
   *     error: new ServiceShutdownException('CacheService', timeoutError)
   *   }
   * ];
   *
   * throw new GroupedShutdownException(failures);
   * // Message: "2 service provider(s) failed to shutdown:
   * //          - DatabaseServiceProvider: Failed to shutdown service: DatabaseService
   * //          - CacheServiceProvider: Failed to shutdown service: CacheService"
   * ```
   */
  constructor(failures: Array<{ provider: string; error: ServiceShutdownException }>) {
    const message =
      `${failures.length} service provider(s) failed to shutdown:\n` +
      failures.map((f) => `- ${f.provider}: ${f.error.message}`).join('\n')

    super(message)
    this.name = 'GroupedShutdownException'
    this.failures = failures
  }

  /**
   * Returns a JSON representation including all individual failures.
   *
   * Extends the base toJSON() method to include detailed information
   * about each individual shutdown failure for comprehensive logging.
   *
   * @returns JSON object with grouped failure information
   *
   * @example
   * ```typescript
   * const groupedError = new GroupedShutdownException(failures);
   * const errorJson = groupedError.toJSON();
   *
   * console.log(JSON.stringify(errorJson, null, 2));
   * // {
   * //   "name": "GroupedShutdownException",
   * //   "message": "2 service provider(s) failed to shutdown:...",
   * //   "failures": [
   * //     {
   * //       "provider": "DatabaseServiceProvider",
   * //       "error": { ... ServiceShutdownException JSON ... }
   * //     }
   * //   ]
   * // }
   * ```
   */
  public override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      failures: this.failures.map((failure) => ({
        provider: failure.provider,
        error: failure.error.toJSON(),
      })),
    }
  }
}

/**
 * @fileoverview
 *
 * ## Service Exception Usage Patterns
 *
 * ### 1. Service Provider Error Handling
 * ```typescript
 * class DatabaseServiceProvider implements ServiceProvider {
 *   register(container: Container): void {
 *     try {
 *       const config = this.validateConfig();
 *       container.registerClass('database', DatabaseService, ['config']);
 *     } catch (error) {
 *       throw new ServiceRegistrationException(
 *         'DatabaseService',
 *         error,
 *         { phase: 'registration', config: 'database.json' }
 *       );
 *     }
 *   }
 *
 *   async boot(container: Container): Promise<void> {
 *     try {
 *       const db = container.resolve<DatabaseService>('database');
 *       await db.connect();
 *       await db.runMigrations();
 *     } catch (error) {
 *       throw new ServiceBootException(
 *         'DatabaseService',
 *         error,
 *         { phase: 'boot', operations: ['connect', 'migrate'] }
 *       );
 *     }
 *   }
 *
 *   async shutdown(container: Container): Promise<void> {
 *     try {
 *       const db = container.resolve<DatabaseService>('database');
 *       await db.gracefulShutdown();
 *     } catch (error) {
 *       throw new ServiceShutdownException(
 *         'DatabaseService',
 *         error,
 *         { phase: 'shutdown', graceful: false }
 *       );
 *     }
 *   }
 * }
 * ```
 *
 * ### 2. Error Recovery and Fallback Strategies
 * ```typescript
 * class ResilientServiceManager extends ServiceManager {
 *   async registerWithFallback(): Promise<void> {
 *     const criticalServices = ['config', 'logging'];
 *     const optionalServices = ['cache', 'metrics'];
 *
 *     // Register critical services first
 *     for (const serviceName of criticalServices) {
 *       try {
 *         await this.registerService(serviceName);
 *       } catch (error) {
 *         if (error instanceof ServiceRegistrationException) {
 *           throw new Error(`Critical service ${serviceName} failed to register`);
 *         }
 *         throw error;
 *       }
 *     }
 *
 *     // Register optional services with fallbacks
 *     for (const serviceName of optionalServices) {
 *       try {
 *         await this.registerService(serviceName);
 *       } catch (error) {
 *         if (error instanceof ServiceRegistrationException) {
 *           console.warn(`Optional service ${serviceName} failed, using fallback`);
 *           await this.registerFallbackService(serviceName);
 *         }
 *       }
 *     }
 *   }
 * }
 * ```
 *
 * ### 3. Monitoring and Alerting Integration
 * ```typescript
 * class ServiceMonitor {
 *   async monitorServiceLifecycle(serviceManager: ServiceManager): Promise<void> {
 *     serviceManager.on('registration-failed', (error: ServiceRegistrationException) => {
 *       this.alertManager.sendCriticalAlert('Service Registration Failure', {
 *         service: error.context?.serviceName,
 *         error: error.message,
 *         phase: 'registration'
 *       });
 *     });
 *
 *     serviceManager.on('boot-failed', (error: ServiceBootException) => {
 *       this.alertManager.sendCriticalAlert('Service Boot Failure', {
 *         service: error.context?.serviceName,
 *         error: error.message,
 *         phase: 'boot'
 *       });
 *     });
 *
 *     serviceManager.on('shutdown-failed', (error: GroupedShutdownException) => {
 *       this.alertManager.sendWarningAlert('Service Shutdown Issues', {
 *         failureCount: error.failures.length,
 *         failures: error.failures.map(f => f.provider),
 *         phase: 'shutdown'
 *       });
 *     });
 *   }
 * }
 * ```
 *
 * ### 4. Testing Service Exceptions
 * ```typescript
 * describe('Service Exception Handling', () => {
 *   test('should throw ServiceRegistrationException on config failure', () => {
 *     const provider = new DatabaseServiceProvider();
 *     const container = new Container();
 *
 *     // Mock config loading to fail
 *     jest.spyOn(provider, 'loadConfig').mockImplementation(() => {
 *       throw new Error('Config file not found');
 *     });
 *
 *     expect(() => provider.register(container))
 *       .toThrow(ServiceRegistrationException);
 *   });
 *
 *   test('should collect multiple shutdown failures', async () => {
 *     const serviceManager = new ServiceManager();
 *     const failingProviders = [
 *       new FailingShutdownProvider('Service1'),
 *       new FailingShutdownProvider('Service2')
 *     ];
 *
 *     failingProviders.forEach(p => serviceManager.register(p));
 *     await serviceManager.bootAll();
 *
 *     try {
 *       await serviceManager.shutdownAll();
 *       fail('Expected GroupedShutdownException');
 *     } catch (error) {
 *       expect(error).toBeInstanceOf(GroupedShutdownException);
 *       expect(error.failures).toHaveLength(2);
 *     }
 *   });
 * });
 * ```
 *
 * ### 5. Service Health Checking
 * ```typescript
 * class ServiceHealthChecker {
 *   async checkServiceHealth(serviceName: string): Promise<HealthStatus> {
 *     try {
 *       const service = this.container.resolve(serviceName);
 *
 *       if (!service.isHealthy || !await service.isHealthy()) {
 *         throw new ServiceException(`Service ${serviceName} is unhealthy`, {
 *           code: 'SERVICE_UNHEALTHY',
 *           context: { serviceName, status: 'unhealthy' }
 *         });
 *       }
 *
 *       return { healthy: true, serviceName };
 *     } catch (error) {
 *       return {
 *         healthy: false,
 *         serviceName,
 *         error: error instanceof ServiceException ? error :
 *                new ServiceException(`Health check failed for ${serviceName}`, {
 *                  cause: error,
 *                  context: { serviceName }
 *                })
 *       };
 *     }
 *   }
 * }
 * ```
 */
