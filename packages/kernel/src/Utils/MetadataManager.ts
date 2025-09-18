import 'reflect-metadata'
import type { Constructor, Token } from '../Types'

/**
 * Interface for dependency metadata stored on classes/methods
 */
export interface DependencyMetadata {
  tokens: Token[]
  target: any
  propertyKey?: string | symbol
}

/**
 * Manages reflection metadata for dependency injection.
 * Handles automatic detection of dependencies from TypeScript type information.
 */
export class MetadataManager {
  private static readonly DEPENDENCIES_KEY = Symbol('dependencies')
  private static readonly INJECTABLE_KEY = Symbol('injectable')
  private static readonly DESIGN_PARAMTYPES = 'design:paramtypes'

  /**
   * Validates that reflect-metadata is available
   */
  static validateReflection(): void {
    if (!Reflect || !Reflect.getMetadata) {
      throw new Error(
        'reflect-metadata is required. Please install with "npm install reflect-metadata" and import "reflect-metadata" at the top of your application. Also ensure "experimentalDecorators" and "emitDecoratorMetadata" are enabled in tsconfig.json'
      )
    }
  }

  /**
   * Marks a class as injectable and stores its dependencies
   */
  static markAsInjectable(target: Constructor, dependencies: Token[]): void {
    this.validateReflection()
    Reflect.defineMetadata(this.INJECTABLE_KEY, true, target)
    Reflect.defineMetadata(this.DEPENDENCIES_KEY, dependencies, target)
  }

  /**
   * Stores method-level dependency metadata
   */
  static storeMethodDependencies(
    target: any,
    propertyKey: string | symbol,
    dependencies: Token[]
  ): void {
    this.validateReflection()
    const methodDeps: DependencyMetadata = {
      tokens: dependencies,
      target: target.constructor,
      propertyKey,
    }
    Reflect.defineMetadata(
      `${this.DEPENDENCIES_KEY.toString()}_${String(propertyKey)}`,
      methodDeps,
      target.constructor
    )
  }

  /**
   * Checks if a class is marked as injectable
   */
  static isInjectable(target: Constructor): boolean {
    if (!Reflect.getMetadata) {
      return false
    }
    return Reflect.getMetadata(this.INJECTABLE_KEY, target) === true
  }

  /**
   * Retrieves stored dependencies for a class
   */
  static getDependencies(target: Constructor): Token[] | undefined {
    this.validateReflection()
    return Reflect.getMetadata(this.DEPENDENCIES_KEY, target)
  }

  /**
   * Retrieves method-specific dependencies
   */
  static getMethodDependencies(
    target: Constructor,
    methodName: string | symbol
  ): DependencyMetadata | undefined {
    this.validateReflection()
    return Reflect.getMetadata(`${this.DEPENDENCIES_KEY.toString()}_${String(methodName)}`, target)
  }

  /**
   * Extracts constructor dependencies automatically by analyzing parameter types
   */
  static extractConstructorDependencies(target: Constructor): Token[] {
    this.validateReflection()
    const paramTypes = Reflect.getMetadata(this.DESIGN_PARAMTYPES, target) || []
    return this.filterInjectableTypes(paramTypes)
  }

  /**
   * Extracts method dependencies automatically by analyzing parameter types
   */
  static extractMethodDependencies(target: any, propertyKey: string | symbol): Token[] {
    this.validateReflection()
    const paramTypes = Reflect.getMetadata(this.DESIGN_PARAMTYPES, target, propertyKey) || []
    return this.filterInjectableTypes(paramTypes)
  }

  /**
   * Filters parameter types to identify which should be treated as injectable dependencies
   */
  private static filterInjectableTypes(paramTypes: any[]): Token[] {
    const dependencies: Token[] = []

    for (const paramType of paramTypes) {
      if (this.isObjectType(paramType)) {
        dependencies.push(paramType)
      }
    }

    return dependencies
  }

  /**
   * Determines if a parameter type represents an object that should be injected
   */
  private static isObjectType(paramType: any): boolean {
    if (!paramType || paramType === Object) {
      return false
    }

    // Check for primitive types that shouldn't be injected
    const primitives = [String, Number, Boolean, Symbol, BigInt]
    if (primitives.includes(paramType)) {
      return false
    }

    // Check for built-in objects that typically shouldn't be injected
    const builtIns = [Date, RegExp, Array, Map, Set, WeakMap, WeakSet, Promise]
    if (builtIns.includes(paramType)) {
      return false
    }

    // If it has a constructor and isn't a primitive, treat it as injectable
    return typeof paramType === 'function' && paramType.prototype
  }
}
