import { test, expect, describe } from 'bun:test'
import { computeCoherence, computeDerailmentRisk, detectOscillation } from '../src/system.ts'
import { DEFAULT_CONFIG } from '../src/config.ts'
import type { MutableStageScores, SystemInput } from '../src/types.ts'

describe('computeCoherence', () => {
  test('equal high scores yield high coherence', () => {
    const scores: MutableStageScores = { D: 0.8, Ex: 0.8, A: 0.8, T: 0.8, Es: 0.8 }
    expect(computeCoherence(scores)).toBeCloseTo(0.8 * (1 - 0))
  })

  test('all zeros yield zero coherence', () => {
    const scores: MutableStageScores = { D: 0, Ex: 0, A: 0, T: 0, Es: 0 }
    expect(computeCoherence(scores)).toBe(0)
  })

  test('spread scores reduce coherence via variance penalty', () => {
    const equal: MutableStageScores = { D: 0.5, Ex: 0.5, A: 0.5, T: 0.5, Es: 0.5 }
    const spread: MutableStageScores = { D: 0.1, Ex: 0.9, A: 0.1, T: 0.9, Es: 0.5 }
    expect(computeCoherence(spread)).toBeLessThan(computeCoherence(equal))
  })

  test('coherence is in [0, 1]', () => {
    const scores: MutableStageScores = { D: 0.3, Ex: 0.7, A: 0.5, T: 0.2, Es: 0.8 }
    const c = computeCoherence(scores)
    expect(c).toBeGreaterThanOrEqual(0)
    expect(c).toBeLessThanOrEqual(1)
  })
})

describe('computeDerailmentRisk', () => {
  test('healthy user has low derailment risk', () => {
    const scores: MutableStageScores = { D: 0.8, Ex: 0.8, A: 0.8, T: 0.8, Es: 0.8 }
    const system: SystemInput = {
      timeAtCurrentStage: 2, expectedStageTime: 3,
      financialRunway: 12, energyReserves: 0.8, supportStrength: 0.8,
    }
    const risk = computeDerailmentRisk(scores, system)
    expect(risk).toBeLessThan(0.5)
  })

  test('zero stage maturity yields high risk', () => {
    const scores: MutableStageScores = { D: 0, Ex: 0, A: 0, T: 0, Es: 0 }
    const system: SystemInput = {
      timeAtCurrentStage: 2, expectedStageTime: 3,
      financialRunway: 12, energyReserves: 0.8, supportStrength: 0.8,
    }
    const risk = computeDerailmentRisk(scores, system)
    expect(risk).toBeCloseTo(1.0)
  })

  test('zero financial runway increases risk', () => {
    const scores: MutableStageScores = { D: 0.8, Ex: 0.8, A: 0.8, T: 0.8, Es: 0.8 }
    const system: SystemInput = {
      timeAtCurrentStage: 2, expectedStageTime: 3,
      financialRunway: 0, energyReserves: 0.8, supportStrength: 0.8,
    }
    const highRisk = computeDerailmentRisk(scores, system)
    const system2: SystemInput = { ...system, financialRunway: 12 }
    const lowRisk = computeDerailmentRisk(scores, system2)
    expect(highRisk).toBeGreaterThan(lowRisk)
  })

  test('zero energy reserves increases risk', () => {
    const scores: MutableStageScores = { D: 0.8, Ex: 0.8, A: 0.8, T: 0.8, Es: 0.8 }
    const system: SystemInput = {
      timeAtCurrentStage: 2, expectedStageTime: 3,
      financialRunway: 12, energyReserves: 0, supportStrength: 0.8,
    }
    const highRisk = computeDerailmentRisk(scores, system)
    const system2: SystemInput = { ...system, energyReserves: 0.8 }
    const lowRisk = computeDerailmentRisk(scores, system2)
    expect(highRisk).toBeGreaterThan(lowRisk)
  })

  test('exceeding expected stage time increases risk via pace efficiency', () => {
    const scores: MutableStageScores = { D: 0.8, Ex: 0.8, A: 0.8, T: 0.8, Es: 0.8 }
    const slow: SystemInput = {
      timeAtCurrentStage: 12, expectedStageTime: 3,
      financialRunway: 12, energyReserves: 0.8, supportStrength: 0.8,
    }
    const fast: SystemInput = {
      timeAtCurrentStage: 1, expectedStageTime: 3,
      financialRunway: 12, energyReserves: 0.8, supportStrength: 0.8,
    }
    expect(computeDerailmentRisk(scores, slow)).toBeGreaterThan(computeDerailmentRisk(scores, fast))
  })

  test('risk is in [0, 1]', () => {
    const scores: MutableStageScores = { D: 0.5, Ex: 0.5, A: 0.5, T: 0.5, Es: 0.5 }
    const system: SystemInput = {
      timeAtCurrentStage: 5, expectedStageTime: 3,
      financialRunway: 6, energyReserves: 0.5, supportStrength: 0.5,
    }
    const risk = computeDerailmentRisk(scores, system)
    expect(risk).toBeGreaterThanOrEqual(0)
    expect(risk).toBeLessThanOrEqual(1)
  })
})

describe('detectOscillation', () => {
  test('no previous state yields no oscillation', () => {
    const scores: MutableStageScores = { D: 0.5, Ex: 0.5, A: 0.5, T: 0.5, Es: 0.5 }
    const result = detectOscillation(scores, null, 0, DEFAULT_CONFIG)
    expect(result.detected).toBe(false)
    expect(result.cycles).toBe(0)
    expect(result.recommendation).toBeNull()
  })

  test('significant change resets stagnant cycles', () => {
    const prev: MutableStageScores = { D: 0.3, Ex: 0.3, A: 0.3, T: 0.3, Es: 0.3 }
    const current: MutableStageScores = { D: 0.8, Ex: 0.8, A: 0.8, T: 0.8, Es: 0.8 }
    const result = detectOscillation(current, prev, 5, DEFAULT_CONFIG)
    expect(result.cycles).toBe(0)
    expect(result.detected).toBe(false)
  })

  test('stagnant cycle increments counter', () => {
    const scores: MutableStageScores = { D: 0.5, Ex: 0.5, A: 0.5, T: 0.5, Es: 0.5 }
    const result = detectOscillation(scores, scores, 0, DEFAULT_CONFIG)
    expect(result.cycles).toBe(1)
    expect(result.detected).toBe(false)
  })

  test('detected after reaching oscillation window size', () => {
    const scores: MutableStageScores = { D: 0.5, Ex: 0.5, A: 0.5, T: 0.5, Es: 0.5 }
    const result = detectOscillation(scores, scores, 2, DEFAULT_CONFIG)
    expect(result.cycles).toBe(3)
    expect(result.detected).toBe(true)
    expect(result.recommendation).toContain('different approach')
  })

  test('recommendation includes career-specific advice', () => {
    const scores: MutableStageScores = { D: 0.5, Ex: 0.5, A: 0.5, T: 0.5, Es: 0.5 }
    const result = detectOscillation(scores, scores, 2, DEFAULT_CONFIG)
    expect(result.recommendation).toContain('external coaching')
    expect(result.recommendation).toContain('reassessing timing')
  })
})
