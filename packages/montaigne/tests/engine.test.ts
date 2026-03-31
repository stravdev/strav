import { test, expect, describe } from 'bun:test'
import { updateStateSystem } from '../src/engine.ts'
import { DEFAULT_CONFIG } from '../src/config.ts'
import type { InputMetrics, EnvironmentVector, StateVector } from '../src/types.ts'

function zeroInputMetrics(): InputMetrics {
  return {
    discovery: { selfKnowledgeScore: 0, satisfactionGap: 0, readinessPosture: 0 },
    exploration: { opportunityBreadth: 0, experimentEngagement: 0, fitSignalStrength: 0 },
    alignment: { pathwayClarity: 0, gapClosureRate: 0, narrativeCoherence: 0 },
    transition: { actionCommitment: 0, earlySignalQuality: 0, supportStability: 0 },
    establishment: { roleFitScore: 0, performanceTrajectory: 0, identityIntegration: 0 },
    transitions: {
      identityAmbiguity: 0, explorationReadiness: 0,
      preferenceClarity: 0, remainingAmbiguity: 0, testedDirections: 0,
      roleSpecificity: 0, pathwayCompleteness: 0, financialReadiness: 0,
      skillReadiness: 0, networkReadiness: 0, riskAssessmentQuality: 0,
      committedActions: 0, commitmentThreshold: 3, feedbackSignals: 0,
    },
    feedback: {
      selfAssessmentAccuracy: 0, identitySurprise: 0, directionViability: 0,
      explorationWaste: 0, planAccuracy: 0, realityGap: 0,
      transitionSignalQuality: 0, adaptationCost: 0,
      planRevisionSignal: 0, directionCorrectionSignal: 0, identityRevisionSignal: 0,
    },
    system: { timeAtCurrentStage: 2, expectedStageTime: 3, financialRunway: 12, energyReserves: 0.7, supportStrength: 0.7 },
    handoff: { activeStage: 'discovery', entrepreneurialIntentDetected: false, dataBridge: null },
  }
}

function neutralEnvironment(): EnvironmentVector {
  return { jobMarketConditions: 0.5, financialRunway: 0.5, roleCompetition: 0.5, industryTrajectory: 0.5 }
}

describe('updateStateSystem', () => {
  test('returns a complete StateVector', () => {
    const state = updateStateSystem(zeroInputMetrics(), null, neutralEnvironment(), DEFAULT_CONFIG)

    expect(state).toHaveProperty('D')
    expect(state).toHaveProperty('Ex')
    expect(state).toHaveProperty('A')
    expect(state).toHaveProperty('T')
    expect(state).toHaveProperty('Es')
    expect(state).toHaveProperty('coherence')
    expect(state).toHaveProperty('derailmentRisk')
    expect(state).toHaveProperty('oscillationFlag')
    expect(state).toHaveProperty('transitions')
    expect(state).toHaveProperty('stagnantCycles')
    expect(state).toHaveProperty('handoff')

    expect(state.transitions).toHaveProperty('DET')
    expect(state.transitions).toHaveProperty('EAT')
    expect(state.transitions).toHaveProperty('ATT')
    expect(state.transitions).toHaveProperty('TET')

    expect(state.oscillationFlag).toHaveProperty('detected')
    expect(state.oscillationFlag).toHaveProperty('cycles')
    expect(state.oscillationFlag).toHaveProperty('recommendation')
  })

  test('all scores are in [0, 1]', () => {
    const state = updateStateSystem(zeroInputMetrics(), null, neutralEnvironment(), DEFAULT_CONFIG)
    for (const key of ['D', 'Ex', 'A', 'T', 'Es'] as const) {
      expect(state[key]).toBeGreaterThanOrEqual(0)
      expect(state[key]).toBeLessThanOrEqual(1)
    }
    expect(state.coherence).toBeGreaterThanOrEqual(0)
    expect(state.derailmentRisk).toBeGreaterThanOrEqual(0)
    expect(state.derailmentRisk).toBeLessThanOrEqual(1)
  })

  test('deterministic — same inputs produce same output', () => {
    const inputs = zeroInputMetrics()
    const env = neutralEnvironment()
    const state1 = updateStateSystem(inputs, null, env, DEFAULT_CONFIG)
    const state2 = updateStateSystem(inputs, null, env, DEFAULT_CONFIG)

    expect(state1.D).toBe(state2.D)
    expect(state1.Ex).toBe(state2.Ex)
    expect(state1.A).toBe(state2.A)
    expect(state1.T).toBe(state2.T)
    expect(state1.Es).toBe(state2.Es)
    expect(state1.coherence).toBe(state2.coherence)
    expect(state1.derailmentRisk).toBe(state2.derailmentRisk)
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
    expect(state2.stagnantCycles).toBe(1)

    const state3 = updateStateSystem(inputs, state2, env, DEFAULT_CONFIG)
    expect(state3.stagnantCycles).toBe(2)

    const state4 = updateStateSystem(inputs, state3, env, DEFAULT_CONFIG)
    expect(state4.stagnantCycles).toBe(3)
    expect(state4.oscillationFlag.detected).toBe(true)
  })

  test('zero resources yield high derailment risk', () => {
    const inputs = zeroInputMetrics()
    inputs.system.financialRunway = 0
    inputs.system.energyReserves = 0
    inputs.system.supportStrength = 0
    const state = updateStateSystem(inputs, null, neutralEnvironment(), DEFAULT_CONFIG)
    expect(state.derailmentRisk).toBeCloseTo(1.0)
  })

  test('high inputs produce higher scores than low inputs', () => {
    const lowInputs = zeroInputMetrics()
    const highInputs = zeroInputMetrics()
    highInputs.discovery = { selfKnowledgeScore: 0.9, satisfactionGap: 0.9, readinessPosture: 0.9 }
    highInputs.exploration = { opportunityBreadth: 0.9, experimentEngagement: 0.9, fitSignalStrength: 0.9 }

    const env = neutralEnvironment()
    const lowState = updateStateSystem(lowInputs, null, env, DEFAULT_CONFIG)
    const highState = updateStateSystem(highInputs, null, env, DEFAULT_CONFIG)

    expect(highState.D).toBeGreaterThan(lowState.D)
    expect(highState.Ex).toBeGreaterThan(lowState.Ex)
  })

  test('transition blockers are populated for zero inputs', () => {
    const state = updateStateSystem(zeroInputMetrics(), null, neutralEnvironment(), DEFAULT_CONFIG)
    expect(state.transitions.DET.blockers.length).toBeGreaterThan(0)
    expect(state.transitions.DET.isReady).toBe(false)
  })

  test('feedback modifies base scores', () => {
    const withFeedback = zeroInputMetrics()
    withFeedback.discovery = { selfKnowledgeScore: 0.5, satisfactionGap: 0.5, readinessPosture: 0.5 }
    withFeedback.feedback.selfAssessmentAccuracy = 0.9
    withFeedback.feedback.identityRevisionSignal = 0.8

    const noFeedback = zeroInputMetrics()
    noFeedback.discovery = withFeedback.discovery

    const env = neutralEnvironment()
    const stateWithFb = updateStateSystem(withFeedback, null, env, DEFAULT_CONFIG)
    const stateNoFb = updateStateSystem(noFeedback, null, env, DEFAULT_CONFIG)

    expect(stateWithFb.D).toBeGreaterThan(stateNoFb.D)
  })

  test('handoff not triggered for discovery stage', () => {
    const inputs = zeroInputMetrics()
    inputs.handoff.entrepreneurialIntentDetected = true
    const state = updateStateSystem(inputs, null, neutralEnvironment(), DEFAULT_CONFIG)
    expect(state.handoff.triggered).toBe(false)
  })

  test('handoff triggered during alignment with intent', () => {
    const inputs = zeroInputMetrics()
    inputs.handoff.activeStage = 'alignment'
    inputs.handoff.entrepreneurialIntentDetected = true
    const state = updateStateSystem(inputs, null, neutralEnvironment(), DEFAULT_CONFIG)
    expect(state.handoff.triggered).toBe(true)
    expect(state.handoff.targetModel).toBe('khaldun')
  })
})
