import { describe, test, expect } from 'bun:test'
import { ContainerException, ServiceNotFoundException, CircularDependencyException } from '../src'

describe('Error Classes', () => {
  test('ContainerException should extend Error', () => {
    const error = new ContainerException('test message', 'test-token')

    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('ContainerException')
    expect(error.message).toBe('test message')
    expect(error.token).toBe('test-token')
  })

  test('ServiceNotFoundException should format message correctly', () => {
    const error = new ServiceNotFoundException('UserService')

    expect(error).toBeInstanceOf(ContainerException)
    expect(error.name).toBe('ServiceNotFoundException')
    expect(error.message).toBe('Service not found: UserService')
    expect(error.token).toBe('UserService')
  })

  test('CircularDependencyException should format path correctly', () => {
    const path = ['ServiceA', 'ServiceB', 'ServiceC']
    const error = new CircularDependencyException(path)

    expect(error).toBeInstanceOf(ContainerException)
    expect(error.name).toBe('CircularDependencyException')
    expect(error.message).toBe('Circular dependency detected: ServiceA -> ServiceB -> ServiceC')
  })
})
