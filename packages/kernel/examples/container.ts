/**
 * Container Exception Examples
 * 
 * This file contains examples for handling container exceptions and error scenarios
 * with executable TypeScript code.
 */

import { Container } from '../src/Container/Container';
import { ContainerException } from '../src/Exceptions/ContainerExceptions';
import { Token } from '../src/Types';

// Mock interfaces for examples
interface UserService {
  getUser(id: string): Promise<{ id: string; name: string }>;
}

interface OrderService {
  getOrders(userId: string): Promise<Array<{ id: string; total: number }>>;
}

interface MetricsService {
  increment(metric: string, tags?: Record<string, string>): void;
}

// Mock implementations
class MockUserService implements UserService {
  constructor(private orderService?: OrderService) {}
  
  async getUser(id: string): Promise<{ id: string; name: string }> {
    return { id, name: `User ${id}` };
  }
}

class MockOrderService implements OrderService {
  constructor(private userService?: UserService) {}
  
  async getOrders(userId: string): Promise<Array<{ id: string; total: number }>> {
    return [{ id: '1', total: 100 }];
  }
}

class MockMetricsService implements MetricsService {
  increment(metric: string, tags?: Record<string, string>): void {
    console.log(`Metric incremented: ${metric}`, tags);
  }
}

// =============================================================================
// Error Monitoring and Handling
// =============================================================================

/**
 * Production Error Monitoring
 * 
 * Demonstrates how to set up error monitoring for container exceptions
 */
export function setupErrorMonitoring(): void {
  console.log('=== Production Error Monitoring ===');
  
  const container = new Container();
  const metrics = new MockMetricsService();
  
  // Set up error monitoring for container exceptions
  function resolveWithMonitoring<T>(container: Container, token: Token<T>): T {
    try {
      return container.resolve(token);
    } catch (error) {
      if (error instanceof ContainerException) {
        // Log to monitoring service (e.g., Sentry, DataDog)
        console.error('[CONTAINER_ERROR]', {
          type: error.name,
          message: error.message,
          token: error.token,
          timestamp: new Date().toISOString(),
          stack: error.stack
        });

        // Increment error metrics
        metrics.increment('container.resolution.error', {
          error_type: error.name,
          service_token: String(error.token)
        });
      }
      throw error;
    }
  }
  
  // Example usage
  try {
    const nonExistentService = resolveWithMonitoring(container, 'nonExistentService');
  } catch (error) {
    console.log('Error caught and logged');
  }
}

/**
 * Error Recovery Strategies
 * 
 * Shows different approaches to handle container errors gracefully
 */
export function errorRecoveryStrategies(): void {
  console.log('=== Error Recovery Strategies ===');
  
  const container = new Container();
  
  // Strategy 1: Fallback services
  function resolveWithFallback<T>(container: Container, token: Token<T>, fallback: T): T {
    try {
      return container.resolve(token);
    } catch (error) {
      console.log(`Service '${String(token)}' not found, using fallback`);
      return fallback;
    }
  }
  
  // Strategy 2: Optional resolution
  function resolveOptional<T>(container: Container, token: Token<T>): T | null {
    try {
      return container.resolve(token);
    } catch (error) {
      return null;
    }
  }
  
  // Strategy 3: Lazy initialization
  function resolveLazy<T>(container: Container, token: Token<T>): () => T {
    return () => {
      try {
        return container.resolve(token);
      } catch (error) {
        console.error(`Lazy resolution failed for '${String(token)}'`);
        throw error;
      }
    };
  }
  
  // Example usage
  const fallbackService = resolveWithFallback(container, 'userService', new MockUserService());
  console.log('Fallback service resolved');
  
  const optionalService = resolveOptional(container, 'optionalService');
  console.log('Optional service:', optionalService ? 'found' : 'not found');
  
  const lazyService = resolveLazy(container, 'lazyService');
  console.log('Lazy service resolver created');
}

// =============================================================================
// Circular Dependency Handling
// =============================================================================

/**
 * Circular Dependency Problem and Solutions
 * 
 * Demonstrates circular dependency issues and various resolution strategies
 */
export function circularDependencyHandling(): void {
  console.log('=== Circular Dependency Handling ===');
  
  const container = new Container();
  
  // Problem: Direct circular dependency
  console.log('--- Problem: Direct Circular Dependencies ---');
  
  // This would create a circular dependency:
  // class UserService {
  //   constructor(private orderService: OrderService) {}
  // }
  // 
  // class OrderService {
  //   constructor(private userService: UserService) {}
  // }
  
  console.log('Direct circular dependencies would cause infinite recursion');
  
  // Solution 1: Interface Segregation
  console.log('--- Solution 1: Interface Segregation ---');
  
  interface UserRepository {
    getUser(id: string): Promise<{ id: string; name: string }>;
  }
  
  interface OrderRepository {
    getOrders(userId: string): Promise<Array<{ id: string; total: number }>>;
  }
  
  class UserServiceV2 implements UserRepository {
    constructor(private orderRepo: OrderRepository) {}
    
    async getUser(id: string): Promise<{ id: string; name: string }> {
      const orders = await this.orderRepo.getOrders(id);
      return { id, name: `User ${id} (${orders.length} orders)` };
    }
  }
  
  class OrderServiceV2 implements OrderRepository {
    // No dependency on UserService - breaks the cycle
    async getOrders(userId: string): Promise<Array<{ id: string; total: number }>> {
      return [{ id: '1', total: 100 }];
    }
  }
  
  container.registerClass('orderRepo', OrderServiceV2);
  container.registerFactory('userService', (orderRepo) => new UserServiceV2(orderRepo), ['orderRepo']);
  
  console.log('Interface segregation solution registered');
  
  // Solution 2: Event-Driven Architecture
  console.log('--- Solution 2: Event-Driven Architecture ---');
  
  interface EventBus {
    emit(event: string, data: any): void;
    on(event: string, handler: (data: any) => void): void;
  }
  
  class SimpleEventBus implements EventBus {
    private handlers = new Map<string, Array<(data: any) => void>>();
    
    emit(event: string, data: any): void {
      const eventHandlers = this.handlers.get(event) || [];
      eventHandlers.forEach(handler => handler(data));
    }
    
    on(event: string, handler: (data: any) => void): void {
      if (!this.handlers.has(event)) {
        this.handlers.set(event, []);
      }
      this.handlers.get(event)!.push(handler);
    }
  }
  
  class EventDrivenUserService {
    constructor(private eventBus: EventBus) {
      this.eventBus.on('orderCreated', this.handleOrderCreated.bind(this));
    }
    
    async createUser(name: string): Promise<{ id: string; name: string }> {
      const user = { id: Math.random().toString(), name };
      this.eventBus.emit('userCreated', user);
      return user;
    }
    
    private handleOrderCreated(order: any): void {
      console.log(`User service handling order creation: ${order.id}`);
    }
  }
  
  class EventDrivenOrderService {
    constructor(private eventBus: EventBus) {
      this.eventBus.on('userCreated', this.handleUserCreated.bind(this));
    }
    
    async createOrder(userId: string, total: number): Promise<{ id: string; total: number }> {
      const order = { id: Math.random().toString(), userId, total };
      this.eventBus.emit('orderCreated', order);
      return order;
    }
    
    private handleUserCreated(user: any): void {
      console.log(`Order service handling user creation: ${user.id}`);
    }
  }
  
  container.registerClass('eventBus', SimpleEventBus);
  container.registerFactory('eventUserService', (eventBus) => new EventDrivenUserService(eventBus), ['eventBus']);
  container.registerFactory('eventOrderService', (eventBus) => new EventDrivenOrderService(eventBus), ['eventBus']);
  
  console.log('Event-driven architecture solution registered');
  
  // Solution 3: Lazy Injection
  console.log('--- Solution 3: Lazy Injection ---');
  
  class LazyUserService {
    constructor(private getOrderService: () => OrderService) {}
    
    async getUserWithOrders(id: string): Promise<any> {
      const user = { id, name: `User ${id}` };
      // Lazy resolution - only resolve when needed
      const orderService = this.getOrderService();
      const orders = await orderService.getOrders(id);
      return { ...user, orders };
    }
  }
  
  class LazyOrderService {
    constructor(private getUserService: () => UserService) {}
    
    async getOrders(userId: string): Promise<Array<{ id: string; total: number }>> {
      // Could use user service if needed, but breaking the immediate dependency
      return [{ id: '1', total: 100 }];
    }
  }
  
  // Register with lazy factories
  container.registerFactory('lazyOrderService', () => new LazyOrderService(() => container.resolve('lazyUserService')));
  container.registerFactory('lazyUserService', () => new LazyUserService(() => container.resolve('lazyOrderService')));
  
  console.log('Lazy injection solution registered');
}

/**
 * Dependency Cycle Detection
 * 
 * Shows how to detect and prevent circular dependencies
 */
export function dependencyCycleDetection(): void {
  console.log('=== Dependency Cycle Detection ===');
  
  const container = new Container();
  
  // Custom container wrapper with cycle detection
  class CycleDetectingContainer {
    private container: Container;
    private resolutionStack: Set<string> = new Set();
    
    constructor(container: Container) {
      this.container = container;
    }
    
    resolve<T>(token: Token<T>): T {
      const tokenKey = String(token);
      
      if (this.resolutionStack.has(tokenKey)) {
        const cycle = Array.from(this.resolutionStack).concat(tokenKey);
        throw new Error(`Circular dependency detected: ${cycle.join(' -> ')}`);
      }
      
      this.resolutionStack.add(tokenKey);
      
      try {
        const result = this.container.resolve(token);
        this.resolutionStack.delete(tokenKey);
        return result;
      } catch (error) {
        this.resolutionStack.delete(tokenKey);
        throw error;
      }
    }
    
    registerFactory<T>(token: Token<T>, factory: (...args: any[]) => T, dependencies?: Token<any>[]): void {
      this.container.registerFactory(token, factory, dependencies);
    }
  }
  
  const cycleDetector = new CycleDetectingContainer(container);
  
  // Register services that would create a cycle
  cycleDetector.registerFactory('serviceA', () => {
    console.log('Creating serviceA');
    return { name: 'A', serviceB: cycleDetector.resolve('serviceB') };
  });
  
  cycleDetector.registerFactory('serviceB', () => {
    console.log('Creating serviceB');
    return { name: 'B', serviceA: cycleDetector.resolve('serviceA') };
  });
  
  try {
    cycleDetector.resolve('serviceA');
  } catch (error) {
    console.log('Cycle detected:', error.message);
  }
}

// =============================================================================
// Advanced Error Handling Patterns
// =============================================================================

/**
 * Graceful Degradation
 * 
 * Shows how to implement graceful degradation when services fail
 */
export function gracefulDegradation(): void {
  console.log('=== Graceful Degradation ===');
  
  const container = new Container();
  
  // Service with fallback behavior
  class ResilientService {
    private primaryService?: any;
    private fallbackService: any;
    
    constructor() {
      this.fallbackService = {
        getData: () => ({ source: 'fallback', data: 'cached data' })
      };
      
      try {
        this.primaryService = container.resolve('primaryDataService');
      } catch (error) {
        console.log('Primary service unavailable, using fallback');
      }
    }
    
    getData(): any {
      if (this.primaryService) {
        try {
          return this.primaryService.getData();
        } catch (error) {
          console.log('Primary service failed, falling back');
          return this.fallbackService.getData();
        }
      }
      
      return this.fallbackService.getData();
    }
  }
  
  container.registerClass('resilientService', ResilientService);
  
  const service = container.resolve<ResilientService>('resilientService');
  const data = service.getData();
  console.log('Resilient service data:', data);
}

/**
 * Service Health Monitoring
 * 
 * Demonstrates health checking and monitoring for container services
 */
export function serviceHealthMonitoring(): void {
  console.log('=== Service Health Monitoring ===');
  
  const container = new Container();
  
  interface HealthCheck {
    isHealthy(): Promise<boolean>;
    getStatus(): Promise<{ status: 'healthy' | 'unhealthy'; details?: string }>;
  }
  
  class HealthMonitor {
    private services = new Map<string, HealthCheck>();
    
    registerService(name: string, service: HealthCheck): void {
      this.services.set(name, service);
    }
    
    async checkAllServices(): Promise<Record<string, any>> {
      const results: Record<string, any> = {};
      
      for (const [name, service] of this.services) {
        try {
          results[name] = await service.getStatus();
        } catch (error) {
          results[name] = { status: 'unhealthy', details: error.message };
        }
      }
      
      return results;
    }
  }
  
  class HealthyService implements HealthCheck {
    async isHealthy(): Promise<boolean> {
      return true;
    }
    
    async getStatus(): Promise<{ status: 'healthy' | 'unhealthy'; details?: string }> {
      return { status: 'healthy' };
    }
  }
  
  container.registerClass('healthMonitor', HealthMonitor);
  container.registerClass('healthyService', HealthyService);
  
  const monitor = container.resolve<HealthMonitor>('healthMonitor');
  const service = container.resolve<HealthyService>('healthyService');
  
  monitor.registerService('testService', service);
  
  monitor.checkAllServices().then(results => {
    console.log('Health check results:', results);
  });
}

// =============================================================================
// Example Runner
// =============================================================================

/**
 * Run all container exception examples
 */
export async function runAllExamples(): Promise<void> {
  console.log('Running Container Exception Examples...\n');
  
  try {
    setupErrorMonitoring();
    console.log();
    
    errorRecoveryStrategies();
    console.log();
    
    circularDependencyHandling();
    console.log();
    
    dependencyCycleDetection();
    console.log();
    
    gracefulDegradation();
    console.log();
    
    await serviceHealthMonitoring();
    console.log();
    
    console.log('All Container exception examples completed successfully!');
    
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples();
}