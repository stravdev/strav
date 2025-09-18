import { Container } from '../Container/Container'
import { ServiceManager } from '../Services/ServiceManager'
import { type ServiceProvider } from '../Contracts/ServiceProvider'
import {
  ApplicationBootException,
  ApplicationBootstrapException,
  ApplicationShutdownException,
} from '../Exceptions/ApplicationExceptions'
import type {
  GroupedShutdownException,
  ServiceBootException,
} from '../Exceptions/ServiceExceptions'

/**
 * Main application class that orchestrates the complete application lifecycle.
 *
 * The Application class serves as the primary entry point for managing a dependency
 * injection-based application. It coordinates the lifecycle of service providers,
 * manages application state, and provides a clean interface for application
 * initialization, operation, and shutdown.
 *
 * ## Application Lifecycle
 *
 * The application follows a strict lifecycle with distinct phases:
 *
 * 1. **Creation**: Application instance is created with empty container
 * 2. **Registration**: Service providers are registered (queued for processing)
 * 3. **Bootstrap**: All service providers register their services with the container
 * 4. **Boot**: Service providers perform initialization logic in dependency order
 * 5. **Runtime**: Application is fully operational, services can be resolved
 * 6. **Shutdown**: Services are gracefully shut down in reverse dependency order
 *
 * ## State Management
 *
 * The application maintains two key state flags:
 * - `isBootstrapped`: Services are registered and available for resolution
 * - `isBooted`: Services have completed initialization and are ready for use
 *
 * ## Key Features
 *
 * - **Lifecycle Management**: Complete application lifecycle orchestration
 * - **State Validation**: Prevents invalid state transitions and operations
 * - **Error Handling**: Comprehensive error wrapping with proper exception types
 * - **Fluent Interface**: Method chaining support for clean configuration
 * - **Graceful Shutdown**: Proper resource cleanup with failure tolerance
 *
 * @example
 * ```typescript
 * // Basic application setup
 * const app = new Application();
 *
 * // Register service providers
 * app
 *   .register(new ConfigServiceProvider())
 *   .register(new DatabaseServiceProvider())
 *   .register(new EmailServiceProvider());
 *
 * try {
 *   // Start the application
 *   await app.run(); // Equivalent to bootstrap() then boot()
 *
 *   console.log('Application started:', app.isRunning()); // true
 *
 *   // Use services
 *   const userService = app.getContainer().resolve<UserService>('userService');
 *   await userService.createUser({ name: 'John Doe' });
 *
 * } catch (error) {
 *   console.error('Failed to start application:', error);
 * } finally {
 *   // Graceful shutdown
 *   await app.shutdown();
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Step-by-step lifecycle management
 * const app = new Application();
 *
 * // Registration phase
 * app.register(new DatabaseServiceProvider());
 * app.register(new AuthServiceProvider());
 * console.log(app.isRunning()); // false
 *
 * // Bootstrap phase
 * await app.bootstrap();
 * console.log(app.isRunning()); // false (registered but not booted)
 *
 * // Boot phase
 * await app.boot();
 * console.log(app.isRunning()); // true (fully operational)
 *
 * // Shutdown phase
 * await app.shutdown();
 * console.log(app.isRunning()); // false (shutdown complete)
 * ```
 */
export class Application {
  /** The dependency injection container that manages service instances */
  private readonly container: Container

  /** The service manager that handles provider lifecycle orchestration */
  private readonly serviceManager: ServiceManager

  /** Flag indicating whether service providers have completed registration */
  private isBootstrapped = false

  /** Flag indicating whether service providers have completed initialization */
  private isBooted = false

  /**
   * Creates a new Application instance with fresh container and service manager.
   *
   * Each application instance is completely isolated with its own dependency
   * injection container and service manager. This allows for multiple
   * applications to coexist without interference.
   *
   * @example
   * ```typescript
   * const app = new Application();
   *
   * // Each application has isolated containers
   * const app1 = new Application();
   * const app2 = new Application();
   * console.log(app1.getContainer() === app2.getContainer()); // false
   * ```
   */
  constructor() {
    this.container = new Container()
    this.serviceManager = new ServiceManager(this.container)
  }

  /**
   * Returns the dependency injection container for service resolution.
   *
   * The container provides access to all registered services and allows
   * for manual service resolution when needed. However, most service
   * resolution should happen automatically through dependency injection.
   *
   * @returns The DI container instance
   *
   * @example
   * ```typescript
   * const app = new Application();
   * app.register(new DatabaseServiceProvider());
   *
   * await app.run();
   *
   * // Manual service resolution
   * const container = app.getContainer();
   * const database = container.resolve<DatabaseService>('database');
   * const userRepo = container.resolve<UserRepository>('userRepository');
   *
   * // Check service availability
   * if (container.has('optionalService')) {
   *   const service = container.resolve('optionalService');
   * }
   * ```
   */
  public getContainer(): Container {
    return this.container
  }

  /**
   * Returns the service manager for advanced lifecycle operations.
   *
   * The service manager provides access to provider introspection and
   * advanced lifecycle operations. This is primarily useful for debugging,
   * monitoring, or implementing custom lifecycle logic.
   *
   * @returns The service manager instance
   *
   * @example
   * ```typescript
   * const app = new Application();
   * app.register(new DatabaseServiceProvider());
   * app.register(new EmailServiceProvider());
   *
   * await app.bootstrap();
   *
   * const serviceManager = app.getServiceManager();
   *
   * // Inspect registered providers
   * const registered = serviceManager.getRegisteredProviders();
   * console.log(`Registered ${registered.length} providers`);
   *
   * await app.boot();
   *
   * // Inspect booted providers
   * const booted = serviceManager.getBootedProviders();
   * console.log(`Booted ${booted.length} providers`);
   * ```
   */
  public getServiceManager(): ServiceManager {
    return this.serviceManager
  }

  /**
   * Registers a service provider with the application.
   *
   * Service providers are queued for registration but not immediately
   * processed. They will be registered during the bootstrap phase.
   * This allows for collecting all providers before beginning the
   * registration process.
   *
   * @param serviceProvider - The service provider to register
   * @returns The application instance for method chaining
   *
   * @example
   * ```typescript
   * const app = new Application();
   *
   * // Method chaining for clean configuration
   * app
   *   .register(new ConfigServiceProvider())
   *   .register(new DatabaseServiceProvider())
   *   .register(new EmailServiceProvider())
   *   .register(new AuthServiceProvider());
   *
   * // Providers are queued, not yet registered
   * console.log(app.getServiceManager().getRegisteredProviders().length); // 0
   * ```
   *
   * @example
   * ```typescript
   * // Conditional provider registration
   * const app = new Application();
   *
   * app.register(new CoreServiceProvider());
   *
   * if (process.env.NODE_ENV === 'production') {
   *   app.register(new ProductionServiceProvider());
   * } else {
   *   app.register(new DevelopmentServiceProvider());
   * }
   *
   * if (process.env.ENABLE_METRICS === 'true') {
   *   app.register(new MetricsServiceProvider());
   * }
   * ```
   */
  public register(serviceProvider: ServiceProvider): this {
    this.serviceManager.register(serviceProvider)
    return this
  }

  /**
   * Bootstraps the application by registering all queued service providers.
   *
   * During the bootstrap phase, all service providers register their services
   * with the dependency injection container. After bootstrapping, services
   * are available for resolution but may not be fully initialized.
   *
   * This phase processes providers in the order they were registered, not
   * dependency order. Dependency order is only considered during the boot phase.
   *
   * @throws {ApplicationBootstrapException} If the application is already bootstrapped
   * @throws {Error} If any service provider's register method fails
   * @returns Promise resolving to the application instance for chaining
   *
   * @example
   * ```typescript
   * const app = new Application();
   * app.register(new ConfigServiceProvider());
   * app.register(new DatabaseServiceProvider());
   *
   * try {
   *   await app.bootstrap();
   *   console.log('Services registered successfully');
   *
   *   // Services are now available for resolution
   *   const config = app.getContainer().resolve('config');
   *   console.log('Config loaded:', config);
   *
   * } catch (error) {
   *   console.error('Bootstrap failed:', error);
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Method chaining with bootstrap
   * const app = new Application();
   *
   * const bootstrappedApp = await app
   *   .register(new ConfigServiceProvider())
   *   .register(new DatabaseServiceProvider())
   *   .bootstrap();
   *
   * console.log(bootstrappedApp === app); // true
   * ```
   */
  public async bootstrap(): Promise<this> {
    if (this.isBootstrapped) {
      throw new ApplicationBootstrapException('Application is already bootstrapped')
    }

    await this.serviceManager.registerAll()
    this.isBootstrapped = true
    return this
  }

  /**
   * Boots the application by initializing all registered service providers.
   *
   * During the boot phase, service providers perform their initialization
   * logic such as:
   * - Establishing database connections
   * - Running migrations
   * - Warming caches
   * - Starting background services
   * - Validating configurations
   *
   * Providers are booted in dependency order using topological sorting to
   * ensure that dependencies are available before dependents are initialized.
   *
   * @throws {ApplicationBootException} If not bootstrapped, already booted, or boot fails
   * @returns Promise resolving to the application instance for chaining
   *
   * @example
   * ```typescript
   * const app = new Application();
   * app.register(new DatabaseServiceProvider());
   * app.register(new EmailServiceProvider());
   *
   * try {
   *   await app.bootstrap();
   *   await app.boot();
   *
   *   console.log('Application is running:', app.isRunning()); // true
   *
   *   // Services are now fully initialized
   *   const database = app.getContainer().resolve<DatabaseService>('database');
   *   console.log('Database connected:', database.isConnected()); // true
   *
   * } catch (error) {
   *   if (error instanceof ApplicationBootException) {
   *     console.error('Boot failed:', error.message);
   *     console.error('Underlying cause:', error.cause);
   *   }
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Boot with dependency validation
   * const app = new Application();
   *
   * await app.bootstrap();
   *
   * // Verify critical services before booting
   * const container = app.getContainer();
   * if (!container.has('database') || !container.has('config')) {
   *   throw new Error('Critical services not registered');
   * }
   *
   * await app.boot();
   * ```
   */
  public async boot(): Promise<this> {
    if (!this.isBootstrapped) {
      throw new ApplicationBootException('Application must be bootstrapped before booting')
    }

    if (this.isBooted) {
      throw new ApplicationBootException('Application is already booted')
    }

    try {
      await this.serviceManager.bootAll()
    } catch (error) {
      throw new ApplicationBootException(
        'Failed to boot all services',
        error as ServiceBootException
      )
    }

    this.isBooted = true
    return this
  }

  /**
   * Gracefully shuts down the application and all services.
   *
   * During shutdown, service providers clean up resources in reverse dependency
   * order to ensure that dependents are shut down before their dependencies.
   * The shutdown process continues even if individual providers fail, collecting
   * all failures for reporting.
   *
   * After shutdown, the application state is reset and can be bootstrapped
   * and booted again if needed.
   *
   * @throws {ApplicationShutdownException} If some services fail to shutdown cleanly
   * @returns Promise that resolves when shutdown is complete
   *
   * @example
   * ```typescript
   * const app = new Application();
   *
   * // Setup signal handlers for graceful shutdown
   * const gracefulShutdown = async (signal: string) => {
   *   console.log(`Received ${signal}, shutting down gracefully...`);
   *
   *   try {
   *     await app.shutdown();
   *     console.log('Application shut down successfully');
   *     process.exit(0);
   *   } catch (error) {
   *     console.error('Shutdown failed:', error);
   *     process.exit(1);
   *   }
   * };
   *
   * process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
   * process.on('SIGINT', () => gracefulShutdown('SIGINT'));
   *
   * await app.run();
   * ```
   *
   * @example
   * ```typescript
   * // Shutdown with error handling
   * const app = new Application();
   * await app.run();
   *
   * try {
   *   await app.shutdown();
   * } catch (error) {
   *   if (error instanceof ApplicationShutdownException) {
   *     console.error('Some services failed to shutdown:', error.message);
   *
   *     // Access underlying failures
   *     const groupedError = error.cause as GroupedShutdownException;
   *     for (const failure of groupedError.failures) {
   *       console.error(`- ${failure.provider}: ${failure.error.message}`);
   *     }
   *   }
   * }
   *
   * console.log('Application stopped:', !app.isRunning()); // true
   * ```
   */
  public async shutdown(): Promise<void> {
    if (!this.isBooted) {
      return
    }

    try {
      await this.serviceManager.shutdownAll()
    } catch (error) {
      throw new ApplicationShutdownException(
        'Failed to pre-shutdown all services',
        error as GroupedShutdownException
      )
    }

    this.isBooted = false
    this.isBootstrapped = false
  }

  /**
   * Checks if the application is fully operational.
   *
   * Returns true only when the application has completed both bootstrap
   * and boot phases. This indicates that all services are registered,
   * initialized, and ready for use.
   *
   * @returns True if the application is running, false otherwise
   *
   * @example
   * ```typescript
   * const app = new Application();
   * console.log(app.isRunning()); // false - not started
   *
   * app.register(new ConfigServiceProvider());
   * console.log(app.isRunning()); // false - providers registered but not processed
   *
   * await app.bootstrap();
   * console.log(app.isRunning()); // false - bootstrapped but not booted
   *
   * await app.boot();
   * console.log(app.isRunning()); // true - fully operational
   *
   * await app.shutdown();
   * console.log(app.isRunning()); // false - shut down
   * ```
   *
   * @example
   * ```typescript
   * // Health check endpoint
   * app.get('/health', (req, res) => {
   *   if (app.isRunning()) {
   *     res.json({ status: 'healthy', timestamp: new Date().toISOString() });
   *   } else {
   *     res.status(503).json({ status: 'unavailable', reason: 'application not running' });
   *   }
   * });
   * ```
   */
  public isRunning(): boolean {
    return this.isBootstrapped && this.isBooted
  }

  /**
   * Runs the complete application lifecycle in a single call.
   *
   * This convenience method combines bootstrap() and boot() operations,
   * providing a simple way to start the application. It's equivalent to
   * calling bootstrap() followed by boot().
   *
   * @throws {ApplicationBootstrapException} If already bootstrapped
   * @throws {ApplicationBootException} If boot fails
   * @returns Promise that resolves when the application is fully started
   *
   * @example
   * ```typescript
   * // Simple application startup
   * const app = new Application();
   *
   * app
   *   .register(new ConfigServiceProvider())
   *   .register(new DatabaseServiceProvider())
   *   .register(new EmailServiceProvider());
   *
   * try {
   *   await app.run();
   *   console.log('Application started successfully');
   *
   *   // Application is now ready to serve requests
   *   const server = app.getContainer().resolve<HttpServer>('httpServer');
   *   server.listen(3000);
   *
   * } catch (error) {
   *   console.error('Failed to start application:', error);
   *   process.exit(1);
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Application startup with retry logic
   * async function startWithRetry(maxAttempts = 3) {
   *   const app = new Application();
   *   app.register(new DatabaseServiceProvider());
   *
   *   for (let attempt = 1; attempt <= maxAttempts; attempt++) {
   *     try {
   *       await app.run();
   *       return app;
   *     } catch (error) {
   *       console.error(`Startup attempt ${attempt} failed:`, error);
   *
   *       if (attempt < maxAttempts) {
   *         console.log('Retrying in 5 seconds...');
   *         await new Promise(resolve => setTimeout(resolve, 5000));
   *
   *         // Reset for retry
   *         try {
   *           await app.shutdown();
   *         } catch {}
   *       }
   *     }
   *   }
   *
   *   throw new Error(`Failed to start after ${maxAttempts} attempts`);
   * }
   * ```
   */
  public async run(): Promise<void> {
    await this.bootstrap()
    await this.boot()
  }
}

/**
 * @fileoverview
 *
 * ## Application Usage Patterns
 *
 * ### 1. Basic Web Application Setup
 * ```typescript
 * async function createWebApplication() {
 *   const app = new Application();
 *
 *   // Register core services
 *   app
 *     .register(new ConfigServiceProvider())
 *     .register(new LoggingServiceProvider())
 *     .register(new DatabaseServiceProvider())
 *     .register(new AuthServiceProvider())
 *     .register(new EmailServiceProvider())
 *     .register(new HttpServiceProvider());
 *
 *   // Start the application
 *   await app.run();
 *
 *   // Get HTTP server and start listening
 *   const server = app.getContainer().resolve<HttpServer>('httpServer');
 *   server.listen(process.env.PORT || 3000);
 *
 *   console.log(`Server running on port ${process.env.PORT || 3000}`);
 *   return app;
 * }
 * ```
 *
 * ### 2. Microservice with Health Checks
 * ```typescript
 * class MicroserviceApplication {
 *   constructor(private app = new Application()) {}
 *
 *   async start() {
 *     // Register microservice-specific providers
 *     this.app
 *       .register(new ConfigServiceProvider())
 *       .register(new MetricsServiceProvider())
 *       .register(new HealthCheckServiceProvider())
 *       .register(new MessageQueueServiceProvider())
 *       .register(new BusinessLogicServiceProvider());
 *
 *     await this.app.run();
 *
 *     // Setup health check endpoint
 *     this.setupHealthCheck();
 *   }
 *
 *   private setupHealthCheck() {
 *     const httpServer = this.app.getContainer().resolve<HttpServer>('httpServer');
 *
 *     httpServer.get('/health', (req, res) => {
 *       const isHealthy = this.app.isRunning();
 *       const status = isHealthy ? 200 : 503;
 *
 *       res.status(status).json({
 *         status: isHealthy ? 'healthy' : 'unhealthy',
 *         timestamp: new Date().toISOString(),
 *         services: this.getServiceHealth()
 *       });
 *     });
 *   }
 *
 *   private getServiceHealth() {
 *     const container = this.app.getContainer();
 *     return {
 *       database: container.resolve<DatabaseService>('database').isConnected(),
 *       messageQueue: container.resolve<MessageQueue>('messageQueue').isConnected(),
 *       cache: container.resolve<CacheService>('cache').isReady()
 *     };
 *   }
 *
 *   async stop() {
 *     await this.app.shutdown();
 *   }
 * }
 * ```
 *
 * ### 3. Testing Application
 * ```typescript
 * class TestApplication extends Application {
 *   static async createForTesting() {
 *     const app = new TestApplication();
 *
 *     // Register test-specific providers
 *     app
 *       .register(new TestConfigServiceProvider())
 *       .register(new InMemoryDatabaseServiceProvider())
 *       .register(new MockEmailServiceProvider())
 *       .register(new TestUserServiceProvider());
 *
 *     await app.run();
 *     return app;
 *   }
 *
 *   async reset() {
 *     // Reset application state for test isolation
 *     const database = this.getContainer().resolve<TestDatabase>('database');
 *     await database.truncateAll();
 *
 *     const cache = this.getContainer().resolve<TestCache>('cache');
 *     await cache.flush();
 *   }
 * }
 *
 * // In test files
 * describe('User API', () => {
 *   let app: TestApplication;
 *
 *   beforeAll(async () => {
 *     app = await TestApplication.createForTesting();
 *   });
 *
 *   afterAll(async () => {
 *     await app.shutdown();
 *   });
 *
 *   beforeEach(async () => {
 *     await app.reset();
 *   });
 *
 *   test('should create user', async () => {
 *     const userService = app.getContainer().resolve<UserService>('userService');
 *     const user = await userService.create({ name: 'John' });
 *     expect(user.id).toBeDefined();
 *   });
 * });
 * ```
 *
 * ### 4. CLI Application
 * ```typescript
 * class CLIApplication {
 *   constructor(private app = new Application()) {}
 *
 *   async run(command: string, args: string[]) {
 *     // Register CLI-specific providers
 *     this.app
 *       .register(new ConfigServiceProvider())
 *       .register(new DatabaseServiceProvider())
 *       .register(new CLServiceProvider())
 *       .register(new CommandServiceProvider());
 *
 *     try {
 *       await this.app.run();
 *
 *       const commandService = this.app.getContainer()
 *         .resolve<CommandService>('commandService');
 *
 *       const result = await commandService.execute(command, args);
 *       console.log(result);
 *
 *       await this.app.shutdown();
 *       process.exit(0);
 *
 *     } catch (error) {
 *       console.error('Command failed:', error);
 *       await this.app.shutdown();
 *       process.exit(1);
 *     }
 *   }
 * }
 *
 * // CLI entry point
 * const cli = new CLIApplication();
 * cli.run(process.argv[2], process.argv.slice(3));
 * ```
 *
 * ### 5. Application with Graceful Shutdown
 * ```typescript
 * class ProductionApplication {
 *   constructor(private app = new Application()) {
 *     this.setupGracefulShutdown();
 *   }
 *
 *   async start() {
 *     this.app
 *       .register(new ConfigServiceProvider())
 *       .register(new DatabaseServiceProvider())
 *       .register(new RedisServiceProvider())
 *       .register(new HttpServiceProvider());
 *
 *     await this.app.run();
 *     console.log('Production application started');
 *   }
 *
 *   private setupGracefulShutdown() {
 *     const shutdown = async (signal: string) => {
 *       console.log(`Received ${signal}, starting graceful shutdown...`);
 *
 *       // Stop accepting new requests
 *       if (this.app.isRunning()) {
 *         const httpServer = this.app.getContainer()
 *           .resolve<HttpServer>('httpServer');
 *         httpServer.close();
 *       }
 *
 *       try {
 *         await this.app.shutdown();
 *         console.log('Graceful shutdown completed');
 *         process.exit(0);
 *       } catch (error) {
 *         console.error('Shutdown failed:', error);
 *         process.exit(1);
 *       }
 *     };
 *
 *     process.on('SIGTERM', () => shutdown('SIGTERM'));
 *     process.on('SIGINT', () => shutdown('SIGINT'));
 *     process.on('SIGUSR2', () => shutdown('SIGUSR2')); // Nodemon
 *   }
 * }
 * ```
 */
