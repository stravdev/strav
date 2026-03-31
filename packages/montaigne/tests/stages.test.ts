import { test, expect, describe } from 'bun:test'
import {
  computeDiscoveryScore,
  computeExplorationScore,
  computeAlignmentScore,
  computeTransitionScore,
  computeEstablishmentScore,
} from '../src/stages.ts'

describe('computeDiscoveryScore', () => {
  test('returns 0 for all zeros', () => {
    expect(computeDiscoveryScore({ selfKnowledgeScore: 0, satisfactionGap: 0, readinessPosture: 0 })).toBe(0)
  })

  test('returns 1 for all ones', () => {
    expect(computeDiscoveryScore({ selfKnowledgeScore: 1, satisfactionGap: 1, readinessPosture: 1 })).toBe(1)
  })

  test('applies correct weights: 0.4 SKS + 0.35 SG + 0.25 RP', () => {
    const score = computeDiscoveryScore({ selfKnowledgeScore: 0.8, satisfactionGap: 0.6, readinessPosture: 0.4 })
    expect(score).toBeCloseTo(0.4 * 0.8 + 0.35 * 0.6 + 0.25 * 0.4)
  })

  test('clamps values above 1', () => {
    expect(computeDiscoveryScore({ selfKnowledgeScore: 2, satisfactionGap: 2, readinessPosture: 2 })).toBe(1)
  })
})

describe('computeExplorationScore', () => {
  test('returns 0 for all zeros', () => {
    expect(computeExplorationScore({ opportunityBreadth: 0, experimentEngagement: 0, fitSignalStrength: 0 })).toBe(0)
  })

  test('returns 1 for all ones', () => {
    expect(computeExplorationScore({ opportunityBreadth: 1, experimentEngagement: 1, fitSignalStrength: 1 })).toBeCloseTo(1)
  })

  test('applies correct weights: 0.3 OB + 0.35 EE + 0.35 FSS', () => {
    const score = computeExplorationScore({ opportunityBreadth: 0.6, experimentEngagement: 0.8, fitSignalStrength: 0.7 })
    expect(score).toBeCloseTo(0.3 * 0.6 + 0.35 * 0.8 + 0.35 * 0.7)
  })
})

describe('computeAlignmentScore', () => {
  test('returns 0 for all zeros', () => {
    expect(computeAlignmentScore({ pathwayClarity: 0, gapClosureRate: 0, narrativeCoherence: 0 })).toBe(0)
  })

  test('returns 1 for all ones', () => {
    expect(computeAlignmentScore({ pathwayClarity: 1, gapClosureRate: 1, narrativeCoherence: 1 })).toBe(1)
  })

  test('applies correct weights: 0.35 PC + 0.35 GCR + 0.3 NC', () => {
    const score = computeAlignmentScore({ pathwayClarity: 0.7, gapClosureRate: 0.5, narrativeCoherence: 0.9 })
    expect(score).toBeCloseTo(0.35 * 0.7 + 0.35 * 0.5 + 0.3 * 0.9)
  })
})

describe('computeTransitionScore', () => {
  test('returns 0 for all zeros', () => {
    expect(computeTransitionScore({ actionCommitment: 0, earlySignalQuality: 0, supportStability: 0 })).toBe(0)
  })

  test('returns 1 for all ones', () => {
    expect(computeTransitionScore({ actionCommitment: 1, earlySignalQuality: 1, supportStability: 1 })).toBe(1)
  })

  test('applies correct weights: 0.4 AC + 0.35 ESQ + 0.25 SS', () => {
    const score = computeTransitionScore({ actionCommitment: 0.8, earlySignalQuality: 0.6, supportStability: 0.7 })
    expect(score).toBeCloseTo(0.4 * 0.8 + 0.35 * 0.6 + 0.25 * 0.7)
  })
})

describe('computeEstablishmentScore', () => {
  test('returns 0 for all zeros', () => {
    expect(computeEstablishmentScore({ roleFitScore: 0, performanceTrajectory: 0, identityIntegration: 0 })).toBe(0)
  })

  test('returns 1 for all ones', () => {
    expect(computeEstablishmentScore({ roleFitScore: 1, performanceTrajectory: 1, identityIntegration: 1 })).toBeCloseTo(1)
  })

  test('applies correct weights: 0.35 RFS + 0.3 PT + 0.35 II', () => {
    const score = computeEstablishmentScore({ roleFitScore: 0.9, performanceTrajectory: 0.5, identityIntegration: 0.7 })
    expect(score).toBeCloseTo(0.35 * 0.9 + 0.3 * 0.5 + 0.35 * 0.7)
  })
})
