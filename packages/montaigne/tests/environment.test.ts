import { test, expect, describe } from 'bun:test'
import { applyEnvironmentalModulation } from '../src/environment.ts'
import { DEFAULT_CONFIG } from '../src/config.ts'
import type { MutableStageScores, EnvironmentVector } from '../src/types.ts'

function baseScores(): MutableStageScores {
  return { D: 0.5, Ex: 0.5, A: 0.5, T: 0.5, Es: 0.5 }
}

describe('applyEnvironmentalModulation', () => {
  test('neutral environment preserves scores near original', () => {
    const scores = baseScores()
    const neutral: EnvironmentVector = {
      jobMarketConditions: 0, financialRunway: 0, roleCompetition: 0.5, industryTrajectory: 0,
    }
    applyEnvironmentalModulation(scores, neutral, DEFAULT_CONFIG)
    // With zero positive factors and rc=0.5, multipliers are close to 1
    for (const key of ['D', 'Ex', 'A', 'T', 'Es'] as const) {
      expect(scores[key]).toBeGreaterThan(0)
      expect(scores[key]).toBeLessThanOrEqual(1)
    }
  })

  test('favorable environment boosts scores', () => {
    const original = baseScores()
    const boosted = baseScores()
    const favorable: EnvironmentVector = {
      jobMarketConditions: 1, financialRunway: 1, roleCompetition: 1, industryTrajectory: 1,
    }
    applyEnvironmentalModulation(boosted, favorable, DEFAULT_CONFIG)
    expect(boosted.Ex).toBeGreaterThan(original.Ex)
    expect(boosted.A).toBeGreaterThan(original.A)
    expect(boosted.T).toBeGreaterThan(original.T)
    expect(boosted.Es).toBeGreaterThan(original.Es)
  })

  test('hostile environment suppresses scores', () => {
    const original = baseScores()
    const suppressed = baseScores()
    const hostile: EnvironmentVector = {
      jobMarketConditions: 0, financialRunway: 0, roleCompetition: 0, industryTrajectory: 0,
    }
    applyEnvironmentalModulation(suppressed, hostile, DEFAULT_CONFIG)
    expect(suppressed.T).toBeLessThan(original.T)
    expect(suppressed.Es).toBeLessThan(original.Es)
  })

  test('Discovery is least affected by externals', () => {
    const scores1 = baseScores()
    const scores2 = baseScores()
    const favorable: EnvironmentVector = {
      jobMarketConditions: 1, financialRunway: 1, roleCompetition: 1, industryTrajectory: 1,
    }
    const hostile: EnvironmentVector = {
      jobMarketConditions: 0, financialRunway: 0, roleCompetition: 0, industryTrajectory: 0,
    }
    applyEnvironmentalModulation(scores1, favorable, DEFAULT_CONFIG)
    applyEnvironmentalModulation(scores2, hostile, DEFAULT_CONFIG)
    const dRange = scores1.D - scores2.D
    const tRange = scores1.T - scores2.T
    // Discovery has smaller sensitivity range than Transition
    expect(dRange).toBeLessThan(tRange)
  })

  test('Transition is most affected by externals', () => {
    const scores1 = baseScores()
    const scores2 = baseScores()
    const favorable: EnvironmentVector = {
      jobMarketConditions: 1, financialRunway: 1, roleCompetition: 1, industryTrajectory: 1,
    }
    const hostile: EnvironmentVector = {
      jobMarketConditions: 0, financialRunway: 0, roleCompetition: 0, industryTrajectory: 0,
    }
    applyEnvironmentalModulation(scores1, favorable, DEFAULT_CONFIG)
    applyEnvironmentalModulation(scores2, hostile, DEFAULT_CONFIG)
    const tRange = scores1.T - scores2.T
    const dRange = scores1.D - scores2.D
    const exRange = scores1.Ex - scores2.Ex
    const aRange = scores1.A - scores2.A
    const esRange = scores1.Es - scores2.Es
    expect(tRange).toBeGreaterThan(dRange)
    expect(tRange).toBeGreaterThanOrEqual(exRange)
    expect(tRange).toBeGreaterThanOrEqual(aRange)
    expect(tRange).toBeGreaterThanOrEqual(esRange)
  })

  test('weights are clamped to [envWeightMin, envWeightMax]', () => {
    const scores = baseScores()
    const extreme: EnvironmentVector = {
      jobMarketConditions: 1, financialRunway: 1, roleCompetition: 1, industryTrajectory: 1,
    }
    applyEnvironmentalModulation(scores, extreme, DEFAULT_CONFIG)
    // All scores should be multiplied by at most envWeightMax
    for (const key of ['D', 'Ex', 'A', 'T', 'Es'] as const) {
      expect(scores[key]).toBeLessThanOrEqual(0.5 * DEFAULT_CONFIG.envWeightMax)
    }
  })
})
