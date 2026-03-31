import { test, expect, describe } from 'bun:test'
import { resolveInput } from '../src/signals.ts'

describe('resolveInput', () => {
  test('passes value through when effective confidence >= 0.5', () => {
    const result = resolveInput({ value: 0.8, extractionConfidence: 0.9, signalTrust: 0.8 })
    expect(result.value).toBe(0.8)
    expect(result.dampened).toBe(false)
  })

  test('dampens value when effective confidence is 0.2–0.5', () => {
    const result = resolveInput({ value: 0.8, extractionConfidence: 0.5, signalTrust: 0.5 })
    // effective = 0.25, dampingFactor = 0.5
    expect(result.value).toBeCloseTo(0.5 + (0.8 - 0.5) * 0.5)
    expect(result.dampened).toBe(true)
  })

  test('returns null when effective confidence < 0.2', () => {
    const result = resolveInput({ value: 0.8, extractionConfidence: 0.3, signalTrust: 0.3 })
    // effective = 0.09
    expect(result.value).toBeNull()
    expect(result.dampened).toBe(false)
  })

  test('handles boundary at exactly 0.5', () => {
    const result = resolveInput({ value: 0.7, extractionConfidence: 1.0, signalTrust: 0.5 })
    expect(result.value).toBe(0.7)
    expect(result.dampened).toBe(false)
  })

  test('handles boundary at exactly 0.2', () => {
    const result = resolveInput({ value: 0.9, extractionConfidence: 0.5, signalTrust: 0.4 })
    // effective = 0.2
    expect(result.value).toBeCloseTo(0.5 + (0.9 - 0.5) * 0.4)
    expect(result.dampened).toBe(true)
  })

  test('dampening moves value toward 0.5', () => {
    const highResult = resolveInput({ value: 0.9, extractionConfidence: 0.6, signalTrust: 0.5 })
    expect(highResult.value).toBeLessThan(0.9)
    expect(highResult.value).toBeGreaterThan(0.5)

    const lowResult = resolveInput({ value: 0.1, extractionConfidence: 0.6, signalTrust: 0.5 })
    expect(lowResult.value).toBeGreaterThan(0.1)
    expect(lowResult.value).toBeLessThan(0.5)
  })

  test('perfect confidence passes value unchanged', () => {
    const result = resolveInput({ value: 0.42, extractionConfidence: 1.0, signalTrust: 1.0 })
    expect(result.value).toBe(0.42)
    expect(result.dampened).toBe(false)
  })

  test('zero confidence returns null', () => {
    const result = resolveInput({ value: 0.5, extractionConfidence: 0.0, signalTrust: 0.0 })
    expect(result.value).toBeNull()
  })
})
