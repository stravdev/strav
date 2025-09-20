/**
 * ServiceManager Examples
 * 
 * This file contains examples for using the ServiceManager class
 * with executable TypeScript code.
 */

import { Container } from '../src/Container/Container';
import { ServiceManager } from '../src/Services/ServiceManager';
import { ServiceProvider } from '../src/Contracts/ServiceProvider';
import { GroupedShutdownException } from '../src/Exceptions/ServiceExceptions';

// Example service providers for demonstration
class ConfigServiceProvider implements ServiceProvider {
  private registered = false;
  private booted = false;

  getProviderName(): string {
    return 'ConfigServiceProvider';
  }

  register(container: Container): void {
    this.registered = true;
    container.registerValue('config', {
      database: { host: 'localhost', port: 5432 },
      app: { name: 'TestApp', version: '1.0.0' }
    });
    console.log('ConfigServiceProvider registered');
  }

  boot(container: Container): void {
    this.booted = true;
    console.log('ConfigServiceProvider booted');
  }

  shutdown(container: Container): void {
    console.log('ConfigServiceProvider shutdown');
  }

  getProvidedServices() {
    return ['config'];
  }

  isRegistered(): boolean { return this.registered; }
  isBooted(): boolean { return this.booted; }
}

class DatabaseServiceProvider implements ServiceProvider {
  private registered = false;
  private booted = false;

  getProviderName(): string {
    return 'DatabaseServiceProvider';
  }

  register(container: Container): void {
    this.registered = true;
    container.registerFactory('database', (config: any) => ({
      connect: () => `Connected to ${config.database.host}:${config.database.port}`,
      query: (sql: string) => `Query result: ${sql}`
    }), ['config']);
    console.log('DatabaseServiceProvider registered');
  }

  boot(container: Container): void {
    this.booted = true;
    const db = container.resolve<any>('database');
    console.log('DatabaseServiceProvider booted:', db.connect());
  }

  shutdown(container: Container): void {
    console.log('DatabaseServiceProvider shutdown');
  }

  getDependencies() {
    return ['config'];
  }

  getProvidedServices() {
    return ['database', 'migrationRunner'];
  }

  isRegistered(): boolean { return this.registered; }
  isBooted(): boolean { return this.booted; }
}

class EmailServiceProvider implements ServiceProvider {
  private registered = false;
  private booted = false;

  getProviderName(): string {
    return 'EmailServiceProvider';
  }

  register(container: Container): void {
    this.registered = true;
    container.registerFactory('email', (config: any, database: any) => ({
      send: (to: string, subject: string) => `Email sent to ${to}: ${subject}`,
      getConfig: () => config
    }), ['config', 'database']);
    console.log('EmailServiceProvider registered');
  }

  boot(container: Container): void {
    this.booted = true;
    console.log('EmailServiceProvider booted');
  }

  shutdown(container: Container): void {
    console.log('EmailServiceProvider shutdown');
  }

  getDependencies() {
    return ['database', 'config'];
  }

  getProvidedServices() {
    return ['email'];
  }

  isRegistered(): boolean { return this.registered; }
  isBooted(): boolean { return this.booted; }
}

class AuthServiceProvider implements ServiceProvider {
  private registered = false;
  private booted = false;

  getProviderName(): string {
    return 'AuthServiceProvider';
  }

  register(container: Container): void {
    this.registered = true;
    container.registerFactory('auth', (config: any) => ({
      login: (username: string) => `User ${username} logged in`,
      logout: () => 'User logged out'
    }), ['config']);
    console.log('AuthServiceProvider registered');
  }

  boot(container: Container): void {
    this.booted = true;
    console.log('AuthServiceProvider booted');
  }

  shutdown(container: Container): void {
    console.log('AuthServiceProvider shutdown');
  }

  getDependencies() {
    return ['config'];
  }

  getProvidedServices() {
    return ['auth'];
  }

  isRegistered(): boolean { return this.registered; }
  isBooted(): boolean { return this.booted; }
}

class UtilityServiceProvider implements ServiceProvider {
  private registered = false;

  getProviderName(): string {
    return 'UtilityServiceProvider';
  }

  register(container: Container): void {
    this.registered = true;
    container.registerValue('utils', {
      hash: (str: string) => str.length,
      uuid: () => Math.random().toString(36)
    });
    console.log('UtilityServiceProvider registered');
  }

  getProvidedServices() {
    return ['utils'];
  }

  isRegistered(): boolean { return this.registered; }
}

/**
 * Basic Usage
 * 
 * Shows basic service provider registration and management
 */
export async function basicUsage(): Promise<void> {
  console.log('=== Basic Usage ===');
  
  const container = new Container();
  const serviceManager = new ServiceManager(container);

  // Register individual service providers
  serviceManager.register(new DatabaseServiceProvider());
  serviceManager.register(new EmailServiceProvider());
  serviceManager.register(new AuthServiceProvider());

  // Check registration status
  console.log('Providers before registerAll:', serviceManager.getRegisteredProviders().length); // 0

  // Register all providers
  await serviceManager.registerAll();
  console.log('Providers after registerAll:', serviceManager.getRegisteredProviders().length); // 3
}

/**
 * Service Provider Registration
 * 
 * Shows different ways to register multiple providers
 */
export async function serviceProviderRegistration(): Promise<void> {
  console.log('=== Service Provider Registration ===');
  
  const container = new Container();
  const serviceManager = new ServiceManager(container);

  // Register multiple providers at once
  const providers = [
    new ConfigServiceProvider(),
    new DatabaseServiceProvider(),
    new EmailServiceProvider(),
    new AuthServiceProvider()
  ];

  providers.forEach(provider => serviceManager.register(provider));

  // Or register them individually
  serviceManager.register(new UtilityServiceProvider());

  console.log('Providers queued for registration');

  // All providers are queued for registration
  await serviceManager.registerAll();
  console.log('All providers registered:', serviceManager.getRegisteredProviders().length);
}

/**
 * Service Provider Booting
 * 
 * Shows the boot process with dependency handling
 */
export async function serviceProviderBooting(): Promise<void> {
  console.log('=== Service Provider Booting ===');
  
  const container = new Container();
  const serviceManager = new ServiceManager(container);

  // Some providers have boot methods, others don't
  serviceManager.register(new DatabaseServiceProvider()); // has boot()
  serviceManager.register(new ConfigServiceProvider());   // has boot()
  serviceManager.register(new UtilityServiceProvider());  // no boot()

  await serviceManager.registerAll();
  console.log('Registered providers:', serviceManager.getRegisteredProviders().length); // 3

  await serviceManager.bootAll();
  console.log('Booted providers:', serviceManager.getBootedProviders().length); // 2 (only those with boot())

  console.log('Boot process respects dependencies - Config boots first, then Database');
}

/**
 * Graceful Shutdown
 * 
 * Shows application shutdown handling
 */
export async function gracefulShutdown(): Promise<void> {
  console.log('=== Graceful Shutdown ===');
  
  const container = new Container();
  const serviceManager = new ServiceManager(container);

  // Register and boot providers
  serviceManager.register(new ConfigServiceProvider());
  serviceManager.register(new DatabaseServiceProvider());
  serviceManager.register(new EmailServiceProvider());

  await serviceManager.registerAll();
  await serviceManager.bootAll();

  console.log('Application started with providers:', serviceManager.getBootedProviders().length);

  // Graceful application shutdown
  try {
    await serviceManager.shutdownAll();
    console.log('Application shut down successfully');
  } catch (error) {
    if (error instanceof GroupedShutdownException) {
      console.error('Some providers failed to shutdown:', error.failures);
      // Application should still terminate - failures are logged
    }
  }

  // Manager state is reset
  console.log('Registered providers after shutdown:', serviceManager.getRegisteredProviders().length); // 0
  console.log('Booted providers after shutdown:', serviceManager.getBootedProviders().length); // 0
}

/**
 * Provider Information
 * 
 * Shows how to get information about registered and booted providers
 */
export async function providerInformation(): Promise<void> {
  console.log('=== Provider Information ===');
  
  const container = new Container();
  const serviceManager = new ServiceManager(container);

  serviceManager.register(new DatabaseServiceProvider());
  serviceManager.register(new EmailServiceProvider());

  console.log('Registered providers before registerAll:', serviceManager.getRegisteredProviders().length); // 0

  await serviceManager.registerAll();
  console.log('Registered providers after registerAll:', serviceManager.getRegisteredProviders().length); // 2

  // Safe to modify without affecting internal state
  const providers = serviceManager.getRegisteredProviders();
  console.log('Provider names:', providers.map(p => p.getProviderName()));

  // Boot some providers
  await serviceManager.bootAll();
  console.log('Booted providers:', serviceManager.getBootedProviders().length);
}

/**
 * Provider Naming
 * 
 * Shows different provider naming strategies
 */
export function providerNaming(): void {
  console.log('=== Provider Naming ===');
  
  // Provider with explicit name
  class ExplicitNameProvider implements ServiceProvider {
    getProviderName(): string { 
      return 'DatabaseServiceProvider'; 
    }
    register(container: Container): void {
      console.log('ExplicitNameProvider registered');
    }
  }

  // Provider without explicit name (uses constructor name)
  class EmailProvider implements ServiceProvider {
    getProviderName(): string {
      return this.constructor.name;
    }
    register(container: Container): void {
      console.log('EmailProvider registered');
    }
  }

  const explicitProvider = new ExplicitNameProvider();
  const emailProvider = new EmailProvider();

  console.log('Explicit provider name:', explicitProvider.getProviderName());
  console.log('Constructor-based name:', emailProvider.getProviderName());
}

/**
 * Provider Dependencies
 * 
 * Shows dependency declaration and resolution
 */
export async function providerDependencies(): Promise<void> {
  console.log('=== Provider Dependencies ===');
  
  const container = new Container();
  const serviceManager = new ServiceManager(container);

  // Register providers with dependencies
  serviceManager.register(new ConfigServiceProvider());    // No dependencies
  serviceManager.register(new DatabaseServiceProvider());  // Depends on config
  serviceManager.register(new EmailServiceProvider());     // Depends on database, config

  await serviceManager.registerAll();
  await serviceManager.bootAll();

  console.log('Boot order respected dependencies:');
  console.log('1. ConfigServiceProvider (no dependencies)');
  console.log('2. DatabaseServiceProvider (depends on config)');
  console.log('3. EmailServiceProvider (depends on database, config)');

  // Test the services work
  const email = container.resolve<any>('email');
  console.log('Email service test:', email.send('user@example.com', 'Test Subject'));
}

/**
 * Advanced Application Setup
 * 
 * Shows a complete application setup pattern
 */
export async function advancedApplicationSetup(): Promise<{ container: Container, serviceManager: ServiceManager }> {
  console.log('=== Advanced Application Setup ===');
  
  const container = new Container();
  const serviceManager = new ServiceManager(container);

  // Register all service providers
  serviceManager.register(new ConfigServiceProvider());
  serviceManager.register(new DatabaseServiceProvider());
  serviceManager.register(new AuthServiceProvider());
  serviceManager.register(new EmailServiceProvider());
  serviceManager.register(new UtilityServiceProvider());

  try {
    // Registration phase
    await serviceManager.registerAll();
    console.log('Registration phase completed');

    // Boot phase
    await serviceManager.bootAll();
    console.log('Boot phase completed');

    console.log('Application started successfully');
    return { container, serviceManager };
  } catch (error) {
    console.error('Failed to start application:', error);
    throw error;
  }
}

/**
 * Environment-Specific Provider Registration
 * 
 * Shows how to register different providers based on environment
 */
export function environmentSpecificProviders(environment: string): ServiceManager {
  console.log('=== Environment-Specific Providers ===');
  console.log(`Setting up for environment: ${environment}`);
  
  const container = new Container();
  const serviceManager = new ServiceManager(container);

  // Core providers (always registered)
  serviceManager.register(new ConfigServiceProvider());

  // Environment-specific providers
  if (environment === 'production') {
    console.log('Registering production providers');
    serviceManager.register(new DatabaseServiceProvider());
    serviceManager.register(new EmailServiceProvider());
  } else if (environment === 'test') {
    console.log('Registering test providers');
    serviceManager.register(new UtilityServiceProvider());
  } else {
    console.log('Registering development providers');
    serviceManager.register(new DatabaseServiceProvider());
    serviceManager.register(new AuthServiceProvider());
  }

  return serviceManager;
}

/**
 * Error Handling and Recovery
 * 
 * Shows error handling patterns with retry logic
 */
export async function errorHandlingAndRecovery(maxRetries = 3): Promise<{ container: Container, serviceManager: ServiceManager }> {
  console.log('=== Error Handling and Recovery ===');
  
  const container = new Container();
  const serviceManager = new ServiceManager(container);

  // Register providers
  serviceManager.register(new ConfigServiceProvider());
  serviceManager.register(new DatabaseServiceProvider());

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Startup attempt ${attempt}`);
      
      await serviceManager.registerAll();
      await serviceManager.bootAll();
      
      console.log('Application started successfully');
      return { container, serviceManager };
    } catch (error) {
      console.error(`Startup attempt ${attempt} failed:`, error);

      if (attempt < maxRetries) {
        console.log('Retrying in 1 second...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Reset state for retry
        try {
          await serviceManager.shutdownAll();
        } catch (shutdownError) {
          console.warn('Error during cleanup:', shutdownError);
        }
      } else {
        throw new Error(`Failed to start application after ${maxRetries} attempts`);
      }
    }
  }

  throw new Error('Unreachable code');
}

// =============================================================================
// Example Runner
// =============================================================================

/**
 * Run all service manager examples
 */
export async function runAllExamples(): Promise<void> {
  console.log('Running ServiceManager Examples...\n');
  
  try {
    await basicUsage();
    console.log();
    
    await serviceProviderRegistration();
    console.log();
    
    await serviceProviderBooting();
    console.log();
    
    await gracefulShutdown();
    console.log();
    
    await providerInformation();
    console.log();
    
    providerNaming();
    console.log();
    
    await providerDependencies();
    console.log();
    
    const { container, serviceManager } = await advancedApplicationSetup();
    await serviceManager.shutdownAll();
    console.log();
    
    const envManager = environmentSpecificProviders('development');
    console.log();
    
    const { container: retryContainer, serviceManager: retryManager } = await errorHandlingAndRecovery(2);
    await retryManager.shutdownAll();
    console.log();
    
    console.log('All ServiceManager examples completed successfully!');
    
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples();
}