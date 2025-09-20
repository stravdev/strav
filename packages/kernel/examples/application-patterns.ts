/**
 * Application Usage Patterns
 * 
 * This file demonstrates advanced usage patterns and architectural approaches 
 * for the Application class with executable TypeScript code.
 */

import { Application, Container, ServiceProvider } from '@strav/kernel'

// Mock service interfaces for demonstration
interface HttpServer {
  listen(port: number): void
  close(): void;
  get(path: string, handler: (req: any, res: any) => void): void
}

interface DatabaseService {
  isConnected(): boolean;
  query(sql: string): Promise<any>;
}

interface MessageQueue {
  isConnected(): boolean;
  publish(topic: string, message: any): Promise<void>
}

interface CacheService {
  isReady(): boolean;
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
}

interface TestDatabase {
  truncateAll(): Promise<void>;
}

interface TestCache {
  flush(): Promise<void>;
}

interface CommandService {
  execute(command: string, args: string[]): Promise<string>;
}

interface UserService {
  create(userData: { name: string }): Promise<{ id: string; name: string }>;
}

// Example service providers for patterns
class ConfigServiceProvider implements ServiceProvider {
  getProviderName(): string {
    return 'ConfigServiceProvider';
  }

  register(container: Container): void {
    container.registerValue('config', {
      port: process.env.PORT || 3000,
      database: { host: 'localhost', port: 5432 },
      app: { name: 'PatternApp', version: '1.0.0' }
    });
    console.log('ConfigServiceProvider registered');
  }

  getProvidedServices() {
    return ['config'];
  }
}

class LoggingServiceProvider implements ServiceProvider {
  getProviderName(): string {
    return 'LoggingServiceProvider';
  }

  register(container: Container): void {
    container.registerValue('logger', {
      info: (msg: string) => console.log(`[INFO] ${msg}`),
      error: (msg: string) => console.error(`[ERROR] ${msg}`),
      warn: (msg: string) => console.warn(`[WARN] ${msg}`)
    });
    console.log('LoggingServiceProvider registered');
  }

  getProvidedServices() {
    return ['logger'];
  }
}

class DatabaseServiceProvider implements ServiceProvider {
  getProviderName(): string {
    return 'DatabaseServiceProvider';
  }

  register(container: Container): void {
    container.registerFactory('database', (config: any): DatabaseService => ({
      isConnected: () => true,
      query: async (sql: string) => ({ result: `Query executed: ${sql}` })
    }), ['config']);
    console.log('DatabaseServiceProvider registered');
  }

  getDependencies() {
    return ['config'];
  }

  getProvidedServices() {
    return ['database'];
  }
}

class AuthServiceProvider implements ServiceProvider {
  getProviderName(): string {
    return 'AuthServiceProvider';
  }

  register(container: Container): void {
    container.registerFactory('auth', (config: any) => ({
      login: (username: string) => `User ${username} logged in`,
      logout: () => 'User logged out',
      verify: (token: string) => token === 'valid-token'
    }), ['config']);
    console.log('AuthServiceProvider registered');
  }

  getDependencies() {
    return ['config'];
  }

  getProvidedServices() {
    return ['auth'];
  }
}

class EmailServiceProvider implements ServiceProvider {
  getProviderName(): string {
    return 'EmailServiceProvider';
  }

  register(container: Container): void {
    container.registerFactory('email', (config: any) => ({
      send: (to: string, subject: string, body: string) => 
        `Email sent to ${to}: ${subject}`
    }), ['config']);
    console.log('EmailServiceProvider registered');
  }

  getDependencies() {
    return ['config'];
  }

  getProvidedServices() {
    return ['email'];
  }
}

class HttpServiceProvider implements ServiceProvider {
  getProviderName(): string {
    return 'HttpServiceProvider';
  }

  register(container: Container): void {
    container.registerFactory('httpServer', (config: any): HttpServer => {
      const routes: Map<string, (req: any, res: any) => void> = new Map();
      
      return {
        listen: (port: number) => console.log(`HTTP Server listening on port ${port}`),
        close: () => console.log('HTTP Server closed'),
        get: (path: string, handler: (req: any, res: any) => void) => {
          routes.set(path, handler);
          console.log(`Route registered: GET ${path}`);
        }
      };
    }, ['config']);
    console.log('HttpServiceProvider registered');
  }

  getDependencies() {
    return ['config'];
  }

  getProvidedServices() {
    return ['httpServer'];
  }
}

class MetricsServiceProvider implements ServiceProvider {
  getProviderName(): string {
    return 'MetricsServiceProvider';
  }

  register(container: Container): void {
    container.registerValue('metrics', {
      increment: (metric: string) => console.log(`Metric incremented: ${metric}`),
      gauge: (metric: string, value: number) => console.log(`Gauge set: ${metric} = ${value}`)
    });
    console.log('MetricsServiceProvider registered');
  }

  getProvidedServices() {
    return ['metrics'];
  }
}

class HealthCheckServiceProvider implements ServiceProvider {
  getProviderName(): string {
    return 'HealthCheckServiceProvider';
  }

  register(container: Container): void {
    container.registerValue('healthCheck', {
      check: () => ({ status: 'healthy', timestamp: new Date().toISOString() })
    });
    console.log('HealthCheckServiceProvider registered');
  }

  getProvidedServices() {
    return ['healthCheck'];
  }
}

class MessageQueueServiceProvider implements ServiceProvider {
  getProviderName(): string {
    return 'MessageQueueServiceProvider';
  }

  register(container: Container): void {
    container.registerFactory('messageQueue', (config: any): MessageQueue => ({
      isConnected: () => true,
      publish: async (topic: string, message: any) => {
        console.log(`Message published to ${topic}:`, message);
      }
    }), ['config']);
    console.log('MessageQueueServiceProvider registered');
  }

  getDependencies() {
    return ['config'];
  }

  getProvidedServices() {
    return ['messageQueue'];
  }
}

class BusinessLogicServiceProvider implements ServiceProvider {
  getProviderName(): string {
    return 'BusinessLogicServiceProvider';
  }

  register(container: Container): void {
    container.registerFactory('businessLogic', (database: DatabaseService) => ({
      processData: async (data: any) => {
        await database.query('INSERT INTO processed_data VALUES (?)');
        return { processed: true, data };
      }
    }), ['database']);
    console.log('BusinessLogicServiceProvider registered');
  }

  getDependencies() {
    return ['database'];
  }

  getProvidedServices() {
    return ['businessLogic'];
  }
}

// Test-specific providers
class TestConfigServiceProvider implements ServiceProvider {
  getProviderName(): string {
    return 'TestConfigServiceProvider';
  }

  register(container: Container): void {
    container.registerValue('config', {
      database: { host: 'localhost', port: 5433, name: 'test_db' },
      app: { name: 'TestApp', version: '1.0.0-test' },
      test: true
    });
    console.log('TestConfigServiceProvider registered');
  }

  getProvidedServices() {
    return ['config'];
  }
}

class InMemoryDatabaseServiceProvider implements ServiceProvider {
  getProviderName(): string {
    return 'InMemoryDatabaseServiceProvider';
  }

  register(container: Container): void {
    const data = new Map();
    
    container.registerValue('database', {
      isConnected: () => true,
      query: async (sql: string) => ({ result: `In-memory query: ${sql}` }),
      truncateAll: async () => {
        data.clear();
        console.log('Test database truncated');
      }
    } as DatabaseService & TestDatabase);
    console.log('InMemoryDatabaseServiceProvider registered');
  }

  getProvidedServices() {
    return ['database'];
  }
}

class MockEmailServiceProvider implements ServiceProvider {
  getProviderName(): string {
    return 'MockEmailServiceProvider';
  }

  register(container: Container): void {
    const sentEmails: any[] = [];
    
    container.registerValue('email', {
      send: (to: string, subject: string, body: string) => {
        const email = { to, subject, body, timestamp: new Date() };
        sentEmails.push(email);
        console.log(`Mock email sent to ${to}: ${subject}`);
        return email;
      },
      getSentEmails: () => sentEmails,
      clearSentEmails: () => sentEmails.splice(0)
    });
    console.log('MockEmailServiceProvider registered');
  }

  getProvidedServices() {
    return ['email'];
  }
}

class TestUserServiceProvider implements ServiceProvider {
  getProviderName(): string {
    return 'TestUserServiceProvider';
  }

  register(container: Container): void {
    container.registerFactory('userService', (database: any): UserService => ({
      create: async (userData: { name: string }) => {
        const user = { id: Math.random().toString(36), name: userData.name };
        await database.query(`INSERT INTO users VALUES ('${user.id}', '${user.name}')`);
        return user;
      }
    }), ['database']);
    console.log('TestUserServiceProvider registered');
  }

  getDependencies() {
    return ['database'];
  }

  getProvidedServices() {
    return ['userService'];
  }
}

class CLIServiceProvider implements ServiceProvider {
  getProviderName(): string {
    return 'CLIServiceProvider';
  }

  register(container: Container): void {
    container.registerValue('cli', {
      parseArgs: (args: string[]) => ({ command: args[0], options: args.slice(1) }),
      output: (message: string) => console.log(message),
      error: (message: string) => console.error(message)
    });
    console.log('CLIServiceProvider registered');
  }

  getProvidedServices() {
    return ['cli'];
  }
}

class CommandServiceProvider implements ServiceProvider {
  getProviderName(): string {
    return 'CommandServiceProvider';
  }

  register(container: Container): void {
    container.registerFactory('commandService', (database: any, cli: any): CommandService => ({
      execute: async (command: string, args: string[]) => {
        switch (command) {
          case 'migrate':
            await database.query('CREATE TABLE IF NOT EXISTS migrations (id INT)');
            return 'Migrations completed';
          case 'seed':
            await database.query('INSERT INTO users VALUES (1, "admin")');
            return 'Database seeded';
          case 'status':
            return 'Application is running';
          default:
            throw new Error(`Unknown command: ${command}`);
        }
      }
    }), ['database', 'cli']);
    console.log('CommandServiceProvider registered');
  }

  getDependencies() {
    return ['database', 'cli'];
  }

  getProvidedServices() {
    return ['commandService'];
  }
}

class RedisServiceProvider implements ServiceProvider {
  getProviderName(): string {
    return 'RedisServiceProvider';
  }

  register(container: Container): void {
    container.registerFactory('redis', (config: any): CacheService => ({
      isReady: () => true,
      get: async (key: string) => `cached_value_for_${key}`,
      set: async (key: string, value: any) => {
        console.log(`Redis SET ${key} = ${JSON.stringify(value)}`);
      }
    }), ['config']);
    console.log('RedisServiceProvider registered');
  }

  getDependencies() {
    return ['config'];
  }

  getProvidedServices() {
    return ['redis'];
  }
}

/**
 * Basic Web Application Setup
 * 
 * Shows how to create a complete web application
 */
export async function createWebApplication(): Promise<Application> {
  console.log('=== Basic Web Application Setup ===');
  
  const app = new Application();

  // Register core services
  app
    .register(new ConfigServiceProvider())
    .register(new LoggingServiceProvider())
    .register(new DatabaseServiceProvider())
    .register(new AuthServiceProvider())
    .register(new EmailServiceProvider())
    .register(new HttpServiceProvider());

  // Start the application
  await app.run();

  // Get HTTP server and start listening
  const server = app.getContainer().resolve<HttpServer>('httpServer');
  const config = app.getContainer().resolve<any>('config');
  server.listen(config.port);

  console.log(`Server running on port ${config.port}`);
  return app;
}

/**
 * Microservice with Health Checks
 * 
 * Shows a microservice pattern with health monitoring
 */
export class MicroserviceApplication {
  constructor(private app = new Application()) {}

  async start(): Promise<void> {
    console.log('=== Microservice with Health Checks ===');
    
    // Register microservice-specific providers
    this.app
      .register(new ConfigServiceProvider())
      .register(new MetricsServiceProvider())
      .register(new HealthCheckServiceProvider())
      .register(new MessageQueueServiceProvider())
      .register(new BusinessLogicServiceProvider())
      .register(new HttpServiceProvider());

    await this.app.run();

    // Setup health check endpoint
    this.setupHealthCheck();
    console.log('Microservice started with health checks');
  }

  private setupHealthCheck(): void {
    const httpServer = this.app.getContainer().resolve<HttpServer>('httpServer');

    httpServer.get('/health', (req, res) => {
      const isHealthy = this.app.isRunning();
      const status = isHealthy ? 200 : 503;

      const response = {
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        services: this.getServiceHealth()
      };

      console.log(`Health check response (${status}):`, response);
      // Simulate res.status(status).json(response)
    });

    console.log('Health check endpoint registered at /health');
  }

  private getServiceHealth(): any {
    const container = this.app.getContainer();
    return {
      database: container.resolve<DatabaseService>('database').isConnected(),
      messageQueue: container.resolve<MessageQueue>('messageQueue').isConnected(),
      cache: container.has('redis') ? container.resolve<CacheService>('redis').isReady() : false
    };
  }

  async stop(): Promise<void> {
    await this.app.shutdown();
    console.log('Microservice stopped');
  }
}

/**
 * Testing Application
 * 
 * Shows a specialized application class for testing
 */
export class TestApplication extends Application {
  static async createForTesting(): Promise<TestApplication> {
    console.log('=== Testing Application ===');
    
    const app = new TestApplication();

    // Register test-specific providers
    app
      .register(new TestConfigServiceProvider())
      .register(new InMemoryDatabaseServiceProvider())
      .register(new MockEmailServiceProvider())
      .register(new TestUserServiceProvider());

    await app.run();
    console.log('Test application created and started');
    return app;
  }

  async reset(): Promise<void> {
    // Reset application state for test isolation
    const database = this.getContainer().resolve<TestDatabase>('database');
    await database.truncateAll();

    if (this.getContainer().has('cache')) {
      const cache = this.getContainer().resolve<TestCache>('cache');
      await cache.flush();
    }

    console.log('Test application state reset');
  }
}

/**
 * CLI Application
 * 
 * Shows command-line application pattern
 */
export class CLIApplication {
  constructor(private app = new Application()) {}

  async run(command: string, args: string[]): Promise<void> {
    console.log('=== CLI Application ===');
    console.log(`Executing command: ${command} with args:`, args);
    
    // Register CLI-specific providers
    this.app
      .register(new ConfigServiceProvider())
      .register(new DatabaseServiceProvider())
      .register(new CLIServiceProvider())
      .register(new CommandServiceProvider());

    try {
      await this.app.run();

      const commandService = this.app.getContainer()
        .resolve<CommandService>('commandService');

      const result = await commandService.execute(command, args);
      console.log('Command result:', result);

      await this.app.shutdown();
      console.log('CLI application completed successfully');

    } catch (error) {
      console.error('Command failed:', error);
      await this.app.shutdown();
      throw error;
    }
  }
}

/**
 * Application with Graceful Shutdown
 * 
 * Shows production-ready shutdown handling
 */
export class ProductionApplication {
  private shutdownHandlersRegistered = false;

  constructor(private app = new Application()) {}

  async start(): Promise<void> {
    console.log('=== Production Application with Graceful Shutdown ===');
    
    this.setupGracefulShutdown();

    this.app
      .register(new ConfigServiceProvider())
      .register(new DatabaseServiceProvider())
      .register(new RedisServiceProvider())
      .register(new HttpServiceProvider());

    await this.app.run();
    console.log('Production application started');
  }

  private setupGracefulShutdown(): void {
    if (this.shutdownHandlersRegistered) return;

    const shutdown = async (signal: string) => {
      console.log(`Received ${signal}, starting graceful shutdown...`);

      // Stop accepting new requests
      if (this.app.isRunning()) {
        const httpServer = this.app.getContainer()
          .resolve<HttpServer>('httpServer');
        httpServer.close();
        console.log('HTTP server closed');
      }

      try {
        await this.app.shutdown();
        console.log('Graceful shutdown completed');
      } catch (error) {
        console.error('Shutdown failed:', error);
        throw error;
      }
    };

    // In a real application, these would be actual process event handlers
    // For demonstration, we'll simulate the setup
    console.log('Graceful shutdown handlers registered for SIGTERM, SIGINT, SIGUSR2');
    this.shutdownHandlersRegistered = true;

    // Simulate shutdown for demonstration
    setTimeout(async () => {
      console.log('Simulating shutdown signal...');
      await shutdown('SIGTERM');
    }, 100);
  }
}

/**
 * Test Suite Simulation
 * 
 * Shows how the TestApplication would be used in tests
 */
export async function simulateTestSuite(): Promise<void> {
  console.log('=== Test Suite Simulation ===');
  
  let app: TestApplication;

  // Simulate beforeAll
  console.log('Setting up test application...');
  app = await TestApplication.createForTesting();

  // Simulate test case 1
  console.log('Running test: should create user');
  await app.reset();
  const userService = app.getContainer().resolve<UserService>('userService');
  const user = await userService.create({ name: 'John' });
  console.log('Test passed - user created:', user);

  // Simulate test case 2
  console.log('Running test: should send email');
  await app.reset();
  const email = app.getContainer().resolve<any>('email');
  const result = email.send('test@example.com', 'Test Subject', 'Test Body');
  console.log('Test passed - email sent:', result);

  // Simulate afterAll
  console.log('Cleaning up test application...');
  await app.shutdown();
  console.log('Test suite completed');
}

// =============================================================================
// Example Runner
// =============================================================================

/**
 * Run all application pattern examples
 */
export async function runAllPatternExamples(): Promise<void> {
  console.log('Running Application Pattern Examples...\n');
  
  try {
    // Basic Web Application
    const webApp = await createWebApplication();
    await webApp.shutdown();
    console.log();
    
    // Microservice Application
    const microservice = new MicroserviceApplication();
    await microservice.start();
    await microservice.stop();
    console.log();
    
    // CLI Application
    const cli = new CLIApplication();
    await cli.run('migrate', ['--force']);
    console.log();
    
    await cli.run('seed', ['--env=test']);
    console.log();
    
    // Test Application
    await simulateTestSuite();
    console.log();
    
    // Production Application
    const prodApp = new ProductionApplication();
    await prodApp.start();
    // Note: Production app will shutdown automatically in the demo
    console.log();
    
    console.log('All Application Pattern examples completed successfully!');
    
  } catch (error) {
    console.error('Error running pattern examples:', error);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllPatternExamples();
}