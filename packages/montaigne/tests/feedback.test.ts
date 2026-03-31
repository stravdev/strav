import { test, expect, describe } from 'bun:test'
import { applyForwardFeedback, applyBackwardFeedback } from '../src/feedback.ts'
import { DEFAULT_CONFIG } from '../src/config.ts'
import type { MutableStageScores, FeedbackInput } from '../src/types.ts'

function baseScores(): MutableStageScores {
  return { D: 0.5, Ex: 0.5, A: 0.5, T: 0.5, Es: 0.5 }
}

function zeroFeedback(): FeedbackInput {
  return {
    selfAssessmentAccuracy: 0, identitySurprise: 0, directionViability: 0,
    explorationWaste: 0, planAccuracy: 0, realityGap: 0,
    transitionSignalQuality: 0, adaptationCost: 0,
    planRevisionSignal: 0, directionCorrectionSignal: 0, identityRevisionSignal: 0,
  }
}

describe('applyForwardFeedback', () => {
  test('no change with zero feedback', () => {
    const scores = baseScores()
    applyForwardFeedback(scores, zeroFeedback(), DEFAULT_CONFIG)
    expect(scores.D).toBe(0.5)
    expect(scores.Ex).toBe(0.5)
    expect(scores.A).toBe(0.5)
    expect(scores.T).toBe(0.5)
  })

  test('D adjusted by SAA - IS', () => {
    const scores = baseScores()
    const feedback = zeroFeedback()
    feedback.selfAssessmentAccuracy = 0.8
    feedback.identitySurprise = 0.2
    applyForwardFeedback(scores, feedback, DEFAULT_CONFIG)
    expect(scores.D).toBeCloseTo(0.5 + 0.1 * (0.8 - 0.2))
  })

  test('Ex adjusted by DV - EW', () => {
    const scores = baseScores()
    const feedback = zeroFeedback()
    feedback.directionViability = 0.7
    feedback.explorationWaste = 0.3
    applyForwardFeedback(scores, feedback, DEFAULT_CONFIG)
    expect(scores.Ex).toBeCloseTo(0.5 + 0.1 * (0.7 - 0.3))
  })

  test('A adjusted by PA - RG', () => {
    const scores = baseScores()
    const feedback = zeroFeedback()
    feedback.planAccuracy = 0.6
    feedback.realityGap = 0.1
    applyForwardFeedback(scores, feedback, DEFAULT_CONFIG)
    expect(scores.A).toBeCloseTo(0.5 + 0.1 * (0.6 - 0.1))
  })

  test('T adjusted by TSQ - AdC', () => {
    const scores = baseScores()
    const feedback = zeroFeedback()
    feedback.transitionSignalQuality = 0.9
    feedback.adaptationCost = 0.4
    applyForwardFeedback(scores, feedback, DEFAULT_CONFIG)
    expect(scores.T).toBeCloseTo(0.5 + 0.1 * (0.9 - 0.4))
  })

  test('Es is not affected by forward feedback', () => {
    const scores = baseScores()
    const feedback = zeroFeedback()
    feedback.selfAssessmentAccuracy = 1
    feedback.directionViability = 1
    feedback.planAccuracy = 1
    feedback.transitionSignalQuality = 1
    applyForwardFeedback(scores, feedback, DEFAULT_CONFIG)
    expect(scores.Es).toBe(0.5)
  })

  test('results are clamped to [0, 1]', () => {
    const scores = { D: 0.95, Ex: 0.95, A: 0.95, T: 0.95, Es: 0.5 }
    const feedback = zeroFeedback()
    feedback.selfAssessmentAccuracy = 1
    feedback.directionViability = 1
    feedback.planAccuracy = 1
    feedback.transitionSignalQuality = 1
    applyForwardFeedback(scores, feedback, DEFAULT_CONFIG)
    expect(scores.D).toBeLessThanOrEqual(1)
    expect(scores.Ex).toBeLessThanOrEqual(1)
    expect(scores.A).toBeLessThanOrEqual(1)
    expect(scores.T).toBeLessThanOrEqual(1)
  })
})

describe('applyBackwardFeedback', () => {
  test('no change with zero feedback', () => {
    const scores = baseScores()
    applyBackwardFeedback(scores, zeroFeedback(), DEFAULT_CONFIG)
    expect(scores.A).toBe(0.5)
    expect(scores.Ex).toBe(0.5)
    expect(scores.D).toBe(0.5)
  })

  test('A adjusted by PRS', () => {
    const scores = baseScores()
    const feedback = zeroFeedback()
    feedback.planRevisionSignal = 0.6
    applyBackwardFeedback(scores, feedback, DEFAULT_CONFIG)
    expect(scores.A).toBeCloseTo(0.5 + 0.05 * 0.6)
  })

  test('Ex adjusted by DCS', () => {
    const scores = baseScores()
    const feedback = zeroFeedback()
    feedback.directionCorrectionSignal = -0.4
    applyBackwardFeedback(scores, feedback, DEFAULT_CONFIG)
    expect(scores.Ex).toBeCloseTo(0.5 + 0.05 * -0.4)
  })

  test('D adjusted by IRS', () => {
    const scores = baseScores()
    const feedback = zeroFeedback()
    feedback.identityRevisionSignal = 0.8
    applyBackwardFeedback(scores, feedback, DEFAULT_CONFIG)
    expect(scores.D).toBeCloseTo(0.5 + 0.05 * 0.8)
  })

  test('T and Es are not affected by backward feedback', () => {
    const scores = baseScores()
    const feedback = zeroFeedback()
    feedback.planRevisionSignal = 1
    feedback.directionCorrectionSignal = 1
    feedback.identityRevisionSignal = 1
    applyBackwardFeedback(scores, feedback, DEFAULT_CONFIG)
    expect(scores.T).toBe(0.5)
    expect(scores.Es).toBe(0.5)
  })

  test('backward learning rate is lower than forward', () => {
    expect(DEFAULT_CONFIG.backwardLearningRate).toBeLessThan(DEFAULT_CONFIG.forwardLearningRate)
  })
})
