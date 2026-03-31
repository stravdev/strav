import { test, expect, describe } from 'bun:test'
import { resolveInput } from '../src/signals.ts'

describe('resolveInput', () => {
  test('high confidence passes value through', () => {
    const result = resolveInput({ value: 0.8, extractionConfidence: 0.9, signalTrust: 0.8 })
    // effective = 0.72 >= 0.5
    expect(result.value).toBe(0.8)
    expect(result.dampened).toBe(false)
  })

  test('exactly 0.5 effective confidence passes through', () => {
    const result = resolveInput({ value: 0.7, extractionConfidence: 1.0, signalTrust: 0.5 })
    expect(result.value).toBe(0.7)
    expect(result.dampened).toBe(false)
  })

  test('medium confidence dampens toward 0.5', () => {
    // Spec example: extraction 0.9, trust 0.45, value 0.8
    // effective = 0.405, dampingFactor = 0.405/0.5 = 0.81
    // resolved = 0.5 + (0.8 - 0.5) * 0.81 = 0.5 + 0.243 = 0.743
    const result = resolveInput({ value: 0.8, extractionConfidence: 0.9, signalTrust: 0.45 })
    expect(result.value).toBeCloseTo(0.743)
    expect(result.dampened).toBe(true)
  })

  test('medium confidence dampens low values upward toward 0.5', () => {
    // value = 0.2, effective = 0.3, dampingFactor = 0.6
    // resolved = 0.5 + (0.2 - 0.5) * 0.6 = 0.5 - 0.18 = 0.32
    const result = resolveInput({ value: 0.2, extractionConfidence: 0.5, signalTrust: 0.6 })
    expect(result.value).toBeCloseTo(0.32)
    expect(result.dampened).toBe(true)
  })

  test('exactly 0.2 effective confidence still dampens', () => {
    const result = resolveInput({ value: 0.9, extractionConfidence: 0.4, signalTrust: 0.5 })
    // effective = 0.2, dampingFactor = 0.4
    // resolved = 0.5 + (0.9 - 0.5) * 0.4 = 0.5 + 0.16 = 0.66
    expect(result.value).toBeCloseTo(0.66)
    expect(result.dampened).toBe(true)
  })

  test('low confidence returns null', () => {
    const result = resolveInput({ value: 0.8, extractionConfidence: 0.3, signalTrust: 0.5 })
    // effective = 0.15 < 0.2
    expect(result.value).toBeNull()
    expect(result.dampened).toBe(false)
  })

  test('zero confidence returns null', () => {
    const result = resolveInput({ value: 0.8, extractionConfidence: 0, signalTrust: 0 })
    expect(result.value).toBeNull()
    expect(result.dampened).toBe(false)
  })

  test('value at 0.5 stays at 0.5 when dampened', () => {
    const result = resolveInput({ value: 0.5, extractionConfidence: 0.5, signalTrust: 0.5 })
    // effective = 0.25, dampingFactor = 0.5
    // resolved = 0.5 + (0.5 - 0.5) * 0.5 = 0.5
    expect(result.value).toBeCloseTo(0.5)
    expect(result.dampened).toBe(true)
  })
})
