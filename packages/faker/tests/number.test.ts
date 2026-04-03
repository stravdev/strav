import { describe, it, expect } from 'bun:test'
import { faker } from '../src/index.ts'

describe('NumberGenerator', () => {
  it('should generate integers within range', () => {
    const num = faker.number.int(10, 20)
    expect(num).toBeGreaterThanOrEqual(10)
    expect(num).toBeLessThanOrEqual(20)
    expect(Number.isInteger(num)).toBe(true)
  })

  it('should generate floats within range', () => {
    const num = faker.number.float({ min: 1.5, max: 5.5, precision: 2 })
    expect(num).toBeGreaterThanOrEqual(1.5)
    expect(num).toBeLessThanOrEqual(5.5)
  })

  it('should generate bigints', () => {
    const bigintNum = faker.number.bigint()
    expect(typeof bigintNum).toBe('bigint')
  })

  it('should generate binary digits', () => {
    const binary = faker.number.binary()
    expect([0, 1]).toContain(binary)
  })

  it('should generate octal digits', () => {
    const octal = faker.number.octal()
    expect(octal).toBeGreaterThanOrEqual(0)
    expect(octal).toBeLessThanOrEqual(7)
  })

  it('should generate hex digits', () => {
    const hex = faker.number.hex()
    expect(hex).toBeGreaterThanOrEqual(0)
    expect(hex).toBeLessThanOrEqual(15)
  })
})