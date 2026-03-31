import { test, expect, describe } from 'bun:test'
import {
  computeIdeationScore,
  computeValidationScore,
  computeLaunchScore,
  computeGrowthScore,
  computeScaleScore,
} from '../src/stages.ts'
import { DEFAULT_CONFIG } from '../src/config.ts'

describe('computeIdeationScore', () => {
  test('all zeros returns 0.15 (AD inverse at min)', () => {
    // AD=0 → max(0,1)=1 → normalizeInverse(1,1,10)=1, so 0.15*1=0.15
    const score = computeIdeationScore({
      problemClarityScore: 0,
      solutionSpecificity: 0,
      assumptionDensity: 0,
      layerAlignment: 0,
    })
    expect(score).toBeCloseTo(0.15)
  })

  test('all ones returns weighted sum', () => {
    // PCS=1, SS=1, AD=1→normalizeInverse(1,1,10)=1, LA=1
    // 0.35 + 0.35 + 0.15 + 0.15 = 1.0
    const score = computeIdeationScore({
      problemClarityScore: 1,
      solutionSpecificity: 1,
      assumptionDensity: 1,
      layerAlignment: 1,
    })
    expect(score).toBeCloseTo(1.0)
  })

  test('high assumption density reduces score', () => {
    // AD=10 → normalizeInverse(10,1,10)=0
    const score = computeIdeationScore({
      problemClarityScore: 1,
      solutionSpecificity: 1,
      assumptionDensity: 10,
      layerAlignment: 1,
    })
    // 0.35 + 0.35 + 0 + 0.15 = 0.85
    expect(score).toBeCloseTo(0.85)
  })

  test('mixed values compute correctly', () => {
    const score = computeIdeationScore({
      problemClarityScore: 0.8,
      solutionSpecificity: 0.6,
      assumptionDensity: 5,
      layerAlignment: 0.7,
    })
    // AD=5 → normalizeInverse(5,1,10) = 1 - (5-1)/(10-1) = 1 - 4/9 ≈ 0.5556
    // 0.35*0.8 + 0.35*0.6 + 0.15*0.5556 + 0.15*0.7
    // = 0.28 + 0.21 + 0.0833 + 0.105 = 0.6783
    expect(score).toBeCloseTo(0.6783, 3)
  })

  test('clamps inputs above 1', () => {
    const score = computeIdeationScore({
      problemClarityScore: 1.5,
      solutionSpecificity: 1.5,
      assumptionDensity: 1,
      layerAlignment: 1.5,
    })
    // All clamped to 1: 0.35 + 0.35 + 0.15 + 0.15 = 1.0
    expect(score).toBeCloseTo(1.0)
  })
})

describe('computeValidationScore', () => {
  test('all zeros returns 0', () => {
    const score = computeValidationScore({
      hypothesisConversionRate: 0,
      evidenceStrength: 0,
      signalNoiseRatio: 0,
    })
    expect(score).toBe(0)
  })

  test('all ones returns 1', () => {
    const score = computeValidationScore({
      hypothesisConversionRate: 1,
      evidenceStrength: 1,
      signalNoiseRatio: 1,
    })
    expect(score).toBeCloseTo(1.0)
  })

  test('mixed values', () => {
    const score = computeValidationScore({
      hypothesisConversionRate: 0.8,
      evidenceStrength: 0.6,
      signalNoiseRatio: 0.5,
    })
    // 0.5*0.8 + 0.3*0.6 + 0.2*0.5 = 0.4 + 0.18 + 0.1 = 0.68
    expect(score).toBeCloseTo(0.68)
  })
})

describe('computeLaunchScore', () => {
  test('all zeros returns 0', () => {
    const score = computeLaunchScore(
      {
        buildCompletionPercentage: 0,
        userAcquisitionRate: 0,
        retentionRate: 0,
        usageFrequency: 0,
        userSatisfaction: 0,
      },
      DEFAULT_CONFIG
    )
    expect(score).toBe(0)
  })

  test('max values returns 1', () => {
    const score = computeLaunchScore(
      {
        buildCompletionPercentage: 1,
        userAcquisitionRate: DEFAULT_CONFIG.expectedMaxUAR,
        retentionRate: 1,
        usageFrequency: 1,
        userSatisfaction: 1,
      },
      DEFAULT_CONFIG
    )
    expect(score).toBeCloseTo(1.0)
  })

  test('UAR normalization uses config', () => {
    const config = { ...DEFAULT_CONFIG, expectedMaxUAR: 500 }
    const score = computeLaunchScore(
      {
        buildCompletionPercentage: 1,
        userAcquisitionRate: 250, // half of max
        retentionRate: 0,
        usageFrequency: 0,
        userSatisfaction: 0,
      },
      config
    )
    // 0.4*1 + 0.3*0.5 + 0.3*0 = 0.55
    expect(score).toBeCloseTo(0.55)
  })

  test('PMF composite computes correctly', () => {
    const score = computeLaunchScore(
      {
        buildCompletionPercentage: 0,
        userAcquisitionRate: 0,
        retentionRate: 0.8,
        usageFrequency: 0.6,
        userSatisfaction: 0.9,
      },
      DEFAULT_CONFIG
    )
    // PMF = 0.4*0.8 + 0.3*0.6 + 0.3*0.9 = 0.32 + 0.18 + 0.27 = 0.77
    // score = 0.3 * 0.77 = 0.231
    expect(score).toBeCloseTo(0.231)
  })
})

describe('computeGrowthScore', () => {
  test('all zeros', () => {
    const score = computeGrowthScore({
      revenueGrowthRate: -0.2, // min of range
      cacEfficiencyTrend: 0,
      retentionDynamics: 0,
    })
    expect(score).toBe(0)
  })

  test('max values returns 1', () => {
    const score = computeGrowthScore({
      revenueGrowthRate: 0.5, // max of range
      cacEfficiencyTrend: 1,
      retentionDynamics: 1,
    })
    expect(score).toBeCloseTo(1.0)
  })

  test('RGR normalization from [-0.2, 0.5]', () => {
    const score = computeGrowthScore({
      revenueGrowthRate: 0.15, // midpoint of [-0.2, 0.5]
      cacEfficiencyTrend: 0,
      retentionDynamics: 0,
    })
    // normalize(0.15, -0.2, 0.5) = (0.15+0.2)/0.7 = 0.5
    // 0.4*0.5 = 0.2
    expect(score).toBeCloseTo(0.2)
  })
})

describe('computeScaleScore', () => {
  test('all zeros returns 0', () => {
    const score = computeScaleScore({
      operationalEfficiencyIndex: 0,
      marketShareGrowth: 0,
      systemScalabilityScore: 0,
    })
    expect(score).toBe(0)
  })

  test('all ones returns 1', () => {
    const score = computeScaleScore({
      operationalEfficiencyIndex: 1,
      marketShareGrowth: 1,
      systemScalabilityScore: 1,
    })
    expect(score).toBeCloseTo(1.0)
  })

  test('mixed values', () => {
    const score = computeScaleScore({
      operationalEfficiencyIndex: 0.7,
      marketShareGrowth: 0.5,
      systemScalabilityScore: 0.8,
    })
    // 0.4*0.7 + 0.3*0.5 + 0.3*0.8 = 0.28 + 0.15 + 0.24 = 0.67
    expect(score).toBeCloseTo(0.67)
  })
})
