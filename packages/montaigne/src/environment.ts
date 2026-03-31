import type {
  MutableStageScores,
  EnvironmentVector,
  MontaigneConfig,
} from './types.ts'
import { clamp, clampStageScores } from './utils.ts'

export function applyEnvironmentalModulation(
  scores: MutableStageScores,
  environment: EnvironmentVector,
  config: MontaigneConfig
): MutableStageScores {
  const jmc = clamp(environment.jobMarketConditions, 0, 1)
  const fr = clamp(environment.financialRunway, 0, 1)
  const rc = clamp(environment.roleCompetition, 0, 1)
  const it = clamp(environment.industryTrajectory, 0, 1)
  const lo = config.envWeightMin
  const hi = config.envWeightMax

  scores.D *= clamp(1 + 0.05 * fr + 0.1 * it, lo, hi)
  scores.Ex *= clamp(
    1 + 0.1 * jmc + 0.1 * fr - 0.05 * (1 - rc) + 0.2 * it,
    lo,
    hi
  )
  scores.A *= clamp(
    1 + 0.15 * jmc + 0.2 * fr - 0.1 * (1 - rc) + 0.15 * it,
    lo,
    hi
  )
  scores.T *= clamp(
    1 + 0.25 * jmc + 0.25 * fr - 0.2 * (1 - rc) + 0.1 * it,
    lo,
    hi
  )
  scores.Es *= clamp(
    1 + 0.2 * jmc + 0.1 * fr - 0.15 * (1 - rc) + 0.15 * it,
    lo,
    hi
  )

  return clampStageScores(scores)
}
