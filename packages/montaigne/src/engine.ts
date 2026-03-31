import type {
  InputMetrics,
  StateVector,
  EnvironmentVector,
  MontaigneConfig,
  MutableStageScores,
} from './types.ts'
import {
  computeDiscoveryScore,
  computeExplorationScore,
  computeAlignmentScore,
  computeTransitionScore,
  computeEstablishmentScore,
} from './stages.ts'
import {
  computeDET,
  computeEAT,
  computeATT,
  computeTET,
} from './transitions.ts'
import {
  applyForwardFeedback,
  applyBackwardFeedback,
} from './feedback.ts'
import { applyEnvironmentalModulation } from './environment.ts'
import {
  computeCoherence,
  computeDerailmentRisk,
  detectOscillation,
} from './system.ts'
import { checkModelHandoff } from './handoff.ts'

export function updateStateSystem(
  inputMetrics: InputMetrics,
  previousState: StateVector | null,
  environment: EnvironmentVector,
  config: MontaigneConfig
): StateVector {
  // 1. Compute base stage scores
  const scores: MutableStageScores = {
    D: computeDiscoveryScore(inputMetrics.discovery),
    Ex: computeExplorationScore(inputMetrics.exploration),
    A: computeAlignmentScore(inputMetrics.alignment),
    T: computeTransitionScore(inputMetrics.transition),
    Es: computeEstablishmentScore(inputMetrics.establishment),
  }

  // 2. Apply recursive feedback
  applyForwardFeedback(scores, inputMetrics.feedback, config)
  applyBackwardFeedback(scores, inputMetrics.feedback, config)

  // 3. Apply environmental modulation
  applyEnvironmentalModulation(scores, environment, config)

  // 4. Compute system-level metrics
  const coherence = computeCoherence(scores)
  const derailmentRisk = computeDerailmentRisk(
    scores,
    inputMetrics.system
  )

  const previousScores: MutableStageScores | null = previousState
    ? {
        D: previousState.D,
        Ex: previousState.Ex,
        A: previousState.A,
        T: previousState.T,
        Es: previousState.Es,
      }
    : null
  const oscillationFlag = detectOscillation(
    scores,
    previousScores,
    previousState?.stagnantCycles ?? 0,
    config
  )

  // 5. Compute transition readiness
  const transitions = {
    DET: computeDET(scores, inputMetrics, config),
    EAT: computeEAT(scores, inputMetrics, config),
    ATT: computeATT(scores, inputMetrics, config),
    TET: computeTET(scores, inputMetrics, config),
  }

  // 6. Check for model handoff
  const handoff = checkModelHandoff(inputMetrics.handoff)

  return {
    D: scores.D,
    Ex: scores.Ex,
    A: scores.A,
    T: scores.T,
    Es: scores.Es,
    coherence,
    derailmentRisk,
    oscillationFlag,
    transitions,
    stagnantCycles: oscillationFlag.cycles,
    handoff,
  }
}
