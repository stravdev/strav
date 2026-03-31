import { test, expect, describe } from 'bun:test'
import { updateStateSystem } from '../src/engine.ts'
import { DEFAULT_CONFIG } from '../src/config.ts'
import type { InputMetrics, EnvironmentVector, StateVector, CircleInput } from '../src/types.ts'

function zeroInputMetrics(): InputMetrics {
  return {
    ideation: { problemClarityScore: 0, solutionSpecificity: 0, assumptionDensity: 0, layerAlignment: 0 },
    validation: { hypothesisConversionRate: 0, evidenceStrength: 0, signalNoiseRatio: 0 },
    launch: { buildCompletionPercentage: 0, userAcquisitionRate: 0, retentionRate: 0, usageFrequency: 0, userSatisfaction: 0 },
    growth: { revenueGrowthRate: -0.2, cacEfficiencyTrend: 0, retentionDynamics: 0 },
    scale: { operationalEfficiencyIndex: 0, marketShareGrowth: 0, systemScalabilityScore: 0 },
    transitions: {
      identifiedAssumptions: 0, expectedAssumptions: 0, assumptionsWithTests: 0,
      segmentClarity: 0, estimatedTAM: 0, problemUrgency: 0, environmentalAwareness: 0,
      evidenceStrength: 0, demandSignalConsistency: 0, teamReadiness: 0, capitalReadiness: 0, techReadiness: 0,
      pmfProxy: 0, userAcquisitionRate: 0, userSatisfaction: 0, expectedGrowthTarget: 0,
      ltvToCacRatio: 0, paybackPeriodMonths: 0, marketSize: 0, currentMarketShare: 0, totalAddressableMarket: 0,
    },
    feedback: {
      problemValidationScore: 0, assumptionPenalty: 0, marketResponse: 0, predictionError: 0,
      scalabilityFactor: 0, technicalDebt: 0, efficiencyGain: 0, resourceWaste: 0,
      realityCheckFactor: 0, userBehaviorInsight: 0, problemRedefinitionSignal: 0,
    },
    system: { runwayRemaining: 12, expectedRunway: 12, availableCapital: 100000, requiredCapital: 100000 },
    circle: null,
  }
}

function neutralEnvironment(): EnvironmentVector {
  return { marketVolatility: 0.5, capitalAvailability: 0.5, competitiveIntensity: 0.5, industryMaturity: 0.5 }
}

describe('updateStateSystem', () => {
  test('returns a complete StateVector', () => {
    const state = updateStateSystem(zeroInputMetrics(), null, neutralEnvironment(), DEFAULT_CONFIG)

    expect(state).toHaveProperty('I')
    expect(state).toHaveProperty('V')
    expect(state).toHaveProperty('L')
    expect(state).toHaveProperty('G')
    expect(state).toHaveProperty('Sc')
    expect(state).toHaveProperty('coherence')
    expect(state).toHaveProperty('failureProbability')
    expect(state).toHaveProperty('oscillationFlag')
    expect(state).toHaveProperty('transitions')
    expect(state).toHaveProperty('stagnantCycles')
    expect(state).toHaveProperty('teamCoherence')

    expect(state.transitions).toHaveProperty('IVT')
    expect(state.transitions).toHaveProperty('VLT')
    expect(state.transitions).toHaveProperty('LGT')
    expect(state.transitions).toHaveProperty('GST')

    expect(state.oscillationFlag).toHaveProperty('detected')
    expect(state.oscillationFlag).toHaveProperty('cycles')
    expect(state.oscillationFlag).toHaveProperty('recommendation')
  })

  test('all scores are in [0, 1]', () => {
    const state = updateStateSystem(zeroInputMetrics(), null, neutralEnvironment(), DEFAULT_CONFIG)
    for (const key of ['I', 'V', 'L', 'G', 'Sc'] as const) {
      expect(state[key]).toBeGreaterThanOrEqual(0)
      expect(state[key]).toBeLessThanOrEqual(1)
    }
    expect(state.coherence).toBeGreaterThanOrEqual(0)
    expect(state.failureProbability).toBeGreaterThanOrEqual(0)
    expect(state.failureProbability).toBeLessThanOrEqual(1)
  })

  test('deterministic — same inputs produce same output', () => {
    const inputs = zeroInputMetrics()
    const env = neutralEnvironment()
    const state1 = updateStateSystem(inputs, null, env, DEFAULT_CONFIG)
    const state2 = updateStateSystem(inputs, null, env, DEFAULT_CONFIG)

    expect(state1.I).toBe(state2.I)
    expect(state1.V).toBe(state2.V)
    expect(state1.L).toBe(state2.L)
    expect(state1.G).toBe(state2.G)
    expect(state1.Sc).toBe(state2.Sc)
    expect(state1.coherence).toBe(state2.coherence)
    expect(state1.failureProbability).toBe(state2.failureProbability)
  })

  test('null previousState yields no oscillation', () => {
    const state = updateStateSystem(zeroInputMetrics(), null, neutralEnvironment(), DEFAULT_CONFIG)
    expect(state.oscillationFlag.detected).toBe(false)
    expect(state.oscillationFlag.cycles).toBe(0)
    expect(state.stagnantCycles).toBe(0)
  })

  test('stagnant cycles accumulate across calls', () => {
    const inputs = zeroInputMetrics()
    const env = neutralEnvironment()

    const state1 = updateStateSystem(inputs, null, env, DEFAULT_CONFIG)
    expect(state1.stagnantCycles).toBe(0)

    const state2 = updateStateSystem(inputs, state1, env, DEFAULT_CONFIG)
    expect(state2.stagnantCycles).toBe(1) // same inputs → stagnant

    const state3 = updateStateSystem(inputs, state2, env, DEFAULT_CONFIG)
    expect(state3.stagnantCycles).toBe(2)

    const state4 = updateStateSystem(inputs, state3, env, DEFAULT_CONFIG)
    expect(state4.stagnantCycles).toBe(3)
    expect(state4.oscillationFlag.detected).toBe(true)
  })

  test('zero inputs with zero resources yields high failure probability', () => {
    const inputs = zeroInputMetrics()
    inputs.system.runwayRemaining = 0
    inputs.system.availableCapital = 0
    const state = updateStateSystem(inputs, null, neutralEnvironment(), DEFAULT_CONFIG)
    expect(state.failureProbability).toBeCloseTo(1.0)
  })

  test('high inputs produce higher scores than low inputs', () => {
    const lowInputs = zeroInputMetrics()
    const highInputs = zeroInputMetrics()
    highInputs.ideation = { problemClarityScore: 0.9, solutionSpecificity: 0.9, assumptionDensity: 1, layerAlignment: 0.9 }
    highInputs.validation = { hypothesisConversionRate: 0.9, evidenceStrength: 0.9, signalNoiseRatio: 0.9 }

    const env = neutralEnvironment()
    const lowState = updateStateSystem(lowInputs, null, env, DEFAULT_CONFIG)
    const highState = updateStateSystem(highInputs, null, env, DEFAULT_CONFIG)

    expect(highState.I).toBeGreaterThan(lowState.I)
    expect(highState.V).toBeGreaterThan(lowState.V)
  })

  test('transition blockers are populated for zero inputs', () => {
    const state = updateStateSystem(zeroInputMetrics(), null, neutralEnvironment(), DEFAULT_CONFIG)
    expect(state.transitions.IVT.blockers.length).toBeGreaterThan(0)
    expect(state.transitions.IVT.isReady).toBe(false)
  })

  test('feedback modifies base scores', () => {
    const withFeedback = zeroInputMetrics()
    withFeedback.ideation = { problemClarityScore: 0.5, solutionSpecificity: 0.5, assumptionDensity: 1, layerAlignment: 0.5 }
    withFeedback.feedback.problemValidationScore = 0.9
    withFeedback.feedback.problemRedefinitionSignal = 0.8

    const noFeedback = zeroInputMetrics()
    noFeedback.ideation = withFeedback.ideation

    const env = neutralEnvironment()
    const stateWithFb = updateStateSystem(withFeedback, null, env, DEFAULT_CONFIG)
    const stateNoFb = updateStateSystem(noFeedback, null, env, DEFAULT_CONFIG)

    expect(stateWithFb.I).toBeGreaterThan(stateNoFb.I)
  })

  test('adds contested-variable blockers to all transitions', () => {
    const inputs = zeroInputMetrics()
    inputs.circle = {
      memberSignals: new Map([
        ['pcs', [
          { memberId: 'a', value: 0.8, signalTrust: 0.9 },
          { memberId: 'b', value: 0.8, signalTrust: 0.9 },
        ]],
      ]),
      sessionsPerMember: new Map([['a', 5], ['b', 5]]),
      p3SignalsPerMember: new Map([
        ['a', { product: 0.8, purpose: 0.8, politics: 0.8 }],
        ['b', { product: 0.8, purpose: 0.8, politics: 0.8 }],
      ]),
      contestedVariables: new Set(['pcs', 'ss']),
      deferredVariables: new Set<string>(),
      lastConsensusValues: new Map([['pcs', 0.5], ['ss', 0.3]]),
    }

    const state = updateStateSystem(inputs, null, neutralEnvironment(), DEFAULT_CONFIG)

    for (const key of ['IVT', 'VLT', 'LGT', 'GST'] as const) {
      const blockers = state.transitions[key].blockers
      expect(blockers.some((b: string) => b === 'Contested: pcs — owner resolution needed')).toBe(true)
      expect(blockers.some((b: string) => b === 'Contested: ss — owner resolution needed')).toBe(true)
    }
  })

  test('no contested blockers when contestedVariables is empty', () => {
    const inputs = zeroInputMetrics()
    inputs.circle = {
      memberSignals: new Map([
        ['pcs', [
          { memberId: 'a', value: 0.8, signalTrust: 0.9 },
          { memberId: 'b', value: 0.8, signalTrust: 0.9 },
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

    const state = updateStateSystem(inputs, null, neutralEnvironment(), DEFAULT_CONFIG)

    for (const key of ['IVT', 'VLT', 'LGT', 'GST'] as const) {
      const hasContestedBlocker = state.transitions[key].blockers.some(
        (b: string) => b.startsWith('Contested:')
      )
      expect(hasContestedBlocker).toBe(false)
    }
  })
})
