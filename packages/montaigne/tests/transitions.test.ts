import { test, expect, describe } from 'bun:test'
import { computeDET, computeEAT, computeATT, computeTET } from '../src/transitions.ts'
import { DEFAULT_CONFIG } from '../src/config.ts'
import type { InputMetrics, MutableStageScores } from '../src/types.ts'

function zeroMetrics(): InputMetrics {
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

function highScores(): MutableStageScores {
  return { D: 0.9, Ex: 0.9, A: 0.9, T: 0.9, Es: 0.9 }
}

function zeroScores(): MutableStageScores {
  return { D: 0, Ex: 0, A: 0, T: 0, Es: 0 }
}

// ── DET ─────────────────────────────────────────────────────────────────────

describe('computeDET', () => {
  test('ready when scores and inputs are high', () => {
    const metrics = zeroMetrics()
    metrics.discovery.selfKnowledgeScore = 0.9
    metrics.discovery.readinessPosture = 0.8
    metrics.transitions.identityAmbiguity = 0.1
    metrics.transitions.explorationReadiness = 0.9
    const result = computeDET(highScores(), metrics, DEFAULT_CONFIG)
    expect(result.isReady).toBe(true)
    expect(result.blockers).toHaveLength(0)
  })

  test('not ready with low D score', () => {
    const metrics = zeroMetrics()
    metrics.discovery.selfKnowledgeScore = 0.9
    metrics.transitions.explorationReadiness = 0.9
    const result = computeDET({ ...highScores(), D: 0.3 }, metrics, DEFAULT_CONFIG)
    expect(result.isReady).toBe(false)
    expect(result.blockers).toContain('Self-knowledge insufficient to explore meaningfully')
  })

  test('blocker for low readiness posture', () => {
    const metrics = zeroMetrics()
    metrics.discovery.readinessPosture = 0.1
    const result = computeDET(zeroScores(), metrics, DEFAULT_CONFIG)
    expect(result.blockers).toContain('Readiness posture critically low')
  })

  test('uses linear gating (no exponent)', () => {
    const metrics = zeroMetrics()
    metrics.discovery.selfKnowledgeScore = 0.8
    metrics.transitions.identityAmbiguity = 0.0
    metrics.transitions.explorationReadiness = 1.0
    const scores = { ...zeroScores(), D: 0.5 }
    const result = computeDET(scores, metrics, DEFAULT_CONFIG)
    // D * (SKS * (1-0)) * (0.7 + 0.3*1.0) = 0.5 * 0.8 * 1.0 = 0.4
    expect(result.readinessScore).toBeCloseTo(0.4)
  })
})

// ── EAT ─────────────────────────────────────────────────────────────────────

describe('computeEAT', () => {
  test('ready when scores and inputs are high', () => {
    const metrics = zeroMetrics()
    metrics.exploration.experimentEngagement = 0.8
    metrics.transitions.preferenceClarity = 0.9
    metrics.transitions.remainingAmbiguity = 0.1
    metrics.transitions.testedDirections = 3
    const result = computeEAT(highScores(), metrics, DEFAULT_CONFIG)
    expect(result.isReady).toBe(true)
    expect(result.blockers).toHaveLength(0)
  })

  test('not ready with low Ex score', () => {
    const metrics = zeroMetrics()
    metrics.transitions.preferenceClarity = 0.9
    metrics.transitions.testedDirections = 3
    const result = computeEAT({ ...highScores(), Ex: 0.3 }, metrics, DEFAULT_CONFIG)
    expect(result.isReady).toBe(false)
    expect(result.blockers).toContain('Exploration insufficient')
  })

  test('blocker for low experiment engagement', () => {
    const metrics = zeroMetrics()
    metrics.exploration.experimentEngagement = 0.1
    const result = computeEAT(zeroScores(), metrics, DEFAULT_CONFIG)
    expect(result.blockers).toContain('Exploration too theoretical — needs real-world testing')
  })

  test('experiment depth capped at 1.0', () => {
    const metrics = zeroMetrics()
    metrics.transitions.preferenceClarity = 1.0
    metrics.transitions.remainingAmbiguity = 0.0
    metrics.transitions.testedDirections = 10 // well above minTestedDirections
    metrics.exploration.experimentEngagement = 0.8
    const scores = { ...zeroScores(), Ex: 0.9 }
    const result = computeEAT(scores, metrics, DEFAULT_CONFIG)
    // Ex * 1.0 * 1.0 = 0.9
    expect(result.readinessScore).toBeCloseTo(0.9)
  })
})

// ── ATT ─────────────────────────────────────────────────────────────────────

describe('computeATT', () => {
  test('ready when scores and inputs are high', () => {
    const metrics = zeroMetrics()
    metrics.alignment.narrativeCoherence = 0.8
    metrics.transitions.roleSpecificity = 1.0
    metrics.transitions.pathwayCompleteness = 1.0
    metrics.transitions.financialReadiness = 0.9
    metrics.transitions.skillReadiness = 0.9
    metrics.transitions.networkReadiness = 0.9
    metrics.transitions.riskAssessmentQuality = 1.0
    const result = computeATT(highScores(), metrics, DEFAULT_CONFIG)
    expect(result.isReady).toBe(true)
    expect(result.blockers).toHaveLength(0)
  })

  test('not ready with low A score', () => {
    const metrics = zeroMetrics()
    metrics.transitions.roleSpecificity = 0.9
    metrics.transitions.pathwayCompleteness = 0.9
    metrics.transitions.financialReadiness = 0.8
    metrics.transitions.skillReadiness = 0.8
    metrics.transitions.networkReadiness = 0.8
    const result = computeATT({ ...highScores(), A: 0.4 }, metrics, DEFAULT_CONFIG)
    expect(result.blockers).toContain('Alignment insufficient')
  })

  test('blocker for low narrative coherence', () => {
    const metrics = zeroMetrics()
    metrics.alignment.narrativeCoherence = 0.2
    const result = computeATT(zeroScores(), metrics, DEFAULT_CONFIG)
    expect(result.blockers).toContain('Cannot articulate the transition story')
  })

  test('blocker for low resource assessment', () => {
    const metrics = zeroMetrics()
    metrics.transitions.financialReadiness = 0.1
    metrics.transitions.skillReadiness = 0.1
    metrics.transitions.networkReadiness = 0.1
    const result = computeATT(highScores(), metrics, DEFAULT_CONFIG)
    expect(result.blockers).toContain('Critical resource gaps (financial, skills, or network)')
  })
})

// ── TET ─────────────────────────────────────────────────────────────────────

describe('computeTET', () => {
  test('ready when scores and inputs are high', () => {
    const metrics = zeroMetrics()
    metrics.transition.supportStability = 0.8
    metrics.transitions.committedActions = 5
    metrics.transitions.commitmentThreshold = 3
    metrics.transitions.feedbackSignals = 5
    const result = computeTET(highScores(), metrics, DEFAULT_CONFIG)
    expect(result.isReady).toBe(true)
    expect(result.blockers).toHaveLength(0)
  })

  test('commitment at threshold yields 1.0', () => {
    const metrics = zeroMetrics()
    metrics.transition.supportStability = 0.8
    metrics.transitions.committedActions = 3
    metrics.transitions.commitmentThreshold = 3
    metrics.transitions.feedbackSignals = 5
    const scores = { ...zeroScores(), T: 0.9 }
    const result = computeTET(scores, metrics, DEFAULT_CONFIG)
    // T * 1.0 * 1.0 = 0.9
    expect(result.readinessScore).toBeCloseTo(0.9)
  })

  test('not ready with low T score', () => {
    const metrics = zeroMetrics()
    metrics.transitions.committedActions = 5
    metrics.transitions.commitmentThreshold = 3
    metrics.transitions.feedbackSignals = 5
    const result = computeTET({ ...highScores(), T: 0.2 }, metrics, DEFAULT_CONFIG)
    expect(result.blockers).toContain('Transition actions insufficient')
  })

  test('blocker for low support stability', () => {
    const metrics = zeroMetrics()
    metrics.transition.supportStability = 0.1
    const result = computeTET(zeroScores(), metrics, DEFAULT_CONFIG)
    expect(result.blockers).toContain('Support system critically weak during transition')
  })

  test('intentionally low threshold (0.6)', () => {
    expect(DEFAULT_CONFIG.tetThreshold).toBe(0.6)
  })
})
