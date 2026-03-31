import type {
  MutableStageScores,
  SystemInput,
  OscillationFlag,
  MontaigneConfig,
} from './types.ts'
import { clamp, average, variance } from './utils.ts'

export function computeCoherence(scores: MutableStageScores): number {
  const values = [scores.D, scores.Ex, scores.A, scores.T, scores.Es]
  return clamp(average(values) * (1 - variance(values)), 0, 1)
}

export function computeDerailmentRisk(
  scores: MutableStageScores,
  system: SystemInput
): number {
  const stateMaturity = average([
    scores.D,
    scores.Ex,
    scores.A,
    scores.T,
    scores.Es,
  ])

  const paceEfficiency =
    system.timeAtCurrentStage > 0
      ? clamp(
          system.expectedStageTime /
            Math.max(system.timeAtCurrentStage, 0.1),
          0,
          1
        )
      : 1.0

  const resourceSustainability = clamp(
    average([
      clamp(system.financialRunway / 12, 0, 1),
      clamp(system.energyReserves, 0, 1),
      clamp(system.supportStrength, 0, 1),
    ]),
    0,
    1
  )

  const successFactor =
    stateMaturity * paceEfficiency * resourceSustainability

  return clamp(1 - successFactor, 0, 1)
}

export function detectOscillation(
  current: MutableStageScores,
  previous: MutableStageScores | null,
  previousCycles: number,
  config: MontaigneConfig
): OscillationFlag {
  if (!previous) {
    return { detected: false, cycles: 0, recommendation: null }
  }

  const delta =
    Math.abs(current.D - previous.D) +
    Math.abs(current.Ex - previous.Ex) +
    Math.abs(current.A - previous.A) +
    Math.abs(current.T - previous.T) +
    Math.abs(current.Es - previous.Es)

  const isStagnant = delta < config.minProgressThreshold
  const cycles = isStagnant ? previousCycles + 1 : 0
  const detected = cycles >= config.oscillationWindowSize

  return {
    detected,
    cycles,
    recommendation: detected
      ? 'Structural intervention needed: consider a different approach, external coaching, or reassessing timing'
      : null,
  }
}
