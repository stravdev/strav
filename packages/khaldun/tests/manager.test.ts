import { describe, test, expect, beforeEach } from 'bun:test'
import { Emitter } from '@stravigor/kernel'
import KhaldunManager from '../src/khaldun_manager.ts'
import { DEFAULT_CONFIG } from '../src/config.ts'
import type { InputMetrics, EnvironmentVector, StateVector } from '../src/types.ts'

// ── Mocks ────────────────────────────────────────────────────────────────

function mockConfig(overrides: Record<string, unknown> = {}) {
  const data: Record<string, unknown> = {
    khaldun: { ...overrides },
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
  KhaldunManager.reset()
  new KhaldunManager(mockConfig(overrides))
}

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

// ── Tests ────────────────────────────────────────────────────────────────

describe('KhaldunManager', () => {
  beforeEach(() => {
    KhaldunManager.reset()
    Emitter.reset()
  })

  test('loads default config when no overrides', () => {
    bootManager()
    expect(KhaldunManager.config.forwardLearningRate).toBe(DEFAULT_CONFIG.forwardLearningRate)
    expect(KhaldunManager.config.ivtThreshold).toBe(DEFAULT_CONFIG.ivtThreshold)
  })

  test('merges config overrides', () => {
    bootManager({ forwardLearningRate: 0.2 })
    expect(KhaldunManager.config.forwardLearningRate).toBe(0.2)
    expect(KhaldunManager.config.backwardLearningRate).toBe(DEFAULT_CONFIG.backwardLearningRate)
  })

  test('throws on invalid config', () => {
    expect(() => bootManager({ forwardLearningRate: 999 })).toThrow('Khaldun config error')
  })

  test('throws when accessed before initialization', () => {
    expect(() => KhaldunManager.config).toThrow('not configured')
  })

  test('getDefaultConfig returns a copy', () => {
    const config = KhaldunManager.getDefaultConfig()
    expect(config).toEqual(DEFAULT_CONFIG)
    expect(config).not.toBe(DEFAULT_CONFIG)
  })

  test('evaluate returns a StateVector', async () => {
    bootManager()
    const state = await KhaldunManager.evaluate(zeroInputMetrics(), null, neutralEnvironment())
    expect(state).toHaveProperty('I')
    expect(state).toHaveProperty('coherence')
    expect(state).toHaveProperty('transitions')
  })

  test('emits khaldun:state.updated on every evaluate', async () => {
    bootManager()
    let emitted = false
    Emitter.on('khaldun:state.updated', () => { emitted = true })

    await KhaldunManager.evaluate(zeroInputMetrics(), null, neutralEnvironment())
    expect(emitted).toBe(true)
  })

  test('emits khaldun:oscillation.detected when oscillation first detected', async () => {
    bootManager()
    const events: any[] = []
    Emitter.on('khaldun:oscillation.detected', (payload: any) => { events.push(payload) })

    const inputs = zeroInputMetrics()
    const env = neutralEnvironment()

    // Build up stagnant cycles
    let state: StateVector | null = null
    for (let i = 0; i < 5; i++) {
      state = await KhaldunManager.evaluate(inputs, state, env)
    }

    // Should have detected oscillation and emitted exactly once
    expect(events.length).toBe(1)
    expect(events[0]!.flag.detected).toBe(true)
  })

  test('resolveSignal delegates to resolveInput', () => {
    const result = KhaldunManager.resolveSignal({ value: 0.8, extractionConfidence: 0.9, signalTrust: 0.8 })
    expect(result.value).toBe(0.8)
    expect(result.dampened).toBe(false)
  })

  test('reset clears config', () => {
    bootManager()
    expect(KhaldunManager.config).toBeDefined()
    KhaldunManager.reset()
    expect(() => KhaldunManager.config).toThrow()
  })
})
