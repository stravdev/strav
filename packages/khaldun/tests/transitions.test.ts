import { test, expect, describe } from 'bun:test'
import { computeIVT, computeVLT, computeLGT, computeGST } from '../src/transitions.ts'
import { DEFAULT_CONFIG } from '../src/config.ts'
import type { TransitionInput, MutableStageScores } from '../src/types.ts'

function fullTransitionInput(overrides: Partial<TransitionInput> = {}): TransitionInput {
  return {
    identifiedAssumptions: 10,
    expectedAssumptions: 10,
    assumptionsWithTests: 10,
    segmentClarity: 1,
    estimatedTAM: 900_000_000,
    problemUrgency: 1,
    environmentalAwareness: 1,
    evidenceStrength: 1,
    demandSignalConsistency: 1,
    teamReadiness: 1,
    capitalReadiness: 1,
    techReadiness: 1,
    pmfProxy: 1,
    userAcquisitionRate: 1000,
    userSatisfaction: 1,
    expectedGrowthTarget: 1000,
    ltvToCacRatio: 5,
    paybackPeriodMonths: 1,
    marketSize: 900_000_000,
    currentMarketShare: 0,
    totalAddressableMarket: 1_000_000_000,
    ...overrides,
  }
}

function highScores(overrides: Partial<MutableStageScores> = {}): MutableStageScores {
  return { I: 0.9, V: 0.9, L: 0.9, G: 0.9, Sc: 0.9, ...overrides }
}

// ── IVT ──────────────────────────────────────────────────────────────────────

describe('computeIVT', () => {
  test('high scores and metrics yield ready', () => {
    const result = computeIVT(highScores(), fullTransitionInput(), DEFAULT_CONFIG)
    expect(result.isReady).toBe(true)
    expect(result.blockers).toHaveLength(0)
    expect(result.readinessScore).toBeGreaterThan(DEFAULT_CONFIG.ivtThreshold)
  })

  test('low ideation score flags blocker', () => {
    const result = computeIVT(highScores({ I: 0.5 }), fullTransitionInput(), DEFAULT_CONFIG)
    expect(result.blockers).toContain('Ideation maturity insufficient')
  })

  test('zero expected assumptions yields assumption blocker', () => {
    const result = computeIVT(
      highScores(),
      fullTransitionInput({ expectedAssumptions: 0 }),
      DEFAULT_CONFIG
    )
    expect(result.blockers).toContain('Assumptions not identified or lack test plans')
  })

  test('zero identified assumptions yields assumption blocker', () => {
    const result = computeIVT(
      highScores(),
      fullTransitionInput({ identifiedAssumptions: 0 }),
      DEFAULT_CONFIG
    )
    expect(result.blockers).toContain('Assumptions not identified or lack test plans')
  })

  test('low environmental awareness flags blocker', () => {
    const result = computeIVT(
      highScores(),
      fullTransitionInput({ environmentalAwareness: 0.2 }),
      DEFAULT_CONFIG
    )
    expect(result.blockers).toContain('Operating environment constraints not mapped')
  })

  test('low segment clarity flags market fit blocker', () => {
    const result = computeIVT(
      highScores(),
      fullTransitionInput({ segmentClarity: 0.1, problemUrgency: 0.1 }),
      DEFAULT_CONFIG
    )
    expect(result.blockers).toContain('Weak market fit or vague ICP')
  })

  test('readiness score is clamped to [0, 1]', () => {
    const result = computeIVT(highScores(), fullTransitionInput(), DEFAULT_CONFIG)
    expect(result.readinessScore).toBeGreaterThanOrEqual(0)
    expect(result.readinessScore).toBeLessThanOrEqual(1)
  })
})

// ── VLT ──────────────────────────────────────────────────────────────────────

describe('computeVLT', () => {
  test('high scores and metrics yield ready', () => {
    const result = computeVLT(highScores(), fullTransitionInput(), DEFAULT_CONFIG)
    expect(result.isReady).toBe(true)
    expect(result.blockers).toHaveLength(0)
  })

  test('low validation score flags blocker', () => {
    const result = computeVLT(highScores({ V: 0.5 }), fullTransitionInput(), DEFAULT_CONFIG)
    expect(result.blockers).toContain('Validation maturity insufficient')
  })

  test('low demand signals flag blocker', () => {
    const result = computeVLT(
      highScores(),
      fullTransitionInput({ evidenceStrength: 0.3, demandSignalConsistency: 0.3 }),
      DEFAULT_CONFIG
    )
    expect(result.blockers).toContain('Demand signals too weak or inconsistent')
  })

  test('low resource readiness flags blocker', () => {
    const result = computeVLT(
      highScores(),
      fullTransitionInput({ teamReadiness: 0.1, capitalReadiness: 0.1, techReadiness: 0.1 }),
      DEFAULT_CONFIG
    )
    expect(result.blockers).toContain('Critical resource gaps')
  })
})

// ── LGT ──────────────────────────────────────────────────────────────────────

describe('computeLGT', () => {
  test('high scores and metrics yield ready', () => {
    const result = computeLGT(highScores(), fullTransitionInput(), DEFAULT_CONFIG)
    expect(result.isReady).toBe(true)
    expect(result.blockers).toHaveLength(0)
  })

  test('low launch score flags blocker', () => {
    const result = computeLGT(highScores({ L: 0.5 }), fullTransitionInput(), DEFAULT_CONFIG)
    expect(result.blockers).toContain('Launch execution maturity too low')
  })

  test('low PMF flags blocker', () => {
    const result = computeLGT(
      highScores(),
      fullTransitionInput({ pmfProxy: 0.4 }),
      DEFAULT_CONFIG
    )
    expect(result.blockers).toContain('PMF not strongly validated')
  })

  test('PMF at exactly 0.6 is fully validated', () => {
    const result = computeLGT(
      highScores(),
      fullTransitionInput({ pmfProxy: 0.6 }),
      DEFAULT_CONFIG
    )
    expect(result.blockers).not.toContain('PMF not strongly validated')
  })

  test('low market response flags blocker', () => {
    const result = computeLGT(
      highScores(),
      fullTransitionInput({ userAcquisitionRate: 100, expectedGrowthTarget: 1000, userSatisfaction: 0.3 }),
      DEFAULT_CONFIG
    )
    expect(result.blockers).toContain('Market traction insufficient')
  })

  test('zero expected growth target yields zero market response', () => {
    const result = computeLGT(
      highScores(),
      fullTransitionInput({ expectedGrowthTarget: 0 }),
      DEFAULT_CONFIG
    )
    expect(result.blockers).toContain('Market traction insufficient')
  })
})

// ── GST ──────────────────────────────────────────────────────────────────────

describe('computeGST', () => {
  test('high scores and metrics yield ready', () => {
    // G=0.95, SI=1.0, marketMaturity=0.95 → readiness ≈ 0.9025
    const result = computeGST(
      highScores({ G: 0.95 }),
      fullTransitionInput({ marketSize: 950_000_000 }),
      DEFAULT_CONFIG
    )
    expect(result.isReady).toBe(true)
    expect(result.blockers).toHaveLength(0)
  })

  test('low growth score flags blocker', () => {
    const result = computeGST(highScores({ G: 0.5 }), fullTransitionInput(), DEFAULT_CONFIG)
    expect(result.blockers).toContain('Growth engine not stable')
  })

  test('poor unit economics flag blocker', () => {
    const result = computeGST(
      highScores(),
      fullTransitionInput({ ltvToCacRatio: 1, paybackPeriodMonths: 24 }),
      DEFAULT_CONFIG
    )
    expect(result.blockers).toContain('Unit economics not strong enough')
  })

  test('low market maturity flags blocker', () => {
    const result = computeGST(
      highScores(),
      fullTransitionInput({ marketSize: 0, currentMarketShare: 0, totalAddressableMarket: 1_000_000_000 }),
      DEFAULT_CONFIG
    )
    expect(result.blockers).toContain('Market expansion premature')
  })

  test('TAM equal to current share yields zero market maturity', () => {
    const result = computeGST(
      highScores(),
      fullTransitionInput({ currentMarketShare: 500, totalAddressableMarket: 500 }),
      DEFAULT_CONFIG
    )
    expect(result.blockers).toContain('Market expansion premature')
  })
})
