/**
 * Kernel Usage Patterns
 * 
 * This file demonstrates advanced usage patterns and architectural approaches for the Kernel class.
 */

import { Kernel } from '../src/Application/Kernel';
import { Application } from '../src/Application/Application';
import { ServiceProvider } from '../src/Contracts/ServiceProvider';
import { Container } from '../src/Container/Container';

// Mock service providers for demonstration
class ConfigServiceProvider implements ServiceProvider {
  async register(container: Container) {
    container.registerValue('config', { database: { host: 'localhost' } });
  }

  getProviderName(): string {
    return 'ConfigServiceProvider';
  }
}

class LoggingServiceProvider implements ServiceProvider {
  async register(container: Container) {
    container.registerValue('logger', { log: (msg: string) => console.log(msg) });
  }

  getProviderName(): string {
    return 'LoggingServiceProvider';
  }
}

class DatabaseServiceProvider implements ServiceProvider {
  async register(container: Container) {
    container.registerValue('database', { query: (sql: string) => Promise.resolve([]) });
  }

  getProviderName(): string {
    return 'DatabaseServiceProvider';
  }
}

class AuthServiceProvider implements ServiceProvider {
  async register(container: Container) {
    container.registerValue('auth', { authenticate: (token: string) => Promise.resolve(true) });
  }

  getProviderName(): string {
    return 'AuthServiceProvider';
  }
}

class HttpServiceProvider implements ServiceProvider {
  async register(container: Container) {
    container.registerValue('httpServer', { listen: (port: number) => console.log(`Server listening on ${port}`) });
  }

  getProviderName(): string {
    return 'HttpServiceProvider';
  }
}

class CLServiceProvider implements ServiceProvider {
  async register(container: Container) {
    container.registerValue('cli', { parse: (args: string[]) => ({ command: args[0] }) });
  }

  getProviderName(): string {
    return 'CLServiceProvider';
  }
}

class MigrationServiceProvider implements ServiceProvider {
  async register(container: Container) {
    container.registerValue('migration', { run: () => Promise.resolve('Migrations completed') });
  }

  getProviderName(): string {
    return 'MigrationServiceProvider';
  }
}

class ImportServiceProvider implements ServiceProvider {
  async register(container: Container) {
    container.registerValue('import', { process: (file: string) => Promise.resolve(`Imported ${file}`) });
  }

  getProviderName(): string {
    return 'ImportServiceProvider';
  }
}

class CommandService {
  async execute(command: string, args: string[]): Promise<string> {
    return `Executed ${command} with args: ${args.join(', ')}`;
  }
}

class TestConfigServiceProvider implements ServiceProvider {
  async register(container: Container) {
    container.registerValue('config', { test: true, database: { host: 'test-db' } });
  }

  getProviderName(): string {
    return 'TestConfigServiceProvider';
  }
}

class InMemoryDatabaseServiceProvider implements ServiceProvider {
  async register(container: Container) {
    container.registerValue('database', new TestDatabase());
  }

  getProviderName(): string {
    return 'InMemoryDatabaseServiceProvider';
  }
}

class MockEmailServiceProvider implements ServiceProvider {
  async register(container: Container) {
    container.registerValue('email', { send: (to: string, subject: string) => Promise.resolve(`Mock email sent to ${to}`) });
  }

  getProviderName(): string {
    return 'MockEmailServiceProvider';
  }
}

class TestLoggerServiceProvider implements ServiceProvider {
  async register(container: Container) {
    container.registerValue('logger', { log: () => {} }); // Silent logger for tests
  }

  getProviderName(): string {
    return 'TestLoggerServiceProvider';
  }
}

class TestDatabase {
  async truncateAll(): Promise<void> {
    console.log('All tables truncated');
  }
}

class MetricsServiceProvider implements ServiceProvider {
  async register(container: Container) {
    container.registerValue('metrics', { increment: (metric: string) => console.log(`Metric ${metric} incremented`) });
  }

  getProviderName(): string {
    return 'MetricsServiceProvider';
  }
}

class HealthCheckServiceProvider implements ServiceProvider {
  async register(container: Container) {
    container.registerValue('healthCheck', new HealthCheckService());
  }

  getProviderName(): string {
    return 'HealthCheckServiceProvider';
  }
}

class HealthCheckService {
  async registerChecks(): Promise<void> {
    console.log('Health checks registered');
  }
}

class MessageQueueServiceProvider implements ServiceProvider {
  async register(container: Container) {
    container.registerValue('messageQueue', { publish: (topic: string, message: any) => Promise.resolve() });
  }

  getProviderName(): string {
    return 'MessageQueueServiceProvider';
  }
}

class UserServiceProvider implements ServiceProvider {
  async register(container: Container) {
    container.registerValue('userService', new UserService());
  }

  getProviderName(): string {
    return 'UserServiceProvider';
  }
}

class UserService {
  async createUser(data: any): Promise<any> {
    return { id: 1, ...data };
  }
}

class PaymentServiceProvider implements ServiceProvider {
  async register(container: Container) {
    container.registerValue('paymentService', { processPayment: (amount: number) => Promise.resolve(`Processed $${amount}`) });
  }

  getProviderName(): string {
    return 'PaymentServiceProvider';
  }
}

class BillingServiceProvider implements ServiceProvider {
  async register(container: Container) {
    container.registerValue('billing', { generateInvoice: (userId: number) => Promise.resolve(`Invoice for user ${userId}`) });
  }

  getProviderName(): string {
    return 'BillingServiceProvider';
  }
}

class NotificationServiceProvider implements ServiceProvider {
  async register(container: Container) {
    container.registerValue('notification', { send: (userId: number, message: string) => Promise.resolve() });
  }

  getProviderName(): string {
    return 'NotificationServiceProvider';
  }
}

class EmailServiceProvider implements ServiceProvider {
  async register(container: Container) {
    container.registerValue('email', { send: (to: string, subject: string, body: string) => Promise.resolve() });
  }

  getProviderName(): string {
    return 'EmailServiceProvider';
  }
}

class ProductionDatabaseServiceProvider implements ServiceProvider {
  async register(container: Container) {
    container.registerValue('database', { 
      query: (sql: string) => Promise.resolve([]),
      pool: { max: 20, min: 5 }
    });
  }

  getProviderName(): string {
    return 'ProductionDatabaseServiceProvider';
  }
}

class RedisServiceProvider implements ServiceProvider {
  async register(container: Container) {
    container.registerValue('redis', { get: (key: string) => Promise.resolve(null), set: (key: string, value: any) => Promise.resolve() });
  }

  getProviderName(): string {
    return 'RedisServiceProvider';
  }
}

class AlertingServiceProvider implements ServiceProvider {
  async register(container: Container) {
    container.registerValue('alerting', { sendAlert: (message: string) => Promise.resolve() });
  }

  getProviderName(): string {
    return 'AlertingServiceProvider';
  }
}

class StagingDatabaseServiceProvider implements ServiceProvider {
  async register(container: Container) {
    container.registerValue('database', { 
      query: (sql: string) => Promise.resolve([]),
      pool: { max: 10, min: 2 }
    });
  }

  getProviderName(): string {
    return 'StagingDatabaseServiceProvider';
  }
}

class DevelopmentDatabaseServiceProvider implements ServiceProvider {
  async register(container: Container) {
    container.registerValue('database', { 
      query: (sql: string) => Promise.resolve([]),
      debug: true
    });
  }

  getProviderName(): string {
    return 'DevelopmentDatabaseServiceProvider';
  }
}

class DevToolsServiceProvider implements ServiceProvider {
  async register(container: Container) {
    container.registerValue('devTools', { hotReload: true, debugMode: true });
  }

  getProviderName(): string {
    return 'DevToolsServiceProvider';
  }
}

/**
 * 1. Web Application Kernel
 * 
 * Demonstrates creating a kernel specifically for web applications
 * with HTTP server capabilities.
 */
export async function webApplicationKernelExample() {
  console.log('=== Web Application Kernel Example ===');

  class WebApplicationKernel extends Kernel {
    constructor() {
      super([
        new ConfigServiceProvider(),
        new LoggingServiceProvider(),
        new DatabaseServiceProvider(),
        new AuthServiceProvider(),
        new HttpServiceProvider()
      ]);
    }

    async startWebServer(port: number = 3000) {
      const app = await this.start();

      const httpServer = app.getContainer().resolve<any>('httpServer');
      httpServer.listen(port);

      console.log(`Web server started on port ${port}`);
      return app;
    }
  }

  // Usage
  const kernel = new WebApplicationKernel();
  const app = await kernel.startWebServer(3000);
  
  console.log('Web application kernel started successfully');
  await kernel.stop();
}

/**
 * 2. CLI Application Kernel
 * 
 * Demonstrates creating a kernel for command-line applications
 * with dynamic provider loading based on commands.
 */
export async function cliApplicationKernelExample() {
  console.log('=== CLI Application Kernel Example ===');

  class CLIKernel extends Kernel {
    constructor(command: string) {
      const providers = [
        new ConfigServiceProvider(),
        new DatabaseServiceProvider(),
        new CLServiceProvider()
      ];

      // Add command-specific providers
      if (command === 'migrate') {
        providers.push(new MigrationServiceProvider());
      } else if (command === 'import') {
        providers.push(new ImportServiceProvider());
      }

      super(providers);
    }

    async executeCommand(command: string, args: string[]) {
      try {
        const app = await this.start();

        const commandService = app.getContainer()
          .resolve<CommandService>('commandService');

        const result = await commandService.execute(command, args);
        console.log(result);

        await this.stop();
        return 0;

      } catch (error) {
        console.error('Command failed:', error);
        await this.stop();
        return 1;
      }
    }
  }

  // Register command service
  class CommandServiceProvider implements ServiceProvider {
    async register(container: Container) {
      container.registerValue('commandService', new CommandService());
    }

    getProviderName(): string {
      return 'CommandServiceProvider';
    }
  }

  // Usage
  const kernel = new CLIKernel('migrate');
  kernel.registerServiceProvider(new CommandServiceProvider());
  
  const exitCode = await kernel.executeCommand('migrate', ['--force']);
  console.log(`Command completed with exit code: ${exitCode}`);
}

/**
 * 3. Test Kernel
 * 
 * Demonstrates creating a kernel optimized for testing
 * with mock services and test utilities.
 */
export async function testKernelExample() {
  console.log('=== Test Kernel Example ===');

  class TestKernel extends Kernel {
    constructor() {
      super([
        new TestConfigServiceProvider(),
        new InMemoryDatabaseServiceProvider(),
        new MockEmailServiceProvider(),
        new TestLoggerServiceProvider()
      ]);
    }

    static async createForTest() {
      const kernel = new TestKernel();
      const app = await kernel.start();
      return { kernel, app };
    }

    async reset() {
      const app = this.getApplication();
      const database = app.getContainer().resolve<TestDatabase>('database');
      await database.truncateAll();
    }
  }

  // Usage in tests
  const { kernel, app } = await TestKernel.createForTest();

  // Simulate test setup
  await kernel.reset();

  const userService = app.getContainer().resolve<UserService>('userService');
  console.log('Test kernel created and reset successfully');

  await kernel.stop();
}

/**
 * 4. Microservice Kernel
 * 
 * Demonstrates creating a kernel for microservices
 * with service-specific provider loading.
 */
export async function microserviceKernelExample() {
  console.log('=== Microservice Kernel Example ===');

  class MicroserviceKernel extends Kernel {
    constructor(serviceName: string) {
      super([
        new ConfigServiceProvider(),
        new LoggingServiceProvider(),
        new MetricsServiceProvider(),
        new HealthCheckServiceProvider(),
        new MessageQueueServiceProvider(),
        new HttpServiceProvider()
      ]);

      // Add service-specific providers
      this.addServiceSpecificProviders(serviceName);
    }

    private addServiceSpecificProviders(serviceName: string) {
      const serviceProviders: { [key: string]: ServiceProvider[] } = {
        'user-service': [new UserServiceProvider(), new AuthServiceProvider()],
        'payment-service': [new PaymentServiceProvider(), new BillingServiceProvider()],
        'notification-service': [new NotificationServiceProvider(), new EmailServiceProvider()]
      };

      const providers = serviceProviders[serviceName] || [];
      providers.forEach(provider => this.registerServiceProvider(provider));
    }

    async startMicroservice(port: number) {
      const app = await this.start();

      // Setup health checks
      const healthCheck = app.getContainer().resolve<HealthCheckService>('healthCheck');
      await healthCheck.registerChecks();

      // Start HTTP server
      const httpServer = app.getContainer().resolve<any>('httpServer');
      httpServer.listen(port);

      console.log(`Microservice started on port ${port}`);
      return app;
    }
  }

  // Usage
  const serviceName = 'user-service';
  const kernel = new MicroserviceKernel(serviceName);
  const app = await kernel.startMicroservice(3001);
  
  console.log(`${serviceName} microservice started successfully`);
  await kernel.stop();
}

/**
 * 5. Environment-Specific Kernels
 * 
 * Demonstrates creating kernels with different configurations
 * based on the environment.
 */
export async function environmentSpecificKernelsExample() {
  console.log('=== Environment-Specific Kernels Example ===');

  class KernelFactory {
    static createForEnvironment(env: string): Kernel {
      const commonProviders = [
        new ConfigServiceProvider(),
        new LoggingServiceProvider()
      ];

      switch (env) {
        case 'production':
          return new Kernel([
            ...commonProviders,
            new ProductionDatabaseServiceProvider(),
            new RedisServiceProvider(),
            new MetricsServiceProvider(),
            new AlertingServiceProvider()
          ]);

        case 'staging':
          return new Kernel([
            ...commonProviders,
            new StagingDatabaseServiceProvider(),
            new MetricsServiceProvider()
          ]);

        case 'development':
          return new Kernel([
            ...commonProviders,
            new DevelopmentDatabaseServiceProvider(),
            new DevToolsServiceProvider()
          ]);

        case 'test':
          return new Kernel([
            ...commonProviders,
            new InMemoryDatabaseServiceProvider(),
            new MockEmailServiceProvider()
          ]);

        default:
          throw new Error(`Unknown environment: ${env}`);
      }
    }
  }

  // Usage for different environments
  const environments = ['development', 'test', 'staging', 'production'];
  
  for (const env of environments) {
    console.log(`Creating kernel for ${env} environment...`);
    const kernel = KernelFactory.createForEnvironment(env);
    const app = await kernel.start();
    console.log(`${env} kernel started successfully`);
    await kernel.stop();
  }
}

/**
 * Run all kernel pattern examples
 */
export async function runAllKernelPatternExamples() {
  console.log('Running all Kernel pattern examples...\n');

  await webApplicationKernelExample();
  console.log();

  await cliApplicationKernelExample();
  console.log();

  await testKernelExample();
  console.log();

  await microserviceKernelExample();
  console.log();

  await environmentSpecificKernelsExample();
  console.log();

  console.log('All Kernel pattern examples completed!');
}

// All functions are already exported above