import type {
  MutableStageScores,
  InputMetrics,
  MontaigneConfig,
  TransitionResult,
} from './types.ts'
import { clamp } from './utils.ts'

export function computeDET(
  scores: MutableStageScores,
  metrics: InputMetrics,
  config: MontaigneConfig
): TransitionResult {
  const blockers: string[] = []

  // Purpose clarity
  const sks = clamp(metrics.discovery.selfKnowledgeScore, 0, 1)
  const identityAmbiguity = clamp(metrics.transitions.identityAmbiguity, 0, 1)
  const purposeClarity = sks * (1 - identityAmbiguity)

  // Openness factor
  const explorationReadiness = clamp(
    metrics.transitions.explorationReadiness,
    0,
    1
  )
  const opennessFactor = 0.7 + 0.3 * explorationReadiness

  // DET score (linear — no exponent)
  const readinessScore = clamp(
    scores.D * purposeClarity * opennessFactor,
    0,
    1
  )

  // Blockers
  if (scores.D < 0.5)
    blockers.push('Self-knowledge insufficient to explore meaningfully')
  if (purposeClarity < 0.4)
    blockers.push('Core identity questions remain unanswered')
  if (metrics.discovery.readinessPosture < 0.3)
    blockers.push('Readiness posture critically low')

  return {
    readinessScore,
    isReady: readinessScore >= config.detThreshold,
    blockers,
  }
}

export function computeEAT(
  scores: MutableStageScores,
  metrics: InputMetrics,
  config: MontaigneConfig
): TransitionResult {
  const blockers: string[] = []

  // Direction convergence
  const preferenceClarity = clamp(
    metrics.transitions.preferenceClarity,
    0,
    1
  )
  const remainingAmbiguity = clamp(
    metrics.transitions.remainingAmbiguity,
    0,
    1
  )
  const directionConvergence = preferenceClarity * (1 - remainingAmbiguity)

  // Experiment depth
  const experimentDepth = Math.min(
    1,
    metrics.transitions.testedDirections / config.minTestedDirections
  )

  // EAT score
  const readinessScore = clamp(
    scores.Ex * directionConvergence * experimentDepth,
    0,
    1
  )

  // Blockers
  if (scores.Ex < 0.5) blockers.push('Exploration insufficient')
  if (directionConvergence < 0.4)
    blockers.push('No clear preference emerging')
  if (metrics.exploration.experimentEngagement < 0.3)
    blockers.push(
      'Exploration too theoretical — needs real-world testing'
    )

  return {
    readinessScore,
    isReady: readinessScore >= config.eatThreshold,
    blockers,
  }
}

export function computeATT(
  scores: MutableStageScores,
  metrics: InputMetrics,
  config: MontaigneConfig
): TransitionResult {
  const blockers: string[] = []

  // Target specificity
  const roleSpecificity = clamp(metrics.transitions.roleSpecificity, 0, 1)
  const pathwayCompleteness = clamp(
    metrics.transitions.pathwayCompleteness,
    0,
    1
  )
  const targetSpecificity = roleSpecificity * pathwayCompleteness

  // Resource assessment
  const financialReadiness = clamp(
    metrics.transitions.financialReadiness,
    0,
    1
  )
  const skillReadiness = clamp(metrics.transitions.skillReadiness, 0, 1)
  const networkReadiness = clamp(metrics.transitions.networkReadiness, 0, 1)
  const resourceAssessment =
    0.4 * financialReadiness + 0.3 * skillReadiness + 0.3 * networkReadiness

  // Risk awareness
  const riskAssessmentQuality = clamp(
    metrics.transitions.riskAssessmentQuality,
    0,
    1
  )
  const riskAwareness = 0.7 + 0.3 * riskAssessmentQuality

  // ATT score
  const readinessScore = clamp(
    scores.A * targetSpecificity * resourceAssessment * riskAwareness,
    0,
    1
  )

  // Blockers
  if (scores.A < 0.6) blockers.push('Alignment insufficient')
  if (targetSpecificity < 0.5)
    blockers.push('Target too vague to act on')
  if (resourceAssessment < 0.4)
    blockers.push(
      'Critical resource gaps (financial, skills, or network)'
    )
  if (metrics.alignment.narrativeCoherence < 0.4)
    blockers.push('Cannot articulate the transition story')

  return {
    readinessScore,
    isReady: readinessScore >= config.attThreshold,
    blockers,
  }
}

export function computeTET(
  scores: MutableStageScores,
  metrics: InputMetrics,
  config: MontaigneConfig
): TransitionResult {
  const blockers: string[] = []

  // Commitment level
  let commitmentLevel: number
  if (metrics.transitions.commitmentThreshold <= 0) {
    commitmentLevel = 1.0
  } else if (
    metrics.transitions.committedActions >=
    metrics.transitions.commitmentThreshold
  ) {
    commitmentLevel = 1.0
  } else {
    commitmentLevel =
      metrics.transitions.committedActions /
      metrics.transitions.commitmentThreshold
  }

  // Early feedback presence
  const earlyFeedbackPresence = Math.min(
    1,
    metrics.transitions.feedbackSignals / config.minFeedbackSignals
  )

  // TET score
  const readinessScore = clamp(
    scores.T * commitmentLevel * earlyFeedbackPresence,
    0,
    1
  )

  // Blockers
  if (scores.T < 0.4) blockers.push('Transition actions insufficient')
  if (commitmentLevel < 0.5)
    blockers.push('The move has not actually been made')
  if (metrics.transition.supportStability < 0.3)
    blockers.push(
      'Support system critically weak during transition'
    )

  return {
    readinessScore,
    isReady: readinessScore >= config.tetThreshold,
    blockers,
  }
}
