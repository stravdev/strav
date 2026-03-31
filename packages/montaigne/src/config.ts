import type { MontaigneConfig } from './types.ts'
import { MontaigneConfigError } from './errors.ts'

export const DEFAULT_CONFIG: MontaigneConfig = {
  forwardLearningRate: 0.1,
  backwardLearningRate: 0.05,
  detThreshold: 0.6,
  eatThreshold: 0.65,
  attThreshold: 0.7,
  tetThreshold: 0.6,
  minProgressThreshold: 0.05,
  oscillationWindowSize: 3,
  minTestedDirections: 2,
  minFeedbackSignals: 3,
  expectedDirections: 4,
  envWeightMin: 0.7,
  envWeightMax: 1.3,
  periodicRecalcInterval: 'weekly',
}

export function validateConfig(config: MontaigneConfig): void {
  assertRange('forwardLearningRate', config.forwardLearningRate, 0.01, 0.3)
  assertRange('backwardLearningRate', config.backwardLearningRate, 0.01, 0.15)
  assertRange('detThreshold', config.detThreshold, 0.4, 0.8)
  assertRange('eatThreshold', config.eatThreshold, 0.4, 0.8)
  assertRange('attThreshold', config.attThreshold, 0.5, 0.9)
  assertRange('tetThreshold', config.tetThreshold, 0.4, 0.8)
  assertRange('minProgressThreshold', config.minProgressThreshold, 0.01, 0.1)
  assertRange('oscillationWindowSize', config.oscillationWindowSize, 2, 10)
  assertRange('envWeightMin', config.envWeightMin, 0.5, 0.9)
  assertRange('envWeightMax', config.envWeightMax, 1.1, 1.5)

  if (config.minTestedDirections < 1 || config.minTestedDirections > 5) {
    throw new MontaigneConfigError(
      'minTestedDirections',
      'must be between 1 and 5'
    )
  }
  if (config.minFeedbackSignals < 1 || config.minFeedbackSignals > 10) {
    throw new MontaigneConfigError(
      'minFeedbackSignals',
      'must be between 1 and 10'
    )
  }
  if (config.expectedDirections < 2 || config.expectedDirections > 8) {
    throw new MontaigneConfigError(
      'expectedDirections',
      'must be between 2 and 8'
    )
  }
}

function assertRange(
  param: string,
  value: number,
  min: number,
  max: number
): void {
  if (value < min || value > max) {
    throw new MontaigneConfigError(
      param,
      `must be between ${min} and ${max}, got ${value}`
    )
  }
}
