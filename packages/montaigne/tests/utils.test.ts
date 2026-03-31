import { test, expect, describe } from 'bun:test'
import { clamp, normalize, normalizeInverse, average, variance, clampStageScores } from '../src/utils.ts'

describe('clamp', () => {
  test('returns value when within range', () => {
    expect(clamp(0.5, 0, 1)).toBe(0.5)
  })
  test('clamps below min', () => {
    expect(clamp(-1, 0, 1)).toBe(0)
  })
  test('clamps above max', () => {
    expect(clamp(2, 0, 1)).toBe(1)
  })
  test('returns min when equal', () => {
    expect(clamp(0, 0, 1)).toBe(0)
  })
  test('returns max when equal', () => {
    expect(clamp(1, 0, 1)).toBe(1)
  })
})

describe('normalize', () => {
  test('maps min to 0', () => {
    expect(normalize(0, 0, 10)).toBe(0)
  })
  test('maps max to 1', () => {
    expect(normalize(10, 0, 10)).toBe(1)
  })
  test('maps midpoint to 0.5', () => {
    expect(normalize(5, 0, 10)).toBe(0.5)
  })
  test('returns 0 when min equals max', () => {
    expect(normalize(5, 5, 5)).toBe(0)
  })
  test('clamps below min', () => {
    expect(normalize(-5, 0, 10)).toBe(0)
  })
  test('clamps above max', () => {
    expect(normalize(15, 0, 10)).toBe(1)
  })
})

describe('normalizeInverse', () => {
  test('maps min to 1', () => {
    expect(normalizeInverse(0, 0, 10)).toBe(1)
  })
  test('maps max to 0', () => {
    expect(normalizeInverse(10, 0, 10)).toBe(0)
  })
  test('maps midpoint to 0.5', () => {
    expect(normalizeInverse(5, 0, 10)).toBe(0.5)
  })
})

describe('average', () => {
  test('computes mean of values', () => {
    expect(average([2, 4, 6])).toBe(4)
  })
  test('returns 0 for empty array', () => {
    expect(average([])).toBe(0)
  })
  test('returns the single value for one element', () => {
    expect(average([7])).toBe(7)
  })
})

describe('variance', () => {
  test('returns 0 for identical values', () => {
    expect(variance([5, 5, 5])).toBe(0)
  })
  test('returns 0 for empty array', () => {
    expect(variance([])).toBe(0)
  })
  test('computes population variance', () => {
    // [2, 4, 6] → mean=4, diffs=[4,0,4], variance=8/3
    expect(variance([2, 4, 6])).toBeCloseTo(8 / 3)
  })
})

describe('clampStageScores', () => {
  test('clamps all stages to [0, 1]', () => {
    const scores = { D: -0.5, Ex: 1.5, A: 0.5, T: -1, Es: 2 }
    const result = clampStageScores(scores)
    expect(result.D).toBe(0)
    expect(result.Ex).toBe(1)
    expect(result.A).toBe(0.5)
    expect(result.T).toBe(0)
    expect(result.Es).toBe(1)
  })

  test('returns same reference (mutates in place)', () => {
    const scores = { D: 0.5, Ex: 0.5, A: 0.5, T: 0.5, Es: 0.5 }
    const result = clampStageScores(scores)
    expect(result).toBe(scores)
  })
})
