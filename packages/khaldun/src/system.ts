import type { MutableStageScores, SystemInput, OscillationFlag, KhaldunConfig } from './types.ts'
import { clamp, average, variance } from './utils.ts'

export function computeCoherence(scores: MutableStageScores): number {
  const values = [scores.I, scores.V, scores.L, scores.G, scores.Sc]
  return average(values) * (1 - variance(values))
}

export function computeFailureProbability(scores: MutableStageScores, system: SystemInput): number {
  const stateMaturity = average([scores.I, scores.V, scores.L, scores.G, scores.Sc])
  const timeEfficiency =
    system.expectedRunway > 0 ? clamp(system.runwayRemaining / system.expectedRunway, 0, 1) : 0
  const resourceSustainability =
    system.requiredCapital > 0 ? clamp(system.availableCapital / system.requiredCapital, 0, 1) : 0

  return clamp(1 - stateMaturity * timeEfficiency * resourceSustainability, 0, 1)
}

export function detectOscillation(
  current: MutableStageScores,
  previous: MutableStageScores | null,
  previousCycles: number,
  config: KhaldunConfig
): OscillationFlag {
  if (!previous) {
    return { detected: false, cycles: 0, recommendation: null }
  }

  const delta =
    Math.abs(current.I - previous.I) +
    Math.abs(current.V - previous.V) +
    Math.abs(current.L - previous.L) +
    Math.abs(current.G - previous.G) +
    Math.abs(current.Sc - previous.Sc)

  const isStagnant = delta < config.minProgressThreshold
  const cycles = isStagnant ? previousCycles + 1 : 0
  const detected = cycles >= config.oscillationWindowSize

  return {
    detected,
    cycles,
    recommendation: detected
      ? 'Structural intervention needed: consider pivot, resource reallocation, or stage regression'
      : null,
  }
}
