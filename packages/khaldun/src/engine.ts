import type {
  InputMetrics,
  StateVector,
  EnvironmentVector,
  KhaldunConfig,
  MutableStageScores,
} from './types.ts'
import {
  computeIdeationScore,
  computeValidationScore,
  computeLaunchScore,
  computeGrowthScore,
  computeScaleScore,
} from './stages.ts'
import { computeIVT, computeVLT, computeLGT, computeGST } from './transitions.ts'
import { applyForwardFeedback, applyBackwardFeedback } from './feedback.ts'
import { applyEnvironmentalModulation } from './environment.ts'
import { computeCoherence, computeFailureProbability, detectOscillation } from './system.ts'
import { computeTeamCoherence, applyTeamCoherence } from './team_coherence.ts'

export function updateStateSystem(
  inputMetrics: InputMetrics,
  previousState: StateVector | null,
  environment: EnvironmentVector,
  config: KhaldunConfig
): StateVector {
  // 1. Compute base stage scores
  const scores: MutableStageScores = {
    I: computeIdeationScore(inputMetrics.ideation),
    V: computeValidationScore(inputMetrics.validation),
    L: computeLaunchScore(inputMetrics.launch, config),
    G: computeGrowthScore(inputMetrics.growth),
    Sc: computeScaleScore(inputMetrics.scale),
  }

  // 2. Apply recursive feedback
  applyForwardFeedback(scores, inputMetrics.feedback, config)
  applyBackwardFeedback(scores, inputMetrics.feedback, config)

  // 3. Apply environmental modulation
  applyEnvironmentalModulation(scores, environment, config)

  // 4. Compute system-level metrics
  const coherence = computeCoherence(scores)
  const failureProbability = computeFailureProbability(scores, inputMetrics.system)

  const previousScores: MutableStageScores | null = previousState
    ? {
        I: previousState.I,
        V: previousState.V,
        L: previousState.L,
        G: previousState.G,
        Sc: previousState.Sc,
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
    IVT: computeIVT(scores, inputMetrics.transitions, config),
    VLT: computeVLT(scores, inputMetrics.transitions, config),
    LGT: computeLGT(scores, inputMetrics.transitions, config),
    GST: computeGST(scores, inputMetrics.transitions, config),
  }

  // 6. Compute and apply team coherence
  const teamCoherence = computeTeamCoherence(inputMetrics.circle)

  if (inputMetrics.circle !== null) {
    transitions.IVT.readinessScore = applyTeamCoherence(
      transitions.IVT.readinessScore,
      inputMetrics.circle
    )
    transitions.VLT.readinessScore = applyTeamCoherence(
      transitions.VLT.readinessScore,
      inputMetrics.circle
    )
    transitions.LGT.readinessScore = applyTeamCoherence(
      transitions.LGT.readinessScore,
      inputMetrics.circle
    )
    transitions.GST.readinessScore = applyTeamCoherence(
      transitions.GST.readinessScore,
      inputMetrics.circle
    )

    // Re-evaluate isReady after TC modifier
    transitions.IVT.isReady =
      transitions.IVT.readinessScore >= config.ivtThreshold
    transitions.VLT.isReady =
      transitions.VLT.readinessScore >= config.vltThreshold
    transitions.LGT.isReady =
      transitions.LGT.readinessScore >= config.lgtThreshold
    transitions.GST.isReady =
      transitions.GST.readinessScore >= config.gstThreshold

    // Add TC blocker if coherence too low
    if (teamCoherence < 0.5) {
      const tcBlocker =
        'Team coherence too low — co-founders need to align'
      transitions.IVT.blockers.push(tcBlocker)
      transitions.VLT.blockers.push(tcBlocker)
      transitions.LGT.blockers.push(tcBlocker)
      transitions.GST.blockers.push(tcBlocker)
    }

    // Add contested-variable blockers
    for (const variable of inputMetrics.circle.contestedVariables) {
      const contestedBlocker = `Contested: ${variable} — owner resolution needed`
      transitions.IVT.blockers.push(contestedBlocker)
      transitions.VLT.blockers.push(contestedBlocker)
      transitions.LGT.blockers.push(contestedBlocker)
      transitions.GST.blockers.push(contestedBlocker)
    }
  }

  return {
    I: scores.I,
    V: scores.V,
    L: scores.L,
    G: scores.G,
    Sc: scores.Sc,
    coherence,
    failureProbability,
    oscillationFlag,
    transitions,
    stagnantCycles: oscillationFlag.cycles,
    teamCoherence,
  }
}
