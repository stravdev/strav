import { test, expect, describe } from 'bun:test'
import { applyForwardFeedback, applyBackwardFeedback } from '../src/feedback.ts'
import { DEFAULT_CONFIG } from '../src/config.ts'
import type { FeedbackInput, MutableStageScores } from '../src/types.ts'

function zeroFeedback(): FeedbackInput {
  return {
    problemValidationScore: 0,
    assumptionPenalty: 0,
    marketResponse: 0,
    predictionError: 0,
    scalabilityFactor: 0,
    technicalDebt: 0,
    efficiencyGain: 0,
    resourceWaste: 0,
    realityCheckFactor: 0,
    userBehaviorInsight: 0,
    problemRedefinitionSignal: 0,
  }
}

function baseScores(): MutableStageScores {
  return { I: 0.5, V: 0.5, L: 0.5, G: 0.5, Sc: 0.5 }
}

describe('applyForwardFeedback', () => {
  test('zero feedback produces no change', () => {
    const scores = baseScores()
    applyForwardFeedback(scores, zeroFeedback(), DEFAULT_CONFIG)
    expect(scores.I).toBeCloseTo(0.5)
    expect(scores.V).toBeCloseTo(0.5)
    expect(scores.L).toBeCloseTo(0.5)
    expect(scores.G).toBeCloseTo(0.5)
  })

  test('positive feedback increases scores', () => {
    const scores = baseScores()
    const feedback = {
      ...zeroFeedback(),
      problemValidationScore: 0.8,
      marketResponse: 0.8,
      scalabilityFactor: 0.8,
      efficiencyGain: 0.8,
    }
    applyForwardFeedback(scores, feedback, DEFAULT_CONFIG)
    // λ = 0.1, each stage gets +0.1*0.8 = +0.08
    expect(scores.I).toBeCloseTo(0.58)
    expect(scores.V).toBeCloseTo(0.58)
    expect(scores.L).toBeCloseTo(0.58)
    expect(scores.G).toBeCloseTo(0.58)
  })

  test('negative differential decreases scores', () => {
    const scores = baseScores()
    const feedback = {
      ...zeroFeedback(),
      assumptionPenalty: 0.8, // penalty > validation → negative
      predictionError: 0.8,
      technicalDebt: 0.8,
      resourceWaste: 0.8,
    }
    applyForwardFeedback(scores, feedback, DEFAULT_CONFIG)
    // λ = 0.1, each gets -0.1*0.8 = -0.08
    expect(scores.I).toBeCloseTo(0.42)
    expect(scores.V).toBeCloseTo(0.42)
    expect(scores.L).toBeCloseTo(0.42)
    expect(scores.G).toBeCloseTo(0.42)
  })

  test('clamps to 0 (no negative scores)', () => {
    const scores: MutableStageScores = { I: 0.01, V: 0.01, L: 0.01, G: 0.01, Sc: 0.5 }
    const feedback = {
      ...zeroFeedback(),
      assumptionPenalty: 1,
      predictionError: 1,
      technicalDebt: 1,
      resourceWaste: 1,
    }
    applyForwardFeedback(scores, feedback, DEFAULT_CONFIG)
    expect(scores.I).toBe(0)
    expect(scores.V).toBe(0)
    expect(scores.L).toBe(0)
    expect(scores.G).toBe(0)
  })

  test('clamps to 1 (no scores above 1)', () => {
    const scores: MutableStageScores = { I: 0.95, V: 0.95, L: 0.95, G: 0.95, Sc: 0.5 }
    const feedback = {
      ...zeroFeedback(),
      problemValidationScore: 1,
      marketResponse: 1,
      scalabilityFactor: 1,
      efficiencyGain: 1,
    }
    applyForwardFeedback(scores, feedback, DEFAULT_CONFIG)
    expect(scores.I).toBe(1)
    expect(scores.V).toBe(1)
    expect(scores.L).toBe(1)
    expect(scores.G).toBe(1)
  })

  test('learning rate scales adjustment', () => {
    const scores = baseScores()
    const config = { ...DEFAULT_CONFIG, forwardLearningRate: 0.2 }
    const feedback = { ...zeroFeedback(), problemValidationScore: 0.5 }
    applyForwardFeedback(scores, feedback, config)
    // 0.5 + 0.2 * 0.5 = 0.6
    expect(scores.I).toBeCloseTo(0.6)
  })
})

describe('applyBackwardFeedback', () => {
  test('zero feedback produces no change', () => {
    const scores = baseScores()
    applyBackwardFeedback(scores, zeroFeedback(), DEFAULT_CONFIG)
    expect(scores.V).toBeCloseTo(0.5)
    expect(scores.L).toBeCloseTo(0.5)
    expect(scores.I).toBeCloseTo(0.5)
  })

  test('positive backward feedback increases scores', () => {
    const scores = baseScores()
    const feedback = {
      ...zeroFeedback(),
      realityCheckFactor: 0.8,
      userBehaviorInsight: 0.6,
      problemRedefinitionSignal: 0.4,
    }
    applyBackwardFeedback(scores, feedback, DEFAULT_CONFIG)
    // μ = 0.05
    expect(scores.V).toBeCloseTo(0.5 + 0.05 * 0.8) // 0.54
    expect(scores.L).toBeCloseTo(0.5 + 0.05 * 0.6) // 0.53
    expect(scores.I).toBeCloseTo(0.5 + 0.05 * 0.4) // 0.52
  })

  test('Sc is unaffected by backward feedback', () => {
    const scores = baseScores()
    const feedback = {
      ...zeroFeedback(),
      realityCheckFactor: 1,
      userBehaviorInsight: 1,
      problemRedefinitionSignal: 1,
    }
    applyBackwardFeedback(scores, feedback, DEFAULT_CONFIG)
    expect(scores.Sc).toBeCloseTo(0.5)
  })
})
