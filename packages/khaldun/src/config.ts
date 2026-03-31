import type { KhaldunConfig } from './types.ts'
import { KhaldunConfigError } from './errors.ts'

export const DEFAULT_CONFIG: KhaldunConfig = {
  forwardLearningRate: 0.1,
  backwardLearningRate: 0.05,
  ivtThreshold: 0.7,
  vltThreshold: 0.75,
  lgtThreshold: 0.8,
  gstThreshold: 0.85,
  minProgressThreshold: 0.05,
  oscillationWindowSize: 3,
  expectedMaxUAR: 1000,
  minViableTAM: 1_000_000,
  maxTAM: 1_000_000_000,
  envWeightMin: 0.7,
  envWeightMax: 1.3,
}

export function validateConfig(config: KhaldunConfig): void {
  assertRange('forwardLearningRate', config.forwardLearningRate, 0.01, 0.3)
  assertRange('backwardLearningRate', config.backwardLearningRate, 0.01, 0.15)
  assertRange('ivtThreshold', config.ivtThreshold, 0.5, 0.9)
  assertRange('vltThreshold', config.vltThreshold, 0.5, 0.9)
  assertRange('lgtThreshold', config.lgtThreshold, 0.5, 0.9)
  assertRange('gstThreshold', config.gstThreshold, 0.5, 0.95)
  assertRange('minProgressThreshold', config.minProgressThreshold, 0.01, 0.1)
  assertRange('oscillationWindowSize', config.oscillationWindowSize, 2, 10)
  assertRange('envWeightMin', config.envWeightMin, 0.5, 0.9)
  assertRange('envWeightMax', config.envWeightMax, 1.1, 1.5)

  if (config.expectedMaxUAR <= 0) {
    throw new KhaldunConfigError('expectedMaxUAR', 'must be positive')
  }
  if (config.minViableTAM <= 0) {
    throw new KhaldunConfigError('minViableTAM', 'must be positive')
  }
  if (config.maxTAM <= config.minViableTAM) {
    throw new KhaldunConfigError('maxTAM', 'must be greater than minViableTAM')
  }
}

function assertRange(param: string, value: number, min: number, max: number): void {
  if (value < min || value > max) {
    throw new KhaldunConfigError(param, `must be between ${min} and ${max}, got ${value}`)
  }
}
