/**
 * Application Class Examples
 *
 * This file contains comprehensive usage examples for the Application class,
 * demonstrating various patterns and use cases with executable TypeScript code.
 */

import {
  Application,
  Container,
  ServiceProvider,
  ApplicationBootException,
  ApplicationShutdownException,
  GroupedShutdownException,
} from '@strav/kernel'

// Example service providers for demonstration
class ConfigServiceProvider implements ServiceProvider {
  private registered = false
  private booted = false

  getProviderName(): string {
    return 'ConfigServiceProvider'
  }

  register(container: Container): void {
    this.registered = true
    container.registerValue('config', {
      database: { host: 'localhost', port: 5432 },
      app: { name: 'TestApp', version: '1.0.0' },
    })
    console.log('ConfigServiceProvider registered')
  }

  boot(container: Container): void {
    this.booted = true
    console.log('ConfigServiceProvider booted')
  }

  shutdown(container: Container): void {
    console.log('ConfigServiceProvider shutdown')
  }

  getProvidedServices() {
    return ['config']
  }

  isRegistered(): boolean {
    return this.registered
  }
  isBooted(): boolean {
    return this.booted
  }
}

class DatabaseServiceProvider implements ServiceProvider {
  private registered = false
  private booted = false

  getProviderName(): string {
    return 'DatabaseServiceProvider'
  }

  register(container: Container): void {
    this.registered = true
    container.registerFactory(
      'database',
      (config: any) => ({
        connect: () => `Connected to ${config.database.host}:${config.database.port}`,
        query: (sql: string) => `Query result: ${sql}`,
        isConnected: () => true,
      }),
      ['config']
    )
    console.log('DatabaseServiceProvider registered')
  }

  boot(container: Container): void {
    this.booted = true
    const db = container.resolve<any>('database')
    console.log('DatabaseServiceProvider booted:', db.connect())
  }

  shutdown(container: Container): void {
    console.log('DatabaseServiceProvider shutdown')
  }

  getDependencies() {
    return ['config']
  }

  getProvidedServices() {
    return ['database']
  }

  isRegistered(): boolean {
    return this.registered
  }
  isBooted(): boolean {
    return this.booted
  }
}

class EmailServiceProvider implements ServiceProvider {
  private registered = false
  private booted = false

  getProviderName(): string {
    return 'EmailServiceProvider'
  }

  register(container: Container): void {
    this.registered = true
    container.registerFactory(
      'email',
      (config: any, database: any) => ({
        send: (to: string, subject: string) => `Email sent to ${to}: ${subject}`,
        getConfig: () => config,
      }),
      ['config', 'database']
    )
    console.log('EmailServiceProvider registered')
  }

  boot(container: Container): void {
    this.booted = true
    console.log('EmailServiceProvider booted')
  }

  shutdown(container: Container): void {
    console.log('EmailServiceProvider shutdown')
  }

  getDependencies() {
    return ['database', 'config']
  }

  getProvidedServices() {
    return ['email']
  }

  isRegistered(): boolean {
    return this.registered
  }
  isBooted(): boolean {
    return this.booted
  }
}

class AuthServiceProvider implements ServiceProvider {
  private registered = false
  private booted = false

  getProviderName(): string {
    return 'AuthServiceProvider'
  }

  register(container: Container): void {
    this.registered = true
    container.registerFactory(
      'auth',
      (config: any) => ({
        login: (username: string) => `User ${username} logged in`,
        logout: () => 'User logged out',
      }),
      ['config']
    )
    console.log('AuthServiceProvider registered')
  }

  boot(container: Container): void {
    this.booted = true
    console.log('AuthServiceProvider booted')
  }

  shutdown(container: Container): void {
    console.log('AuthServiceProvider shutdown')
  }

  getDependencies() {
    return ['config']
  }

  getProvidedServices() {
    return ['auth']
  }

  isRegistered(): boolean {
    return this.registered
  }
  isBooted(): boolean {
    return this.booted
  }
}

class UserService {
  constructor(
    private database: any,
    private auth: any
  ) {}

  async createUser(userData: { name: string }): Promise<void> {
    console.log(`Creating user: ${userData.name}`)
    this.database.query(`INSERT INTO users (name) VALUES ('${userData.name}')`)
  }
}

class CoreServiceProvider implements ServiceProvider {
  getProviderName(): string {
    return 'CoreServiceProvider'
  }

  register(container: Container): void {
    container.registerValue('core', { version: '1.0.0' })
    console.log('CoreServiceProvider registered')
  }

  getProvidedServices() {
    return ['core']
  }
}

class ProductionServiceProvider implements ServiceProvider {
  getProviderName(): string {
    return 'ProductionServiceProvider'
  }

  register(container: Container): void {
    container.registerValue('production', { mode: 'production' })
    console.log('ProductionServiceProvider registered')
  }

  getProvidedServices() {
    return ['production']
  }
}

class DevelopmentServiceProvider implements ServiceProvider {
  getProviderName(): string {
    return 'DevelopmentServiceProvider'
  }

  register(container: Container): void {
    container.registerValue('development', { mode: 'development', debug: true })
    console.log('DevelopmentServiceProvider registered')
  }

  getProvidedServices() {
    return ['development']
  }
}

class MetricsServiceProvider implements ServiceProvider {
  getProviderName(): string {
    return 'MetricsServiceProvider'
  }

  register(container: Container): void {
    container.registerValue('metrics', { enabled: true })
    console.log('MetricsServiceProvider registered')
  }

  getProvidedServices() {
    return ['metrics']
  }
}

/**
 * Simple Application Startup
 *
 * Shows basic application setup and startup
 */
export async function simpleApplicationStartup(): Promise<void> {
  console.log('=== Simple Application Startup ===')

  const app = new Application()

  // Register service providers
  app
    .register(new ConfigServiceProvider())
    .register(new DatabaseServiceProvider())
    .register(new EmailServiceProvider())

  try {
    // Start the application
    await app.run() // Equivalent to bootstrap() then boot()

    console.log('Application started:', app.isRunning()) // true

    // Use services
    const container = app.getContainer()
    const database = container.resolve<any>('database')
    console.log('Database test:', database.query('SELECT * FROM users'))
  } catch (error) {
    console.error('Failed to start application:', error)
  } finally {
    // Graceful shutdown
    await app.shutdown()
  }
}

/**
 * Step-by-step Lifecycle Management
 *
 * Shows detailed control over application lifecycle phases
 */
export async function stepByStepLifecycleManagement(): Promise<void> {
  console.log('=== Step-by-step Lifecycle Management ===')

  const app = new Application()

  // Registration phase
  app.register(new DatabaseServiceProvider())
  app.register(new AuthServiceProvider())
  console.log('After registration - isRunning:', app.isRunning()) // false

  // Bootstrap phase
  await app.bootstrap()
  console.log('After bootstrap - isRunning:', app.isRunning()) // false (registered but not booted)

  // Boot phase
  await app.boot()
  console.log('After boot - isRunning:', app.isRunning()) // true (fully operational)

  // Shutdown phase
  await app.shutdown()
  console.log('After shutdown - isRunning:', app.isRunning()) // false (shutdown complete)
}

/**
 * Manual Service Resolution
 *
 * Shows how to manually resolve services from the container
 */
export async function manualServiceResolution(): Promise<void> {
  console.log('=== Manual Service Resolution ===')

  const app = new Application()
  app.register(new DatabaseServiceProvider())

  await app.run()

  // Manual service resolution
  const container = app.getContainer()
  const database = container.resolve<any>('database')
  console.log('Database service resolved:', database.isConnected())

  // Check service availability
  if (container.has('database')) {
    console.log('Database service is available')
  }

  if (container.has('optionalService')) {
    const service = container.resolve('optionalService')
    console.log('Optional service found')
  } else {
    console.log('Optional service not available')
  }

  await app.shutdown()
}

/**
 * Container Isolation
 *
 * Shows that each application has isolated containers
 */
export function containerIsolation(): void {
  console.log('=== Container Isolation ===')

  // Each application has isolated containers
  const app1 = new Application()
  const app2 = new Application()
  console.log('Containers are isolated:', app1.getContainer() !== app2.getContainer()) // true
}

/**
 * Method Chaining
 *
 * Shows method chaining for clean configuration
 */
export async function methodChaining(): Promise<void> {
  console.log('=== Method Chaining ===')

  const app = new Application()

  // Method chaining for clean configuration
  app
    .register(new ConfigServiceProvider())
    .register(new DatabaseServiceProvider())
    .register(new EmailServiceProvider())
    .register(new AuthServiceProvider())

  // Providers are queued, not yet registered
  console.log(
    'Providers queued before bootstrap:',
    app.getServiceManager().getRegisteredProviders().length
  ) // 0

  await app.bootstrap()
  console.log(
    'Providers registered after bootstrap:',
    app.getServiceManager().getRegisteredProviders().length
  ) // 4

  await app.shutdown()
}

/**
 * Conditional Provider Registration
 *
 * Shows environment-based provider registration
 */
export async function conditionalProviderRegistration(
  environment = 'development',
  enableMetrics = false
): Promise<void> {
  console.log('=== Conditional Provider Registration ===')
  console.log(`Environment: ${environment}, Metrics: ${enableMetrics}`)

  const app = new Application()

  app.register(new CoreServiceProvider())

  if (environment === 'production') {
    app.register(new ProductionServiceProvider())
  } else {
    app.register(new DevelopmentServiceProvider())
  }

  if (enableMetrics) {
    app.register(new MetricsServiceProvider())
  }

  await app.run()

  const container = app.getContainer()
  console.log('Core service available:', container.has('core'))
  console.log('Production service available:', container.has('production'))
  console.log('Development service available:', container.has('development'))
  console.log('Metrics service available:', container.has('metrics'))

  await app.shutdown()
}

/**
 * Basic Bootstrap
 *
 * Shows the bootstrap phase in detail
 */
export async function basicBootstrap(): Promise<void> {
  console.log('=== Basic Bootstrap ===')

  const app = new Application()
  app.register(new ConfigServiceProvider())
  app.register(new DatabaseServiceProvider())

  try {
    await app.bootstrap()
    console.log('Services registered successfully')

    // Services are now available for resolution
    const config = app.getContainer().resolve<any>('config')
    console.log('Config loaded:', config.app.name)
  } catch (error) {
    console.error('Bootstrap failed:', error)
  } finally {
    await app.shutdown()
  }
}

/**
 * Method Chaining with Bootstrap
 *
 * Shows method chaining that includes bootstrap
 */
export async function methodChainingWithBootstrap(): Promise<void> {
  console.log('=== Method Chaining with Bootstrap ===')

  const app = new Application()

  const bootstrappedApp = await app
    .register(new ConfigServiceProvider())
    .register(new DatabaseServiceProvider())
    .bootstrap()

  console.log('Same app instance returned:', bootstrappedApp === app) // true
  console.log('App is bootstrapped but not booted:', !app.isRunning())

  await app.shutdown()
}

/**
 * Basic Boot
 *
 * Shows the boot phase with error handling
 */
export async function basicBoot(): Promise<void> {
  console.log('=== Basic Boot ===')

  const app = new Application()
  app.register(new DatabaseServiceProvider())
  app.register(new EmailServiceProvider())

  try {
    await app.bootstrap()
    await app.boot()

    console.log('Application is running:', app.isRunning()) // true

    // Services are now fully initialized
    const database = app.getContainer().resolve<any>('database')
    console.log('Database connected:', database.isConnected()) // true
  } catch (error) {
    if (error instanceof ApplicationBootException) {
      console.error('Boot failed:', error.message)
      console.error('Underlying cause:', error.cause)
    }
  } finally {
    await app.shutdown()
  }
}

/**
 * Boot with Dependency Validation
 *
 * Shows validation before booting
 */
export async function bootWithDependencyValidation(): Promise<void> {
  console.log('=== Boot with Dependency Validation ===')

  const app = new Application()
  app.register(new ConfigServiceProvider())
  app.register(new DatabaseServiceProvider())

  await app.bootstrap()

  // Verify critical services before booting
  const container = app.getContainer()
  if (!container.has('database') || !container.has('config')) {
    throw new Error('Critical services not registered')
  }

  console.log('All critical services are available')
  await app.boot()
  console.log('Application booted successfully')

  await app.shutdown()
}

/**
 * Provider Introspection
 *
 * Shows how to inspect registered and booted providers
 */
export async function providerIntrospection(): Promise<void> {
  console.log('=== Provider Introspection ===')

  const app = new Application()
  app.register(new DatabaseServiceProvider())
  app.register(new EmailServiceProvider())

  await app.bootstrap()

  const serviceManager = app.getServiceManager()

  // Inspect registered providers
  const registered = serviceManager.getRegisteredProviders()
  console.log(`Registered ${registered.length} providers`)

  await app.boot()

  // Inspect booted providers
  const booted = serviceManager.getBootedProviders()
  console.log(`Booted ${booted.length} providers`)

  await app.shutdown()
}

/**
 * Basic Shutdown
 *
 * Shows graceful shutdown handling
 */
export async function basicShutdown(): Promise<Application> {
  console.log('=== Basic Shutdown ===')

  const app = new Application()
  app.register(new ConfigServiceProvider())
  app.register(new DatabaseServiceProvider())

  await app.run()
  console.log('Application started')

  // Graceful shutdown
  await app.shutdown()
  console.log('Application shut down successfully')

  return app
}

/**
 * Shutdown with Error Handling
 *
 * Shows error handling during shutdown
 */
export async function shutdownWithErrorHandling(): Promise<void> {
  console.log('=== Shutdown with Error Handling ===')

  const app = new Application()
  app.register(new ConfigServiceProvider())
  app.register(new DatabaseServiceProvider())

  await app.run()

  try {
    await app.shutdown()
    console.log('Shutdown completed successfully')
  } catch (error) {
    if (error instanceof ApplicationShutdownException) {
      console.error('Some services failed to shutdown:', error.message)

      // Access underlying failures if available
      if (error.cause instanceof GroupedShutdownException) {
        const groupedError = error.cause
        for (const failure of groupedError.failures) {
          console.error(`- ${failure.provider}: ${failure.error.message}`)
        }
      }
    }
  }

  console.log('Application stopped:', !app.isRunning()) // true
}

/**
 * Runtime Status
 *
 * Shows application state checking throughout lifecycle
 */
export async function runtimeStatus(): Promise<void> {
  console.log('=== Runtime Status ===')

  const app = new Application()
  console.log('Initial state - isRunning:', app.isRunning()) // false - not started

  app.register(new ConfigServiceProvider())
  console.log('After registration - isRunning:', app.isRunning()) // false - providers registered but not processed

  await app.bootstrap()
  console.log('After bootstrap - isRunning:', app.isRunning()) // false - bootstrapped but not booted

  await app.boot()
  console.log('After boot - isRunning:', app.isRunning()) // true - fully operational

  await app.shutdown()
  console.log('After shutdown - isRunning:', app.isRunning()) // false - shut down
}

/**
 * Health Check Endpoint Simulation
 *
 * Shows how to implement a health check
 */
export function healthCheckEndpoint(app: Application): {
  status: string
  timestamp?: string
  reason?: string
} {
  console.log('=== Health Check Endpoint ===')

  if (app.isRunning()) {
    return { status: 'healthy', timestamp: new Date().toISOString() }
  } else {
    return { status: 'unavailable', reason: 'application not running' }
  }
}

/**
 * Simple Application Startup with Run
 *
 * Shows the run method for complete startup
 */
export async function simpleApplicationStartupWithRun(): Promise<void> {
  console.log('=== Simple Application Startup with Run ===')

  const app = new Application()

  app
    .register(new ConfigServiceProvider())
    .register(new DatabaseServiceProvider())
    .register(new EmailServiceProvider())

  try {
    await app.run()
    console.log('Application started successfully')

    // Application is now ready to serve requests
    const container = app.getContainer()
    const email = container.resolve<any>('email')
    console.log('Email service test:', email.send('user@example.com', 'Welcome!'))
  } catch (error) {
    console.error('Failed to start application:', error)
  } finally {
    await app.shutdown()
  }
}

/**
 * Application Startup with Retry Logic
 *
 * Shows robust startup with retry mechanism
 */
export async function startWithRetry(maxAttempts = 3): Promise<Application> {
  console.log('=== Application Startup with Retry Logic ===')

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const app = new Application()
    app.register(new DatabaseServiceProvider())

    try {
      console.log(`Startup attempt ${attempt}`)
      await app.run()
      console.log('Application started successfully')
      return app
    } catch (error) {
      console.error(`Startup attempt ${attempt} failed:`, error)

      if (attempt < maxAttempts) {
        console.log('Retrying in 1 second...')
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Reset for retry
        try {
          await app.shutdown()
        } catch (shutdownError) {
          console.warn('Error during cleanup:', shutdownError)
        }
      }
    }
  }

  throw new Error(`Failed to start after ${maxAttempts} attempts`)
}

// =============================================================================
// Example Runner
// =============================================================================

/**
 * Run all application examples
 */
export async function runAllExamples(): Promise<void> {
  console.log('Running Application Examples...\n')

  try {
    await simpleApplicationStartup()
    console.log()

    await stepByStepLifecycleManagement()
    console.log()

    await manualServiceResolution()
    console.log()

    containerIsolation()
    console.log()

    await methodChaining()
    console.log()

    await conditionalProviderRegistration('production', true)
    console.log()

    await basicBootstrap()
    console.log()

    await methodChainingWithBootstrap()
    console.log()

    await basicBoot()
    console.log()

    await bootWithDependencyValidation()
    console.log()

    await providerIntrospection()
    console.log()

    const shutdownApp = await basicShutdown()
    console.log('Health check after shutdown:', healthCheckEndpoint(shutdownApp))
    console.log()

    await shutdownWithErrorHandling()
    console.log()

    await runtimeStatus()
    console.log()

    await simpleApplicationStartupWithRun()
    console.log()

    const retryApp = await startWithRetry(2)
    await retryApp.shutdown()
    console.log()

    console.log('All Application examples completed successfully!')
  } catch (error) {
    console.error('Error running examples:', error)
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples()
}
