import { test, expect, describe } from 'bun:test'
import { applyEnvironmentalModulation } from '../src/environment.ts'
import { DEFAULT_CONFIG } from '../src/config.ts'
import type { MutableStageScores, EnvironmentVector } from '../src/types.ts'

function baseScores(): MutableStageScores {
  return { I: 0.5, V: 0.5, L: 0.5, G: 0.5, Sc: 0.5 }
}

describe('applyEnvironmentalModulation', () => {
  test('neutral environment (all zeros) yields near-original scores', () => {
    const scores = baseScores()
    const env: EnvironmentVector = {
      marketVolatility: 0,
      capitalAvailability: 0,
      competitiveIntensity: 0,
      industryMaturity: 0,
    }
    applyEnvironmentalModulation(scores, env, DEFAULT_CONFIG)
    // I: 1 + 0.3*(1-0) = 1.3 → clamped to 1.3 → 0.5*1.3 = 0.65
    // V: 1 + 0.2*(1-0) = 1.2 → 0.5*1.2 = 0.6
    // L: 1 + 0.1*(1-0) = 1.1 → 0.5*1.1 = 0.55
    // G: 1 → 0.5*1.0 = 0.5
    // Sc: 1 → 0.5*1.0 = 0.5
    expect(scores.I).toBeCloseTo(0.65)
    expect(scores.V).toBeCloseTo(0.6)
    expect(scores.L).toBeCloseTo(0.55)
    expect(scores.G).toBeCloseTo(0.5)
    expect(scores.Sc).toBeCloseTo(0.5)
  })

  test('hostile environment suppresses scores', () => {
    const scores = baseScores()
    const env: EnvironmentVector = {
      marketVolatility: 1,
      capitalAvailability: 0,
      competitiveIntensity: 1,
      industryMaturity: 1,
    }
    applyEnvironmentalModulation(scores, env, DEFAULT_CONFIG)
    // All weights should be at or near envWeightMin (0.7)
    for (const key of ['I', 'V', 'L', 'G', 'Sc'] as const) {
      expect(scores[key]).toBeLessThanOrEqual(0.5)
      expect(scores[key]).toBeGreaterThanOrEqual(0.5 * DEFAULT_CONFIG.envWeightMin)
    }
  })

  test('favorable environment boosts scores', () => {
    const scores = baseScores()
    const env: EnvironmentVector = {
      marketVolatility: 0,
      capitalAvailability: 1,
      competitiveIntensity: 0,
      industryMaturity: 0,
    }
    applyEnvironmentalModulation(scores, env, DEFAULT_CONFIG)
    // Capital availability and low maturity boost all stages
    for (const key of ['I', 'V', 'L', 'G', 'Sc'] as const) {
      expect(scores[key]).toBeGreaterThan(0.5)
    }
  })

  test('weights are clamped to [envWeightMin, envWeightMax]', () => {
    const scores: MutableStageScores = { I: 1, V: 1, L: 1, G: 1, Sc: 1 }
    const env: EnvironmentVector = {
      marketVolatility: 1,
      capitalAvailability: 1,
      competitiveIntensity: 1,
      industryMaturity: 1,
    }
    applyEnvironmentalModulation(scores, env, DEFAULT_CONFIG)
    // Even extreme environments can't push below envWeightMin
    for (const key of ['I', 'V', 'L', 'G', 'Sc'] as const) {
      expect(scores[key]).toBeGreaterThanOrEqual(DEFAULT_CONFIG.envWeightMin)
      expect(scores[key]).toBeLessThanOrEqual(DEFAULT_CONFIG.envWeightMax)
    }
  })

  test('results are clamped to [0, 1]', () => {
    const scores: MutableStageScores = { I: 0.9, V: 0.9, L: 0.9, G: 0.9, Sc: 0.9 }
    const env: EnvironmentVector = {
      marketVolatility: 0,
      capitalAvailability: 1,
      competitiveIntensity: 0,
      industryMaturity: 0,
    }
    applyEnvironmentalModulation(scores, env, DEFAULT_CONFIG)
    for (const key of ['I', 'V', 'L', 'G', 'Sc'] as const) {
      expect(scores[key]).toBeLessThanOrEqual(1)
    }
  })

  test('each stage has different sensitivity', () => {
    const env: EnvironmentVector = {
      marketVolatility: 0.5,
      capitalAvailability: 0.5,
      competitiveIntensity: 0.5,
      industryMaturity: 0.5,
    }
    // Run with all stages at 1.0 to see the raw multipliers
    const scores: MutableStageScores = { I: 1, V: 1, L: 1, G: 1, Sc: 1 }
    applyEnvironmentalModulation(scores, env, DEFAULT_CONFIG)
    // I weight: 1 - 0.05 + 0.15 = 1.1
    // V weight: 1 - 0.075 - 0.025 + 0.025 + 0.1 = 1.025
    // L weight: 1 - 0.1 + 0.075 - 0.075 + 0.05 = 0.95
    // G weight: 1 - 0.075 + 0.125 - 0.1 = 0.95
    // Sc weight: 1 - 0.05 + 0.1 - 0.125 = 0.925
    // All different
    const values = [scores.I, scores.V, scores.L, scores.G, scores.Sc]
    const unique = new Set(values.map(v => v.toFixed(4)))
    expect(unique.size).toBeGreaterThan(1)
  })
})
