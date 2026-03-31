import type { MutableStageScores, FeedbackInput, KhaldunConfig } from './types.ts'
import { clampStageScores } from './utils.ts'

export function applyForwardFeedback(
  scores: MutableStageScores,
  feedback: FeedbackInput,
  config: KhaldunConfig
): MutableStageScores {
  const λ = config.forwardLearningRate

  // Ideation refined by validation reality
  scores.I += λ * (feedback.problemValidationScore - feedback.assumptionPenalty)
  // Validation refined by launch reality
  scores.V += λ * (feedback.marketResponse - feedback.predictionError)
  // Launch refined by growth insights
  scores.L += λ * (feedback.scalabilityFactor - feedback.technicalDebt)
  // Growth refined by scale efficiency
  scores.G += λ * (feedback.efficiencyGain - feedback.resourceWaste)

  return clampStageScores(scores)
}

export function applyBackwardFeedback(
  scores: MutableStageScores,
  feedback: FeedbackInput,
  config: KhaldunConfig
): MutableStageScores {
  const μ = config.backwardLearningRate

  // Validation corrected by launch reality
  scores.V += μ * feedback.realityCheckFactor
  // Launch corrected by growth user insights
  scores.L += μ * feedback.userBehaviorInsight
  // Ideation corrected by validation results
  scores.I += μ * feedback.problemRedefinitionSignal

  return clampStageScores(scores)
}
