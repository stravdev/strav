import { test, expect, describe } from 'bun:test'
import { clamp, normalize, normalizeInverse, average, variance, clampStageScores } from '../src/utils.ts'

describe('clamp', () => {
  test('returns value when within range', () => {
    expect(clamp(0.5, 0, 1)).toBe(0.5)
  })

  test('clamps to min when below', () => {
    expect(clamp(-0.5, 0, 1)).toBe(0)
  })

  test('clamps to max when above', () => {
    expect(clamp(1.5, 0, 1)).toBe(1)
  })

  test('returns min when min equals max', () => {
    expect(clamp(5, 3, 3)).toBe(3)
  })

  test('handles negative ranges', () => {
    expect(clamp(0, -1, -0.5)).toBe(-0.5)
  })
})

describe('normalize', () => {
  test('normalizes value within range', () => {
    expect(normalize(5, 0, 10)).toBe(0.5)
  })

  test('returns 0 for min value', () => {
    expect(normalize(0, 0, 10)).toBe(0)
  })

  test('returns 1 for max value', () => {
    expect(normalize(10, 0, 10)).toBe(1)
  })

  test('clamps below min to 0', () => {
    expect(normalize(-5, 0, 10)).toBe(0)
  })

  test('clamps above max to 1', () => {
    expect(normalize(15, 0, 10)).toBe(1)
  })

  test('returns 0 when min equals max', () => {
    expect(normalize(5, 5, 5)).toBe(0)
  })
})

describe('normalizeInverse', () => {
  test('inverts normalized value', () => {
    expect(normalizeInverse(5, 0, 10)).toBe(0.5)
  })

  test('returns 1 for min value', () => {
    expect(normalizeInverse(0, 0, 10)).toBe(1)
  })

  test('returns 0 for max value', () => {
    expect(normalizeInverse(10, 0, 10)).toBe(0)
  })
})

describe('average', () => {
  test('computes average of values', () => {
    expect(average([1, 2, 3, 4, 5])).toBe(3)
  })

  test('handles single element', () => {
    expect(average([7])).toBe(7)
  })

  test('returns 0 for empty array', () => {
    expect(average([])).toBe(0)
  })

  test('handles decimal values', () => {
    expect(average([0.2, 0.4, 0.6])).toBeCloseTo(0.4)
  })
})

describe('variance', () => {
  test('returns 0 for uniform values', () => {
    expect(variance([5, 5, 5, 5, 5])).toBe(0)
  })

  test('computes variance correctly', () => {
    // mean = 3, deviations = [-2,-1,0,1,2], squared = [4,1,0,1,4], avg = 2
    expect(variance([1, 2, 3, 4, 5])).toBe(2)
  })

  test('handles single element', () => {
    expect(variance([7])).toBe(0)
  })

  test('returns 0 for empty array', () => {
    expect(variance([])).toBe(0)
  })
})

describe('clampStageScores', () => {
  test('clamps all scores to [0, 1]', () => {
    const scores = { I: -0.2, V: 1.5, L: 0.5, G: 0, Sc: 1 }
    const result = clampStageScores(scores)
    expect(result.I).toBe(0)
    expect(result.V).toBe(1)
    expect(result.L).toBe(0.5)
    expect(result.G).toBe(0)
    expect(result.Sc).toBe(1)
  })

  test('returns the same object (mutates in place)', () => {
    const scores = { I: 0.5, V: 0.5, L: 0.5, G: 0.5, Sc: 0.5 }
    const result = clampStageScores(scores)
    expect(result).toBe(scores)
  })
})
