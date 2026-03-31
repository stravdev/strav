import type { MutableStageScores, EnvironmentVector, KhaldunConfig } from './types.ts'
import { clamp, clampStageScores } from './utils.ts'

export function applyEnvironmentalModulation(
  scores: MutableStageScores,
  environment: EnvironmentVector,
  config: KhaldunConfig
): MutableStageScores {
  const mv = environment.marketVolatility
  const ca = environment.capitalAvailability
  const ci = environment.competitiveIntensity
  const im = environment.industryMaturity
  const lo = config.envWeightMin
  const hi = config.envWeightMax

  scores.I *= clamp(1 - 0.1 * mv + 0.3 * (1 - im), lo, hi)
  scores.V *= clamp(1 - 0.15 * mv - 0.05 * ci + 0.05 * ca + 0.2 * (1 - im), lo, hi)
  scores.L *= clamp(1 - 0.2 * mv + 0.15 * ca - 0.15 * ci + 0.1 * (1 - im), lo, hi)
  scores.G *= clamp(1 - 0.15 * mv + 0.25 * ca - 0.2 * ci, lo, hi)
  scores.Sc *= clamp(1 - 0.1 * mv + 0.2 * ca - 0.25 * ci, lo, hi)

  return clampStageScores(scores)
}
