import { describe, test, expect, beforeEach } from 'bun:test'
import { Emitter } from '@stravigor/kernel'
import MontaigneManager from '../src/montaigne_manager.ts'
import { DEFAULT_CONFIG } from '../src/config.ts'
import type { InputMetrics, EnvironmentVector, StateVector } from '../src/types.ts'

// ── Mocks ────────────────────────────────────────────────────────────────

function mockConfig(overrides: Record<string, unknown> = {}) {
  const data: Record<string, unknown> = {
    montaigne: { ...overrides },
  }

  return {
    get(key: string, defaultValue?: unknown): unknown {
      const parts = key.split('.')
      let current: any = data
      for (const part of parts) {
        if (current === undefined || current === null) return defaultValue
        current = current[part]
      }
      return current !== undefined ? current : defaultValue
    },
    has(key: string): boolean {
      return this.get(key) !== undefined
    },
  } as any
}

function bootManager(overrides: Record<string, unknown> = {}) {
  MontaigneManager.reset()
  new MontaigneManager(mockConfig(overrides))
}

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

// ── Tests ────────────────────────────────────────────────────────────────

describe('MontaigneManager', () => {
  beforeEach(() => {
    MontaigneManager.reset()
    Emitter.reset()
  })

  test('loads default config when no overrides', () => {
    bootManager()
    expect(MontaigneManager.config.forwardLearningRate).toBe(DEFAULT_CONFIG.forwardLearningRate)
    expect(MontaigneManager.config.detThreshold).toBe(DEFAULT_CONFIG.detThreshold)
  })

  test('merges config overrides', () => {
    bootManager({ forwardLearningRate: 0.2 })
    expect(MontaigneManager.config.forwardLearningRate).toBe(0.2)
    expect(MontaigneManager.config.backwardLearningRate).toBe(DEFAULT_CONFIG.backwardLearningRate)
  })

  test('throws on invalid config', () => {
    expect(() => bootManager({ forwardLearningRate: 999 })).toThrow('Montaigne config error')
  })

  test('throws when accessed before initialization', () => {
    expect(() => MontaigneManager.config).toThrow('not configured')
  })

  test('getDefaultConfig returns a copy', () => {
    const config = MontaigneManager.getDefaultConfig()
    expect(config).toEqual(DEFAULT_CONFIG)
    expect(config).not.toBe(DEFAULT_CONFIG)
  })

  test('evaluate returns a StateVector', async () => {
    bootManager()
    const state = await MontaigneManager.evaluate(zeroInputMetrics(), null, neutralEnvironment())
    expect(state).toHaveProperty('D')
    expect(state).toHaveProperty('coherence')
    expect(state).toHaveProperty('transitions')
    expect(state).toHaveProperty('handoff')
  })

  test('emits montaigne:state.updated on every evaluate', async () => {
    bootManager()
    let emitted = false
    Emitter.on('montaigne:state.updated', () => { emitted = true })

    await MontaigneManager.evaluate(zeroInputMetrics(), null, neutralEnvironment())
    expect(emitted).toBe(true)
  })

  test('emits montaigne:oscillation.detected when oscillation first detected', async () => {
    bootManager()
    const events: any[] = []
    Emitter.on('montaigne:oscillation.detected', (payload: any) => { events.push(payload) })

    const inputs = zeroInputMetrics()
    const env = neutralEnvironment()

    // Build up stagnant cycles
    let state: StateVector | null = null
    for (let i = 0; i < 5; i++) {
      state = await MontaigneManager.evaluate(inputs, state, env)
    }

    // Should have detected oscillation and emitted exactly once
    expect(events.length).toBe(1)
    expect(events[0]!.flag.detected).toBe(true)
  })

  test('emits montaigne:handoff.triggered when handoff first detected', async () => {
    bootManager()
    const events: any[] = []
    Emitter.on('montaigne:handoff.triggered', (payload: any) => { events.push(payload) })

    const env = neutralEnvironment()

    // First call without handoff — no event
    const noHandoffInputs = zeroInputMetrics()
    const prevState = await MontaigneManager.evaluate(noHandoffInputs, null, env)
    expect(events.length).toBe(0)

    // Second call with handoff inputs using prevState → newly triggered
    const inputs = zeroInputMetrics()
    inputs.handoff.activeStage = 'alignment'
    inputs.handoff.entrepreneurialIntentDetected = true
    await MontaigneManager.evaluate(inputs, prevState, env)
    expect(events.length).toBe(1)
    expect(events[0]!.handoff.triggered).toBe(true)
  })

  test('resolveSignal delegates to resolveInput', () => {
    const result = MontaigneManager.resolveSignal({ value: 0.8, extractionConfidence: 0.9, signalTrust: 0.8 })
    expect(result.value).toBe(0.8)
    expect(result.dampened).toBe(false)
  })

  test('reset clears config', () => {
    bootManager()
    expect(MontaigneManager.config).toBeDefined()
    MontaigneManager.reset()
    expect(() => MontaigneManager.config).toThrow()
  })
})
