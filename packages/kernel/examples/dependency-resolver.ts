/**
 * DependencyResolver Examples
 * 
 * This file contains examples for using the DependencyResolver class
 * with executable TypeScript code.
 */

import { DependencyResolver } from '../src/Container/DependencyResolver';
import { ServiceNotFoundException, CircularDependencyException } from '../src/Exceptions/ContainerExceptions';
import { Token, ServiceDefinition, Scope } from '../src/Types';

// Example services for demonstration
class ConfigService {
  constructor() {
    console.log('ConfigService created');
  }

  getConfig(key: string): string {
    return `config-${key}`;
  }
}

class DatabaseService {
  constructor(private config: ConfigService) {
    console.log('DatabaseService created with config');
  }

  connect(): string {
    return `Connected to ${this.config.getConfig('database')}`;
  }
}

class LoggerService {
  constructor(private config: ConfigService) {
    console.log('LoggerService created with config');
  }

  log(message: string): void {
    console.log(`[${this.config.getConfig('env')}] ${message}`);
  }
}

class UserService {
  constructor(
    private database: DatabaseService,
    private logger: LoggerService
  ) {
    console.log('UserService created with dependencies');
  }

  createUser(name: string): string {
    this.logger.log(`Creating user: ${name}`);
    this.database.connect();
    return `User ${name} created`;
  }
}

class UserController {
  constructor(private userService: UserService) {
    console.log('UserController created');
  }

  handleCreateUser(name: string): string {
    return this.userService.createUser(name);
  }
}

/**
 * Basic Usage
 * 
 * Shows how to use DependencyResolver directly
 */
export function basicUsage(): void {
  console.log('=== Basic Usage ===');
  
  const services = new Map<Token, ServiceDefinition>();
  const singletons = new Map<Token, any>();
  const resolver = new DependencyResolver(services, singletons);

  // Register a simple service
  services.set('config', {
    token: 'config',
    useClass: ConfigService,
    deps: [],
    scope: Scope.SINGLETON
  });

  // Resolve the service
  const config = resolver.resolve<ConfigService>('config');
  console.log('Config resolved:', config.getConfig('test'));
}

/**
 * Service Resolution
 * 
 * Shows complex dependency chain resolution
 */
export function serviceResolution(): void {
  console.log('=== Service Resolution ===');
  
  const services = new Map<Token, ServiceDefinition>();
  const singletons = new Map<Token, any>();
  const resolver = new DependencyResolver(services, singletons);

  // Register services with dependencies
  services.set('config', {
    token: 'config',
    useClass: ConfigService,
    deps: [],
    scope: Scope.SINGLETON
  });

  services.set('database', {
    token: 'database',
    useClass: DatabaseService,
    deps: ['config'],
    scope: Scope.SINGLETON
  });

  services.set('logger', {
    token: 'logger',
    useClass: LoggerService,
    deps: ['config'],
    scope: Scope.SINGLETON
  });

  services.set('userService', {
    token: 'userService',
    useClass: UserService,
    deps: ['database', 'logger'],
    scope: Scope.SINGLETON
  });

  // Resolve complex service
  const userService = resolver.resolve<UserService>('userService');
  console.log('Result:', userService.createUser('John'));
}

/**
 * Error Handling
 * 
 * Shows how to handle resolution errors
 */
export function errorHandling(): void {
  console.log('=== Error Handling ===');
  
  const services = new Map<Token, ServiceDefinition>();
  const singletons = new Map<Token, any>();
  const resolver = new DependencyResolver(services, singletons);

  // Try to resolve non-existent service
  try {
    resolver.resolve('nonExistentService');
  } catch (error) {
    if (error instanceof ServiceNotFoundException) {
      console.log('Service not found:', error.token);
    }
  }

  // Create circular dependency
  services.set('serviceA', {
    token: 'serviceA',
    useClass: class ServiceA { constructor(b: any) {} },
    deps: ['serviceB'],
    scope: Scope.SINGLETON
  });

  services.set('serviceB', {
    token: 'serviceB',
    useClass: class ServiceB { constructor(a: any) {} },
    deps: ['serviceA'],
    scope: Scope.SINGLETON
  });

  try {
    resolver.resolve('serviceA');
  } catch (error) {
    if (error instanceof CircularDependencyException) {
      console.log('Circular dependency detected in chain');
    }
  }
}

/**
 * Instance Creation Types
 * 
 * Shows different service definition types
 */
export function instanceCreationTypes(): void {
  console.log('=== Instance Creation Types ===');
  
  const services = new Map<Token, ServiceDefinition>();
  const singletons = new Map<Token, any>();
  const resolver = new DependencyResolver(services, singletons);

  // Class definition
  console.log('--- Class Definition ---');
  services.set('config', {
    token: 'config',
    useClass: ConfigService,
    deps: [],
    scope: Scope.SINGLETON
  });

  const config = resolver.resolve<ConfigService>('config');
  console.log('Class instance:', config.getConfig('test'));

  // Factory definition
  console.log('--- Factory Definition ---');
  services.set('logger', {
    token: 'logger',
    useFactory: (config: ConfigService) => new LoggerService(config),
    deps: ['config'],
    scope: Scope.SINGLETON
  });

  const logger = resolver.resolve<LoggerService>('logger');
  logger.log('Factory created logger');

  // Value definition
  console.log('--- Value Definition ---');
  services.set('appConfig', {
    token: 'appConfig',
    useValue: { apiKey: 'secret', port: 3000 },
    scope: Scope.SINGLETON
  });

  const appConfig = resolver.resolve<any>('appConfig');
  console.log('Value instance:', appConfig);
}

/**
 * Complex Dependency Chain
 * 
 * Shows resolution of complex dependency graphs
 */
export function complexDependencyChain(): void {
  console.log('=== Complex Dependency Chain ===');
  
  const services = new Map<Token, ServiceDefinition>();
  const singletons = new Map<Token, any>();
  const resolver = new DependencyResolver(services, singletons);

  // Register all services in dependency chain
  services.set('config', {
    token: 'config',
    useClass: ConfigService,
    deps: [],
    scope: Scope.SINGLETON
  });

  services.set('database', {
    token: 'database',
    useClass: DatabaseService,
    deps: ['config'],
    scope: Scope.SINGLETON
  });

  services.set('logger', {
    token: 'logger',
    useClass: LoggerService,
    deps: ['config'],
    scope: Scope.SINGLETON
  });

  services.set('userService', {
    token: 'userService',
    useClass: UserService,
    deps: ['database', 'logger'],
    scope: Scope.SINGLETON
  });

  services.set('userController', {
    token: 'userController',
    useClass: UserController,
    deps: ['userService'],
    scope: Scope.SINGLETON
  });

  // Resolve top-level service - all dependencies resolved automatically
  const controller = resolver.resolve<UserController>('userController');
  console.log('Final result:', controller.handleCreateUser('Alice'));
}

/**
 * Singleton Caching
 * 
 * Shows how singleton instances are cached
 */
export function singletonCaching(): void {
  console.log('=== Singleton Caching ===');
  
  const services = new Map<Token, ServiceDefinition>();
  const singletons = new Map<Token, any>();
  const resolver = new DependencyResolver(services, singletons);

  services.set('config', {
    token: 'config',
    useClass: ConfigService,
    deps: [],
    scope: Scope.SINGLETON
  });

  // First resolution - creates new instance
  const config1 = resolver.resolve<ConfigService>('config');
  console.log('First resolution completed');

  // Second resolution - returns cached instance
  const config2 = resolver.resolve<ConfigService>('config');
  console.log('Second resolution completed');

  console.log('Same instance?', config1 === config2);
}

/**
 * Custom Resolution Context
 * 
 * Shows how to extend DependencyResolver
 */
export function customResolutionContext(): void {
  console.log('=== Custom Resolution Context ===');
  
  class CustomResolver extends DependencyResolver {
    resolve<T>(token: Token<T>): T {
      console.log(`Resolving: ${String(token)}`);
      const instance = super.resolve(token);
      console.log(`Resolved: ${String(token)}`);
      return instance;
    }
  }

  const services = new Map<Token, ServiceDefinition>();
  const singletons = new Map<Token, any>();
  const resolver = new CustomResolver(services, singletons);

  services.set('config', {
    token: 'config',
    useClass: ConfigService,
    deps: [],
    scope: Scope.SINGLETON
  });

  resolver.resolve<ConfigService>('config');
}

/**
 * Resolution Monitoring
 * 
 * Shows how to monitor resolution statistics
 */
export function resolutionMonitoring(): void {
  console.log('=== Resolution Monitoring ===');
  
  class MonitoredResolver extends DependencyResolver {
    private resolutionCount = new Map<Token, number>();

    resolve<T>(token: Token<T>): T {
      const count = this.resolutionCount.get(token) || 0;
      this.resolutionCount.set(token, count + 1);
      
      return super.resolve(token);
    }

    getResolutionStats(): Map<Token, number> {
      return new Map(this.resolutionCount);
    }
  }

  const services = new Map<Token, ServiceDefinition>();
  const singletons = new Map<Token, any>();
  const resolver = new MonitoredResolver(services, singletons);

  services.set('config', {
    token: 'config',
    useClass: ConfigService,
    deps: [],
    scope: Scope.SINGLETON
  });

  // Resolve multiple times
  resolver.resolve<ConfigService>('config');
  resolver.resolve<ConfigService>('config');
  resolver.resolve<ConfigService>('config');

  const stats = resolver.getResolutionStats();
  console.log('Resolution statistics:');
  stats.forEach((count, token) => {
    console.log(`  ${String(token)}: ${count} times`);
  });
}

// =============================================================================
// Example Runner
// =============================================================================

/**
 * Run all dependency resolver examples
 */
export function runAllExamples(): void {
  console.log('Running DependencyResolver Examples...\n');
  
  try {
    basicUsage();
    console.log();
    
    serviceResolution();
    console.log();
    
    errorHandling();
    console.log();
    
    instanceCreationTypes();
    console.log();
    
    complexDependencyChain();
    console.log();
    
    singletonCaching();
    console.log();
    
    customResolutionContext();
    console.log();
    
    resolutionMonitoring();
    console.log();
    
    console.log('All DependencyResolver examples completed successfully!');
    
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples();
}