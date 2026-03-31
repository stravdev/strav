import { test, expect, describe } from 'bun:test'
import { computeCoherence, computeFailureProbability, detectOscillation } from '../src/system.ts'
import { DEFAULT_CONFIG } from '../src/config.ts'
import type { MutableStageScores, SystemInput } from '../src/types.ts'

describe('computeCoherence', () => {
  test('all equal high scores yield high coherence', () => {
    const scores: MutableStageScores = { I: 0.8, V: 0.8, L: 0.8, G: 0.8, Sc: 0.8 }
    // mean=0.8, variance=0, coherence = 0.8 * 1 = 0.8
    expect(computeCoherence(scores)).toBeCloseTo(0.8)
  })

  test('all zeros yield zero coherence', () => {
    const scores: MutableStageScores = { I: 0, V: 0, L: 0, G: 0, Sc: 0 }
    expect(computeCoherence(scores)).toBe(0)
  })

  test('spread scores yield lower coherence', () => {
    const equalScores: MutableStageScores = { I: 0.6, V: 0.6, L: 0.6, G: 0.6, Sc: 0.6 }
    const spreadScores: MutableStageScores = { I: 1, V: 0.5, L: 0.2, G: 0.8, Sc: 0.5 }
    expect(computeCoherence(spreadScores)).toBeLessThan(computeCoherence(equalScores))
  })

  test('high mean but high variance yields moderate coherence', () => {
    const scores: MutableStageScores = { I: 1, V: 0, L: 1, G: 0, Sc: 1 }
    // mean=0.6, variance=0.24, coherence = 0.6 * 0.76 = 0.456
    expect(computeCoherence(scores)).toBeCloseTo(0.456)
  })

  test('all ones yield max coherence', () => {
    const scores: MutableStageScores = { I: 1, V: 1, L: 1, G: 1, Sc: 1 }
    expect(computeCoherence(scores)).toBeCloseTo(1.0)
  })
})

describe('computeFailureProbability', () => {
  test('healthy venture has low failure probability', () => {
    const scores: MutableStageScores = { I: 0.8, V: 0.8, L: 0.8, G: 0.8, Sc: 0.8 }
    const system: SystemInput = {
      runwayRemaining: 12,
      expectedRunway: 12,
      availableCapital: 100000,
      requiredCapital: 100000,
    }
    // maturity=0.8, timeEff=1, resourceSust=1
    // P(F) = 1 - 0.8 = 0.2
    expect(computeFailureProbability(scores, system)).toBeCloseTo(0.2)
  })

  test('zero runway yields probability 1', () => {
    const scores: MutableStageScores = { I: 0.8, V: 0.8, L: 0.8, G: 0.8, Sc: 0.8 }
    const system: SystemInput = {
      runwayRemaining: 0,
      expectedRunway: 12,
      availableCapital: 100000,
      requiredCapital: 100000,
    }
    expect(computeFailureProbability(scores, system)).toBeCloseTo(1.0)
  })

  test('zero capital yields probability 1', () => {
    const scores: MutableStageScores = { I: 0.8, V: 0.8, L: 0.8, G: 0.8, Sc: 0.8 }
    const system: SystemInput = {
      runwayRemaining: 12,
      expectedRunway: 12,
      availableCapital: 0,
      requiredCapital: 100000,
    }
    expect(computeFailureProbability(scores, system)).toBeCloseTo(1.0)
  })

  test('all zeros yield probability 1', () => {
    const scores: MutableStageScores = { I: 0, V: 0, L: 0, G: 0, Sc: 0 }
    const system: SystemInput = {
      runwayRemaining: 0,
      expectedRunway: 0,
      availableCapital: 0,
      requiredCapital: 0,
    }
    expect(computeFailureProbability(scores, system)).toBeCloseTo(1.0)
  })

  test('excess resources still capped at 1', () => {
    const scores: MutableStageScores = { I: 1, V: 1, L: 1, G: 1, Sc: 1 }
    const system: SystemInput = {
      runwayRemaining: 24,
      expectedRunway: 12,
      availableCapital: 200000,
      requiredCapital: 100000,
    }
    // timeEff clamped to 1, resourceSust clamped to 1
    expect(computeFailureProbability(scores, system)).toBeCloseTo(0)
  })
})

describe('detectOscillation', () => {
  test('no previous state yields no oscillation', () => {
    const current: MutableStageScores = { I: 0.5, V: 0.5, L: 0.5, G: 0.5, Sc: 0.5 }
    const result = detectOscillation(current, null, 0, DEFAULT_CONFIG)
    expect(result.detected).toBe(false)
    expect(result.cycles).toBe(0)
    expect(result.recommendation).toBeNull()
  })

  test('significant change resets cycles', () => {
    const current: MutableStageScores = { I: 0.5, V: 0.5, L: 0.5, G: 0.5, Sc: 0.5 }
    const previous: MutableStageScores = { I: 0.3, V: 0.3, L: 0.3, G: 0.3, Sc: 0.3 }
    const result = detectOscillation(current, previous, 2, DEFAULT_CONFIG)
    // delta = 5 * 0.2 = 1.0 >> 0.05
    expect(result.detected).toBe(false)
    expect(result.cycles).toBe(0)
  })

  test('stagnant state increments cycles', () => {
    const current: MutableStageScores = { I: 0.5, V: 0.5, L: 0.5, G: 0.5, Sc: 0.5 }
    const previous: MutableStageScores = { I: 0.5, V: 0.5, L: 0.5, G: 0.5, Sc: 0.5 }
    const result = detectOscillation(current, previous, 1, DEFAULT_CONFIG)
    // delta = 0 < 0.05
    expect(result.cycles).toBe(2)
    expect(result.detected).toBe(false) // 2 < 3
  })

  test('oscillation detected after window size cycles', () => {
    const current: MutableStageScores = { I: 0.5, V: 0.5, L: 0.5, G: 0.5, Sc: 0.5 }
    const previous: MutableStageScores = { I: 0.5, V: 0.5, L: 0.5, G: 0.5, Sc: 0.5 }
    const result = detectOscillation(current, previous, 2, DEFAULT_CONFIG)
    // cycles = 3, oscillationWindowSize = 3
    expect(result.detected).toBe(true)
    expect(result.cycles).toBe(3)
    expect(result.recommendation).toContain('Structural intervention needed')
  })

  test('tiny change below threshold counts as stagnant', () => {
    const current: MutableStageScores = { I: 0.501, V: 0.5, L: 0.5, G: 0.5, Sc: 0.5 }
    const previous: MutableStageScores = { I: 0.5, V: 0.5, L: 0.5, G: 0.5, Sc: 0.5 }
    const result = detectOscillation(current, previous, 0, DEFAULT_CONFIG)
    // delta = 0.001 < 0.05
    expect(result.cycles).toBe(1)
  })

  test('change exactly at threshold is not stagnant', () => {
    const current: MutableStageScores = { I: 0.55, V: 0.5, L: 0.5, G: 0.5, Sc: 0.5 }
    const previous: MutableStageScores = { I: 0.5, V: 0.5, L: 0.5, G: 0.5, Sc: 0.5 }
    const result = detectOscillation(current, previous, 2, DEFAULT_CONFIG)
    // delta = 0.05, which is NOT < 0.05
    expect(result.cycles).toBe(0)
  })
})
