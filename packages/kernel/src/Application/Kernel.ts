import { Application } from './Application'
import { type ServiceProvider } from '../Contracts/ServiceProvider'

/**
 * Application kernel that orchestrates the complete application startup process.
 *
 * The Kernel class serves as a high-level orchestrator that simplifies application
 * setup and management. It provides a clean interface for configuring service
 * providers and managing the application lifecycle, abstracting away the complexity
 * of the underlying Application class.
 *
 * ## Purpose and Benefits
 *
 * The Kernel acts as a facade over the Application class, providing:
 * - **Simplified Configuration**: Easy service provider registration and management
 * - **Lifecycle Orchestration**: Automated application startup and shutdown
 * - **Clean Separation**: Clear boundary between configuration and runtime
 * - **Reusability**: Kernels can be composed and reused across different contexts
 * - **Testing Support**: Easy mocking and testing of application configurations
 *
 * ## Design Pattern
 *
 * The Kernel follows the Facade pattern, providing a simplified interface to
 * the more complex Application subsystem. It also incorporates elements of the
 * Builder pattern for service provider configuration.
 *
 * ## Typical Usage Flow
 *
 * 1. **Creation**: Kernel is created with initial service providers
 * 2. **Configuration**: Additional providers are registered as needed
 * 3. **Startup**: Kernel starts the application with all registered providers
 * 4. **Runtime**: Application runs normally with full service availability
 * 5. **Shutdown**: Kernel stops the application gracefully
 *
 * @example
 * ```typescript
 * // Basic kernel usage
 * const kernel = new Kernel([
 *   new ConfigServiceProvider(),
 *   new DatabaseServiceProvider(),
 *   new EmailServiceProvider()
 * ]);
 *
 * try {
 *   const app = await kernel.start();
 *   console.log('Application started successfully');
 *
 *   // Use services through the application
 *   const userService = app.getContainer().resolve<UserService>('userService');
 *   await userService.processUsers();
 *
 * } finally {
 *   await kernel.stop();
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Dynamic provider registration
 * const kernel = new Kernel();
 *
 * // Core providers
 * kernel
 *   .registerServiceProvider(new ConfigServiceProvider())
 *   .registerServiceProvider(new LoggingServiceProvider());
 *
 * // Environment-specific providers
 * if (process.env.NODE_ENV === 'production') {
 *   kernel.registerServiceProvider(new ProductionDatabaseServiceProvider());
 * } else {
 *   kernel.registerServiceProvider(new DevelopmentDatabaseServiceProvider());
 * }
 *
 * const app = await kernel.start();
 * ```
 */
export class Kernel {
  /** The underlying application instance that manages the actual lifecycle */
  private readonly application: Application

  /** Collection of service providers to be registered with the application */
  private readonly serviceProviders: Array<ServiceProvider> = []

  /**
   * Creates a new Kernel instance with optional initial service providers.
   *
   * The kernel creates a fresh Application instance and optionally accepts
   * an array of service providers to register. Additional providers can be
   * added later using the registerServiceProvider method.
   *
   * @param serviceProviders - Initial service providers to register (default: empty array)
   *
   * @example
   * ```typescript
   * // Empty kernel for dynamic configuration
   * const kernel = new Kernel();
   *
   * // Kernel with initial providers
   * const kernel = new Kernel([
   *   new ConfigServiceProvider(),
   *   new DatabaseServiceProvider()
   * ]);
   *
   * // Kernel with environment-specific providers
   * const providers = [
   *   new ConfigServiceProvider(),
   *   new LoggingServiceProvider()
   * ];
   *
   * if (process.env.DATABASE_URL) {
   *   providers.push(new DatabaseServiceProvider());
   * }
   *
   * const kernel = new Kernel(providers);
   * ```
   */
  constructor(serviceProviders: Array<ServiceProvider> = []) {
    this.application = new Application()
    this.serviceProviders = serviceProviders
  }

  /**
   * Returns the underlying Application instance for direct access.
   *
   * This method provides access to the Application instance managed by the kernel.
   * It's useful for accessing the container, service manager, or other application
   * features that aren't directly exposed by the kernel interface.
   *
   * Use this method when you need fine-grained control over the application
   * or need to access advanced features not available through the kernel.
   *
   * @returns The underlying Application instance
   *
   * @example
   * ```typescript
   * const kernel = new Kernel([new DatabaseServiceProvider()]);
   * await kernel.start();
   *
   * // Access the application for direct container usage
   * const app = kernel.getApplication();
   * const container = app.getContainer();
   * const database = container.resolve<DatabaseService>('database');
   *
   * // Check application state
   * console.log('Application running:', app.isRunning());
   *
   * // Access service manager for introspection
   * const serviceManager = app.getServiceManager();
   * const bootedProviders = serviceManager.getBootedProviders();
   * console.log(`${bootedProviders.length} providers booted`);
   * ```
   *
   * @example
   * ```typescript
   * // Advanced configuration after kernel creation
   * const kernel = new Kernel();
   * const app = kernel.getApplication();
   *
   * // Directly register services with the application
   * app.register(new SpecialServiceProvider());
   *
   * // Or access the container for manual service registration
   * const container = app.getContainer();
   * container.registerValue('specialConfig', { key: 'value' });
   *
   * await kernel.start();
   * ```
   */
  public getApplication(): Application {
    return this.application
  }

  /**
   * Registers a new service provider with the kernel.
   *
   * Service providers are added to the kernel's internal collection and will
   * be registered with the application during the startup process. Providers
   * can be added at any time before calling start().
   *
   * @param serviceProvider - The service provider to register
   * @returns The kernel instance for method chaining
   *
   * @example
   * ```typescript
   * const kernel = new Kernel();
   *
   * // Method chaining for clean configuration
   * kernel
   *   .registerServiceProvider(new ConfigServiceProvider())
   *   .registerServiceProvider(new DatabaseServiceProvider())
   *   .registerServiceProvider(new EmailServiceProvider());
   *
   * await kernel.start();
   * ```
   *
   * @example
   * ```typescript
   * // Conditional provider registration
   * const kernel = new Kernel([new CoreServiceProvider()]);
   *
   * // Add optional providers based on configuration
   * const config = loadConfig();
   *
   * if (config.features.email) {
   *   kernel.registerServiceProvider(new EmailServiceProvider());
   * }
   *
   * if (config.features.caching) {
   *   kernel.registerServiceProvider(new CacheServiceProvider());
   * }
   *
   * if (config.features.metrics) {
   *   kernel.registerServiceProvider(new MetricsServiceProvider());
   * }
   *
   * await kernel.start();
   * ```
   *
   * @example
   * ```typescript
   * // Plugin-style provider registration
   * class PluginManager {
   *   static registerPlugins(kernel: Kernel, pluginNames: string[]) {
   *     for (const pluginName of pluginNames) {
   *       const ProviderClass = this.getProviderClass(pluginName);
   *       kernel.registerServiceProvider(new ProviderClass());
   *     }
   *   }
   *
   *   private static getProviderClass(name: string) {
   *     const providers = {
   *       'auth': AuthServiceProvider,
   *       'payment': PaymentServiceProvider,
   *       'analytics': AnalyticsServiceProvider
   *     };
   *     return providers[name];
   *   }
   * }
   *
   * const kernel = new Kernel();
   * PluginManager.registerPlugins(kernel, ['auth', 'payment']);
   * ```
   */
  public registerServiceProvider(serviceProvider: ServiceProvider): this {
    this.serviceProviders.push(serviceProvider)
    return this
  }

  /**
   * Starts the application by registering all service providers and running the app.
   *
   * This method orchestrates the complete application startup process:
   * 1. Registers all collected service providers with the application
   * 2. Calls the application's run() method (bootstrap + boot)
   * 3. Returns the started application for further use
   *
   * The startup process handles service registration, dependency resolution,
   * and service initialization automatically. If any step fails, appropriate
   * exceptions are thrown.
   *
   * @throws {ApplicationBootstrapException} If service registration fails
   * @throws {ApplicationBootException} If service initialization fails
   * @returns Promise resolving to the started Application instance
   *
   * @example
   * ```typescript
   * // Basic startup
   * const kernel = new Kernel([
   *   new ConfigServiceProvider(),
   *   new DatabaseServiceProvider()
   * ]);
   *
   * try {
   *   const app = await kernel.start();
   *   console.log('Application started successfully');
   *
   *   // Application is now ready for use
   *   const database = app.getContainer().resolve<DatabaseService>('database');
   *   console.log('Database connected:', database.isConnected());
   *
   * } catch (error) {
   *   console.error('Failed to start application:', error);
   *   process.exit(1);
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Startup with health checks
   * const kernel = new Kernel([
   *   new ConfigServiceProvider(),
   *   new DatabaseServiceProvider(),
   *   new HealthCheckServiceProvider()
   * ]);
   *
   * const app = await kernel.start();
   *
   * // Verify critical services are healthy
   * const healthCheck = app.getContainer().resolve<HealthCheckService>('healthCheck');
   * const isHealthy = await healthCheck.checkAll();
   *
   * if (!isHealthy) {
   *   await kernel.stop();
   *   throw new Error('Application failed health checks');
   * }
   *
   * console.log('Application started and healthy');
   * ```
   *
   * @example
   * ```typescript
   * // Startup with metrics
   * const kernel = new Kernel([
   *   new MetricsServiceProvider(),
   *   new DatabaseServiceProvider()
   * ]);
   *
   * const startTime = Date.now();
   *
   * try {
   *   const app = await kernel.start();
   *
   *   const metrics = app.getContainer().resolve<MetricsService>('metrics');
   *   metrics.histogram('app.startup.duration', Date.now() - startTime);
   *   metrics.increment('app.startup.success');
   *
   *   return app;
   *
   * } catch (error) {
   *   const metrics = kernel.getApplication().getContainer()
   *     .resolve<MetricsService>('metrics');
   *   metrics.increment('app.startup.failure');
   *   throw error;
   * }
   * ```
   */
  public async start(): Promise<Application> {
    for (const provider of this.serviceProviders) {
      this.application.register(provider)
    }

    await this.application.run()
    return this.application
  }

  /**
   * Stops the application gracefully by shutting down all services.
   *
   * This method delegates to the application's shutdown() method, which
   * handles graceful shutdown of all services in reverse dependency order.
   * The kernel ensures proper cleanup and resource deallocation.
   *
   * @throws {ApplicationShutdownException} If some services fail to shutdown cleanly
   * @returns Promise that resolves when shutdown is complete
   *
   * @example
   * ```typescript
   * // Basic shutdown
   * const kernel = new Kernel([new DatabaseServiceProvider()]);
   * const app = await kernel.start();
   *
   * // ... application runtime ...
   *
   * try {
   *   await kernel.stop();
   *   console.log('Application stopped successfully');
   * } catch (error) {
   *   console.error('Shutdown failed:', error);
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Graceful shutdown with signal handling
   * const kernel = new Kernel([
   *   new ConfigServiceProvider(),
   *   new DatabaseServiceProvider(),
   *   new HttpServiceProvider()
   * ]);
   *
   * const app = await kernel.start();
   *
   * // Setup graceful shutdown
   * const gracefulShutdown = async (signal: string) => {
   *   console.log(`Received ${signal}, shutting down gracefully...`);
   *
   *   try {
   *     await kernel.stop();
   *     console.log('Graceful shutdown completed');
   *     process.exit(0);
   *   } catch (error) {
   *     console.error('Shutdown failed:', error);
   *     process.exit(1);
   *   }
   * };
   *
   * process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
   * process.on('SIGINT', () => gracefulShutdown('SIGINT'));
   * ```
   *
   * @example
   * ```typescript
   * // Shutdown with cleanup verification
   * const kernel = new Kernel([
   *   new DatabaseServiceProvider(),
   *   new CacheServiceProvider()
   * ]);
   *
   * const app = await kernel.start();
   *
   * try {
   *   await kernel.stop();
   *
   *   // Verify resources are cleaned up
   *   const database = app.getContainer().resolve<DatabaseService>('database');
   *   const cache = app.getContainer().resolve<CacheService>('cache');
   *
   *   console.log('Database disconnected:', !database.isConnected());
   *   console.log('Cache cleared:', cache.isEmpty());
   *
   * } catch (error) {
   *   console.error('Shutdown failed, forcing cleanup:', error);
   *   // Force cleanup if graceful shutdown fails
   *   process.exit(1);
   * }
   * ```
   */
  public async stop(): Promise<void> {
    await this.application.shutdown()
  }
}

/**
 * @fileoverview
 *
 * ## Kernel Usage Patterns
 *
 * ### 1. Web Application Kernel
 * ```typescript
 * class WebApplicationKernel extends Kernel {
 *   constructor() {
 *     super([
 *       new ConfigServiceProvider(),
 *       new LoggingServiceProvider(),
 *       new DatabaseServiceProvider(),
 *       new AuthServiceProvider(),
 *       new HttpServiceProvider()
 *     ]);
 *   }
 *
 *   async startWebServer(port: number = 3000) {
 *     const app = await this.start();
 *
 *     const httpServer = app.getContainer().resolve<HttpServer>('httpServer');
 *     httpServer.listen(port);
 *
 *     console.log(`Web server started on port ${port}`);
 *     return app;
 *   }
 * }
 *
 * // Usage
 * const kernel = new WebApplicationKernel();
 * await kernel.startWebServer(3000);
 * ```
 *
 * ### 2. CLI Application Kernel
 * ```typescript
 * class CLIKernel extends Kernel {
 *   constructor(command: string) {
 *     const providers = [
 *       new ConfigServiceProvider(),
 *       new DatabaseServiceProvider(),
 *       new CLServiceProvider()
 *     ];
 *
 *     // Add command-specific providers
 *     if (command === 'migrate') {
 *       providers.push(new MigrationServiceProvider());
 *     } else if (command === 'import') {
 *       providers.push(new ImportServiceProvider());
 *     }
 *
 *     super(providers);
 *   }
 *
 *   async executeCommand(command: string, args: string[]) {
 *     try {
 *       const app = await this.start();
 *
 *       const commandService = app.getContainer()
 *         .resolve<CommandService>('commandService');
 *
 *       const result = await commandService.execute(command, args);
 *       console.log(result);
 *
 *       await this.stop();
 *       return 0;
 *
 *     } catch (error) {
 *       console.error('Command failed:', error);
 *       await this.stop();
 *       return 1;
 *     }
 *   }
 * }
 *
 * // Usage
 * const kernel = new CLIKernel(process.argv[2]);
 * const exitCode = await kernel.executeCommand(process.argv[2], process.argv.slice(3));
 * process.exit(exitCode);
 * ```
 *
 * ### 3. Test Kernel
 * ```typescript
 * class TestKernel extends Kernel {
 *   constructor() {
 *     super([
 *       new TestConfigServiceProvider(),
 *       new InMemoryDatabaseServiceProvider(),
 *       new MockEmailServiceProvider(),
 *       new TestLoggerServiceProvider()
 *     ]);
 *   }
 *
 *   static async createForTest() {
 *     const kernel = new TestKernel();
 *     const app = await kernel.start();
 *     return { kernel, app };
 *   }
 *
 *   async reset() {
 *     const app = this.getApplication();
 *     const database = app.getContainer().resolve<TestDatabase>('database');
 *     await database.truncateAll();
 *   }
 * }
 *
 * // Usage in tests
 * describe('Integration Tests', () => {
 *   let kernel: TestKernel;
 *   let app: Application;
 *
 *   beforeAll(async () => {
 *     ({ kernel, app } = await TestKernel.createForTest());
 *   });
 *
 *   afterAll(async () => {
 *     await kernel.stop();
 *   });
 *
 *   beforeEach(async () => {
 *     await kernel.reset();
 *   });
 *
 *   test('should process user data', async () => {
 *     const userService = app.getContainer().resolve<UserService>('userService');
 *     // Test implementation
 *   });
 * });
 * ```
 *
 * ### 4. Microservice Kernel
 * ```typescript
 * class MicroserviceKernel extends Kernel {
 *   constructor(serviceName: string) {
 *     super([
 *       new ConfigServiceProvider(),
 *       new LoggingServiceProvider(),
 *       new MetricsServiceProvider(),
 *       new HealthCheckServiceProvider(),
 *       new MessageQueueServiceProvider(),
 *       new HttpServiceProvider()
 *     ]);
 *
 *     // Add service-specific providers
 *     this.addServiceSpecificProviders(serviceName);
 *   }
 *
 *   private addServiceSpecificProviders(serviceName: string) {
 *     const serviceProviders = {
 *       'user-service': [new UserServiceProvider(), new AuthServiceProvider()],
 *       'payment-service': [new PaymentServiceProvider(), new BillingServiceProvider()],
 *       'notification-service': [new NotificationServiceProvider(), new EmailServiceProvider()]
 *     };
 *
 *     const providers = serviceProviders[serviceName] || [];
 *     providers.forEach(provider => this.registerServiceProvider(provider));
 *   }
 *
 *   async startMicroservice(port: number) {
 *     const app = await this.start();
 *
 *     // Setup health checks
 *     const healthCheck = app.getContainer().resolve<HealthCheckService>('healthCheck');
 *     await healthCheck.registerChecks();
 *
 *     // Start HTTP server
 *     const httpServer = app.getContainer().resolve<HttpServer>('httpServer');
 *     httpServer.listen(port);
 *
 *     console.log(`Microservice started on port ${port}`);
 *     return app;
 *   }
 * }
 *
 * // Usage
 * const serviceName = process.env.SERVICE_NAME || 'user-service';
 * const kernel = new MicroserviceKernel(serviceName);
 * await kernel.startMicroservice(process.env.PORT || 3000);
 * ```
 *
 * ### 5. Environment-Specific Kernels
 * ```typescript
 * class KernelFactory {
 *   static createForEnvironment(env: string): Kernel {
 *     const commonProviders = [
 *       new ConfigServiceProvider(),
 *       new LoggingServiceProvider()
 *     ];
 *
 *     switch (env) {
 *       case 'production':
 *         return new Kernel([
 *           ...commonProviders,
 *           new ProductionDatabaseServiceProvider(),
 *           new RedisServiceProvider(),
 *           new MetricsServiceProvider(),
 *           new AlertingServiceProvider()
 *         ]);
 *
 *       case 'staging':
 *         return new Kernel([
 *           ...commonProviders,
 *           new StagingDatabaseServiceProvider(),
 *           new MetricsServiceProvider()
 *         ]);
 *
 *       case 'development':
 *         return new Kernel([
 *           ...commonProviders,
 *           new DevelopmentDatabaseServiceProvider(),
 *           new DevToolsServiceProvider()
 *         ]);
 *
 *       case 'test':
 *         return new Kernel([
 *           ...commonProviders,
 *           new InMemoryDatabaseServiceProvider(),
 *           new MockEmailServiceProvider()
 *         ]);
 *
 *       default:
 *         throw new Error(`Unknown environment: ${env}`);
 *     }
 *   }
 * }
 *
 * // Usage
 * const env = process.env.NODE_ENV || 'development';
 * const kernel = KernelFactory.createForEnvironment(env);
 * await kernel.start();
 * ```
 */
