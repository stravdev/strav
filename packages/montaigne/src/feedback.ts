import type {
  MutableStageScores,
  FeedbackInput,
  MontaigneConfig,
} from './types.ts'
import { clampStageScores } from './utils.ts'

export function applyForwardFeedback(
  scores: MutableStageScores,
  feedback: FeedbackInput,
  config: MontaigneConfig
): MutableStageScores {
  const lambda = config.forwardLearningRate

  // Discovery refined by exploration results
  scores.D +=
    lambda * (feedback.selfAssessmentAccuracy - feedback.identitySurprise)
  // Exploration refined by alignment reality
  scores.Ex +=
    lambda * (feedback.directionViability - feedback.explorationWaste)
  // Alignment refined by transition reality
  scores.A += lambda * (feedback.planAccuracy - feedback.realityGap)
  // Transition refined by establishment reality
  scores.T +=
    lambda *
    (feedback.transitionSignalQuality - feedback.adaptationCost)

  return clampStageScores(scores)
}

export function applyBackwardFeedback(
  scores: MutableStageScores,
  feedback: FeedbackInput,
  config: MontaigneConfig
): MutableStageScores {
  const mu = config.backwardLearningRate

  // Transition reality forces alignment revision
  scores.A += mu * feedback.planRevisionSignal
  // Alignment insights correct exploration
  scores.Ex += mu * feedback.directionCorrectionSignal
  // Exploration results revise discovery
  scores.D += mu * feedback.identityRevisionSignal

  return clampStageScores(scores)
}
