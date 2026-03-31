import { test, expect, describe } from 'bun:test'
import { pairwiseMeanDiff, computeTeamCoherence, applyTeamCoherence, resolveContestedInput } from '../src/team_coherence.ts'
import type { CircleInput } from '../src/types.ts'

const emptyPerspectives = {
  contestedVariables: new Set<string>(),
  deferredVariables: new Set<string>(),
  lastConsensusValues: new Map<string, number>(),
}

// ── pairwiseMeanDiff ────────────────────────────────────────────────────────

describe('pairwiseMeanDiff', () => {
  test('returns 0 for empty array', () => {
    expect(pairwiseMeanDiff([])).toBe(0)
  })

  test('returns 0 for single value', () => {
    expect(pairwiseMeanDiff([0.5])).toBe(0)
  })

  test('returns 0 for identical values', () => {
    expect(pairwiseMeanDiff([0.7, 0.7, 0.7])).toBe(0)
  })

  test('returns absolute difference for two values', () => {
    expect(pairwiseMeanDiff([0.2, 0.8])).toBeCloseTo(0.6)
  })

  test('computes mean of all pair diffs for multiple values', () => {
    // pairs: (0.2,0.8)=0.6, (0.2,0.5)=0.3, (0.8,0.5)=0.3 → mean=0.4
    expect(pairwiseMeanDiff([0.2, 0.8, 0.5])).toBeCloseTo(0.4)
  })
})

// ── computeTeamCoherence ────────────────────────────────────────────────────

describe('computeTeamCoherence', () => {
  test('returns 1.0 for null (personal project)', () => {
    expect(computeTeamCoherence(null)).toBe(1.0)
  })

  test('returns 1.0 for single-member circle', () => {
    const circle: CircleInput = {
      memberSignals: new Map([
        ['pcs', [{ memberId: 'a', value: 0.8, signalTrust: 0.9 }]],
      ]),
      sessionsPerMember: new Map([['a', 5]]),
      p3SignalsPerMember: new Map([['a', { product: 0.8, purpose: 0.9, politics: 0.7 }]]),
      ...emptyPerspectives,
    }
    expect(computeTeamCoherence(circle)).toBe(1.0)
  })

  test('returns 1.0 for perfect agreement', () => {
    const circle: CircleInput = {
      memberSignals: new Map([
        ['pcs', [
          { memberId: 'a', value: 0.8, signalTrust: 0.9 },
          { memberId: 'b', value: 0.8, signalTrust: 0.9 },
        ]],
      ]),
      sessionsPerMember: new Map([['a', 5], ['b', 5]]),
      p3SignalsPerMember: new Map([
        ['a', { product: 0.8, purpose: 0.9, politics: 0.7 }],
        ['b', { product: 0.8, purpose: 0.9, politics: 0.7 }],
      ]),
      ...emptyPerspectives,
    }
    expect(computeTeamCoherence(circle)).toBe(1.0)
  })

  test('returns low TC for complete disagreement', () => {
    const circle: CircleInput = {
      memberSignals: new Map([
        ['pcs', [
          { memberId: 'a', value: 0.0, signalTrust: 0.9 },
          { memberId: 'b', value: 1.0, signalTrust: 0.9 },
        ]],
      ]),
      sessionsPerMember: new Map([['a', 10], ['b', 1]]),
      p3SignalsPerMember: new Map([
        ['a', { product: 0.0, purpose: 0.0, politics: 0.0 }],
        ['b', { product: 1.0, purpose: 1.0, politics: 1.0 }],
      ]),
      ...emptyPerspectives,
    }
    const tc = computeTeamCoherence(circle)
    expect(tc).toBeLessThan(0.5)
  })

  test('defaults signalAgreement to 1.0 when no multi-member variables', () => {
    const circle: CircleInput = {
      memberSignals: new Map([
        ['pcs', [{ memberId: 'a', value: 0.8, signalTrust: 0.9 }]],
        ['ss', [{ memberId: 'b', value: 0.3, signalTrust: 0.8 }]],
      ]),
      sessionsPerMember: new Map([['a', 5], ['b', 5]]),
      p3SignalsPerMember: new Map([
        ['a', { product: 0.8, purpose: 0.8, politics: 0.8 }],
        ['b', { product: 0.8, purpose: 0.8, politics: 0.8 }],
      ]),
      ...emptyPerspectives,
    }
    // signalAgreement=1.0 (no shared vars), engagement=1.0 (equal), vision=1.0 (identical)
    expect(computeTeamCoherence(circle)).toBe(1.0)
  })

  test('unequal sessions reduce TC via engagement symmetry', () => {
    const equal: CircleInput = {
      memberSignals: new Map(),
      sessionsPerMember: new Map([['a', 10], ['b', 10]]),
      p3SignalsPerMember: new Map([
        ['a', { product: 0.8, purpose: 0.8, politics: 0.8 }],
        ['b', { product: 0.8, purpose: 0.8, politics: 0.8 }],
      ]),
      ...emptyPerspectives,
    }
    const unequal: CircleInput = {
      memberSignals: new Map(),
      sessionsPerMember: new Map([['a', 20], ['b', 2]]),
      p3SignalsPerMember: new Map([
        ['a', { product: 0.8, purpose: 0.8, politics: 0.8 }],
        ['b', { product: 0.8, purpose: 0.8, politics: 0.8 }],
      ]),
      ...emptyPerspectives,
    }
    expect(computeTeamCoherence(unequal)).toBeLessThan(computeTeamCoherence(equal))
  })

  test('divergent P3 signals reduce TC via vision alignment', () => {
    const aligned: CircleInput = {
      memberSignals: new Map(),
      sessionsPerMember: new Map([['a', 5], ['b', 5]]),
      p3SignalsPerMember: new Map([
        ['a', { product: 0.8, purpose: 0.8, politics: 0.8 }],
        ['b', { product: 0.8, purpose: 0.8, politics: 0.8 }],
      ]),
      ...emptyPerspectives,
    }
    const divergent: CircleInput = {
      memberSignals: new Map(),
      sessionsPerMember: new Map([['a', 5], ['b', 5]]),
      p3SignalsPerMember: new Map([
        ['a', { product: 0.9, purpose: 0.9, politics: 0.9 }],
        ['b', { product: 0.1, purpose: 0.1, politics: 0.1 }],
      ]),
      ...emptyPerspectives,
    }
    expect(computeTeamCoherence(divergent)).toBeLessThan(computeTeamCoherence(aligned))
  })

  test('TC is clamped to [0, 1]', () => {
    const circle: CircleInput = {
      memberSignals: new Map([
        ['v1', [
          { memberId: 'a', value: 0.0, signalTrust: 1.0 },
          { memberId: 'b', value: 1.0, signalTrust: 1.0 },
        ]],
      ]),
      sessionsPerMember: new Map([['a', 100], ['b', 1]]),
      p3SignalsPerMember: new Map([
        ['a', { product: 0.0, purpose: 0.0, politics: 0.0 }],
        ['b', { product: 1.0, purpose: 1.0, politics: 1.0 }],
      ]),
      ...emptyPerspectives,
    }
    const tc = computeTeamCoherence(circle)
    expect(tc).toBeGreaterThanOrEqual(0)
    expect(tc).toBeLessThanOrEqual(1)
  })

  test('skips deferred variables in signal agreement', () => {
    // Without deferred: 'pcs' has full disagreement → low signal agreement
    const withDisagreement: CircleInput = {
      memberSignals: new Map([
        ['pcs', [
          { memberId: 'a', value: 0.0, signalTrust: 0.9 },
          { memberId: 'b', value: 1.0, signalTrust: 0.9 },
        ]],
      ]),
      sessionsPerMember: new Map([['a', 5], ['b', 5]]),
      p3SignalsPerMember: new Map([
        ['a', { product: 0.8, purpose: 0.8, politics: 0.8 }],
        ['b', { product: 0.8, purpose: 0.8, politics: 0.8 }],
      ]),
      contestedVariables: new Set<string>(),
      deferredVariables: new Set<string>(),
      lastConsensusValues: new Map<string, number>(),
    }

    // With deferred: 'pcs' is deferred → skipped → signal agreement defaults to 1.0
    const withDeferred: CircleInput = {
      ...withDisagreement,
      deferredVariables: new Set(['pcs']),
    }

    const tcWithout = computeTeamCoherence(withDisagreement)
    const tcWith = computeTeamCoherence(withDeferred)

    expect(tcWith).toBeGreaterThan(tcWithout)
    // With deferred pcs, signal agreement defaults to 1.0, engagement + vision are perfect → TC=1.0
    expect(tcWith).toBe(1.0)
  })

  test('skips only deferred variables, not contested ones', () => {
    const circle: CircleInput = {
      memberSignals: new Map([
        ['pcs', [
          { memberId: 'a', value: 0.0, signalTrust: 0.9 },
          { memberId: 'b', value: 1.0, signalTrust: 0.9 },
        ]],
        ['ss', [
          { memberId: 'a', value: 0.0, signalTrust: 0.9 },
          { memberId: 'b', value: 1.0, signalTrust: 0.9 },
        ]],
      ]),
      sessionsPerMember: new Map([['a', 5], ['b', 5]]),
      p3SignalsPerMember: new Map([
        ['a', { product: 0.8, purpose: 0.8, politics: 0.8 }],
        ['b', { product: 0.8, purpose: 0.8, politics: 0.8 }],
      ]),
      contestedVariables: new Set(['pcs']),
      deferredVariables: new Set(['ss']),
      lastConsensusValues: new Map([['pcs', 0.5]]),
    }

    const tc = computeTeamCoherence(circle)
    // 'ss' deferred → skipped. 'pcs' contested but NOT deferred → still counted in SA.
    // pcs disagreement = 1.0 → agreement = 0.0 for that variable
    // SA = 0.0, engagement = 1.0, vision = 1.0 → TC = 0.5*0 + 0.2*1 + 0.3*1 = 0.5
    expect(tc).toBeCloseTo(0.5)
  })
})

// ── applyTeamCoherence ──────────────────────────────────────────────────────

describe('applyTeamCoherence', () => {
  test('returns unmodified score for null circle data', () => {
    expect(applyTeamCoherence(0.75, null)).toBe(0.75)
  })

  test('returns unmodified score for perfect TC', () => {
    const circle: CircleInput = {
      memberSignals: new Map([
        ['pcs', [
          { memberId: 'a', value: 0.8, signalTrust: 0.9 },
          { memberId: 'b', value: 0.8, signalTrust: 0.9 },
        ]],
      ]),
      sessionsPerMember: new Map([['a', 5], ['b', 5]]),
      p3SignalsPerMember: new Map([
        ['a', { product: 0.8, purpose: 0.9, politics: 0.7 }],
        ['b', { product: 0.8, purpose: 0.9, politics: 0.7 }],
      ]),
      ...emptyPerspectives,
    }
    // TC=1.0, so 1.0^0.5 = 1.0
    expect(applyTeamCoherence(0.75, circle)).toBeCloseTo(0.75)
  })

  test('reduces score for low TC', () => {
    const circle: CircleInput = {
      memberSignals: new Map([
        ['pcs', [
          { memberId: 'a', value: 0.0, signalTrust: 0.9 },
          { memberId: 'b', value: 1.0, signalTrust: 0.9 },
        ]],
      ]),
      sessionsPerMember: new Map([['a', 5], ['b', 5]]),
      p3SignalsPerMember: new Map([
        ['a', { product: 0.0, purpose: 0.0, politics: 0.0 }],
        ['b', { product: 1.0, purpose: 1.0, politics: 1.0 }],
      ]),
      ...emptyPerspectives,
    }
    const original = 0.75
    const modified = applyTeamCoherence(original, circle)
    expect(modified).toBeLessThan(original)
  })
})

// ── resolveContestedInput ───────────────────────────────────────────────────

describe('resolveContestedInput', () => {
  test('returns null for null circle data', () => {
    expect(resolveContestedInput('pcs', null)).toBeNull()
  })

  test('returns null for non-contested variable', () => {
    const circle: CircleInput = {
      memberSignals: new Map(),
      sessionsPerMember: new Map(),
      p3SignalsPerMember: new Map(),
      contestedVariables: new Set(['ss']),
      deferredVariables: new Set<string>(),
      lastConsensusValues: new Map([['ss', 0.6]]),
    }
    expect(resolveContestedInput('pcs', circle)).toBeNull()
  })

  test('returns last consensus value for contested variable', () => {
    const circle: CircleInput = {
      memberSignals: new Map(),
      sessionsPerMember: new Map(),
      p3SignalsPerMember: new Map(),
      contestedVariables: new Set(['pcs', 'ss']),
      deferredVariables: new Set<string>(),
      lastConsensusValues: new Map([['pcs', 0.7], ['ss', 0.4]]),
    }
    expect(resolveContestedInput('pcs', circle)).toBe(0.7)
    expect(resolveContestedInput('ss', circle)).toBe(0.4)
  })

  test('returns null for contested variable with no consensus value', () => {
    const circle: CircleInput = {
      memberSignals: new Map(),
      sessionsPerMember: new Map(),
      p3SignalsPerMember: new Map(),
      contestedVariables: new Set(['pcs']),
      deferredVariables: new Set<string>(),
      lastConsensusValues: new Map(),
    }
    expect(resolveContestedInput('pcs', circle)).toBeNull()
  })
})
