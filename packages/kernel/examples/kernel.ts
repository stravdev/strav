/**
 * Kernel Class Examples
 * 
 * This file contains comprehensive usage examples for the Kernel class,
 * demonstrating various patterns and use cases with executable TypeScript code.
 */

import { Kernel, ServiceProvider, Container } from '@strav/kernel'

// Example service providers for demonstration
class ConfigServiceProvider implements ServiceProvider {
  getProviderName(): string {
    return 'ConfigServiceProvider';
  }

  register(container: Container): void {
    container.registerValue('config', { database: 'sqlite://memory' })
  }
  
  boot?(container: Container): void {
    console.log('Config service booted');
  }

  getProvidedServices() {
    return ['config'];
  }
}

class DatabaseServiceProvider implements ServiceProvider {
  getProviderName(): string {
    return 'DatabaseServiceProvider';
  }

  register(container: Container): void {
    container.registerValue('database', { connection: 'active' });
  }
  
  boot?(container: Container): void {
    console.log('Database service booted');
  }

  getProvidedServices() {
    return ['database'];
  }
}

class EmailServiceProvider implements ServiceProvider {
  getProviderName(): string {
    return 'EmailServiceProvider';
  }

  register(container: Container): void {
    container.registerValue('email', { smtp: 'configured' });
  }
  
  boot?(container: Container): void {
    console.log('Email service booted');
  }

  getProvidedServices() {
    return ['email'];
  }
}

class UserService {
  async processUsers(): Promise<void> {
    console.log('Processing users...');
  }
}

// =============================================================================
// Basic Kernel Usage
// =============================================================================

/**
 * Simple Kernel Setup
 * 
 * Demonstrates basic kernel initialization with service providers
 */
export async function basicKernelSetup(): Promise<void> {
  console.log('=== Basic Kernel Setup ===');
  
  const kernel = new Kernel([
    new ConfigServiceProvider(),
    new DatabaseServiceProvider(),
    new EmailServiceProvider()
  ]);

  try {
    const app = await kernel.start();
    console.log('Application started successfully');

    // Use services through the application
    const container = app.getContainer();
    const userService = new UserService();
    await userService.processUsers();

  } finally {
    await kernel.stop();
    console.log('Application stopped');
  }
}

/**
 * Dynamic Provider Registration
 * 
 * Shows how to register providers dynamically based on conditions
 */
export async function dynamicProviderRegistration(): Promise<void> {
  console.log('=== Dynamic Provider Registration ===');
  
  const kernel = new Kernel();

  // Core providers
  kernel
    .registerServiceProvider(new ConfigServiceProvider())
    .registerServiceProvider(new DatabaseServiceProvider());

  // Environment-specific providers
  if (process.env.NODE_ENV === 'production') {
    // kernel.registerServiceProvider(new ProductionDatabaseServiceProvider());
    console.log('Would register production database provider');
  } else {
    // kernel.registerServiceProvider(new DevelopmentDatabaseServiceProvider());
    console.log('Would register development database provider');
  }

  const app = await kernel.start();
  await kernel.stop();
}

// =============================================================================
// Kernel Construction
// =============================================================================

/**
 * Empty Kernel for Dynamic Configuration
 * 
 * Demonstrates different ways to construct kernels
 */
export function kernelConstruction(): void {
  console.log('=== Kernel Construction ===');
  
  // Empty kernel for dynamic configuration
  const emptyKernel = new Kernel();
  console.log('Empty kernel created');

  // Kernel with initial providers
  const kernelWithProviders = new Kernel([
    new ConfigServiceProvider(),
    new DatabaseServiceProvider()
  ]);
  console.log('Kernel with initial providers created');

  // Kernel with environment-specific providers
  const providers = [
    new ConfigServiceProvider(),
    new DatabaseServiceProvider()
  ];

  if (process.env.DATABASE_URL) {
    providers.push(new DatabaseServiceProvider());
  }

  const environmentKernel = new Kernel(providers);
  console.log('Environment-specific kernel created');
}

// =============================================================================
// Application Access
// =============================================================================

/**
 * Direct Application Usage
 * 
 * Shows how to access and use the application directly
 */
export async function directApplicationUsage(): Promise<void> {
  console.log('=== Direct Application Usage ===');
  
  const kernel = new Kernel([new DatabaseServiceProvider()]);
  await kernel.start();

  // Access the application for direct container usage
  const app = kernel.getApplication();
  const container = app.getContainer();
  
  // Check application state
  console.log('Application running:', app.isRunning());

  // Access service manager for introspection
  const serviceManager = app.getServiceManager();
  const bootedProviders = serviceManager.getBootedProviders();
  console.log(`${bootedProviders.length} providers booted`);
  
  await kernel.stop();
}

/**
 * Advanced Configuration After Kernel Creation
 * 
 * Demonstrates post-creation configuration
 */
export async function advancedConfiguration(): Promise<void> {
  console.log('=== Advanced Configuration ===');
  
  const kernel = new Kernel();
  const app = kernel.getApplication();

  // Directly register services with the application
  app.register(new ConfigServiceProvider());

  // Or access the container for manual service registration
  const container = app.getContainer();
  container.registerValue('specialConfig', { key: 'value' });

  await kernel.start();
  console.log('Advanced configuration completed');
  await kernel.stop();
}

// =============================================================================
// Service Provider Registration
// =============================================================================

/**
 * Method Chaining
 * 
 * Shows clean configuration using method chaining
 */
export async function methodChaining(): Promise<void> {
  console.log('=== Method Chaining ===');
  
  const kernel = new Kernel();

  // Method chaining for clean configuration
  kernel
    .registerServiceProvider(new ConfigServiceProvider())
    .registerServiceProvider(new DatabaseServiceProvider())
    .registerServiceProvider(new EmailServiceProvider());

  await kernel.start();
  console.log('Method chaining configuration completed');
  await kernel.stop();
}

/**
 * Conditional Provider Registration
 * 
 * Demonstrates conditional provider registration based on configuration
 */
export async function conditionalProviderRegistration(): Promise<void> {
  console.log('=== Conditional Provider Registration ===');
  
  const kernel = new Kernel([new ConfigServiceProvider()]);

  // Simulate configuration
  const config = {
    features: {
      email: true,
      caching: false,
      metrics: true
    }
  };

  // Add optional providers based on configuration
  if (config.features.email) {
    kernel.registerServiceProvider(new EmailServiceProvider());
    console.log('Email provider registered');
  }

  if (config.features.caching) {
    // kernel.registerServiceProvider(new CacheServiceProvider());
    console.log('Cache provider would be registered');
  }

  if (config.features.metrics) {
    // kernel.registerServiceProvider(new MetricsServiceProvider());
    console.log('Metrics provider would be registered');
  }

  await kernel.start();
  console.log('Conditional registration completed');
  await kernel.stop();
}

// =============================================================================
// Error Handling and Lifecycle
// =============================================================================

/**
 * Graceful Shutdown Handling
 * 
 * Demonstrates proper error handling and graceful shutdown
 */
export async function gracefulShutdown(): Promise<void> {
  console.log('=== Graceful Shutdown ===');
  
  const kernel = new Kernel([
    new ConfigServiceProvider(),
    new DatabaseServiceProvider()
  ]);

  try {
    await kernel.start();
    console.log('Application started');
    
    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 100));
    
  } catch (error) {
    console.error('Error during application lifecycle:', error);
  } finally {
    // Always ensure proper cleanup
    await kernel.stop();
    console.log('Application gracefully shut down');
  }
}

/**
 * Error Recovery Patterns
 * 
 * Shows how to handle and recover from errors
 */
export async function errorRecovery(): Promise<void> {
  console.log('=== Error Recovery ===');
  
  const kernel = new Kernel();
  
  try {
    // Register providers that might fail
    kernel.registerServiceProvider(new ConfigServiceProvider());
    
    await kernel.start();
    console.log('Application started successfully');
    
  } catch (error) {
    console.error('Failed to start application:', error);
    
    // Attempt recovery or fallback
    console.log('Attempting recovery...');
    
    // Clean up and try with minimal configuration
    await kernel.stop();
    
    const fallbackKernel = new Kernel([new ConfigServiceProvider()]);
    await fallbackKernel.start();
    console.log('Fallback application started');
    await fallbackKernel.stop();
  }
}

// =============================================================================
// Testing Patterns
// =============================================================================

/**
 * Testing Setup
 * 
 * Demonstrates how to set up kernels for testing
 */
export async function testingSetup(): Promise<void> {
  console.log('=== Testing Setup ===');
  
  // Create a test kernel with mock providers
  const testKernel = new Kernel([
    new ConfigServiceProvider(), // Mock config
    // Mock other services as needed
  ]);

  await testKernel.start();
  
  // Run tests
  const app = testKernel.getApplication();
  const container = app.getContainer();
  
  // Verify services are available
  console.log('Test kernel ready for testing');
  
  await testKernel.stop();
}

// =============================================================================
// Example Runner
// =============================================================================

/**
 * Run all examples
 */
export async function runAllExamples(): Promise<void> {
  console.log('Running Kernel Examples...\n');
  
  try {
    await basicKernelSetup();
    console.log();
    
    await dynamicProviderRegistration();
    console.log();
    
    kernelConstruction();
    console.log();
    
    await directApplicationUsage();
    console.log();
    
    await advancedConfiguration();
    console.log();
    
    await methodChaining();
    console.log();
    
    await conditionalProviderRegistration();
    console.log();
    
    await gracefulShutdown();
    console.log();
    
    await errorRecovery();
    console.log();
    
    await testingSetup();
    console.log();
    
    console.log('All Kernel examples completed successfully!');
    
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples();
}