import type {
  IdeationInput,
  ValidationInput,
  LaunchInput,
  GrowthInput,
  ScaleInput,
  KhaldunConfig,
} from './types.ts'
import { clamp, normalize, normalizeInverse } from './utils.ts'

export function computeIdeationScore(data: IdeationInput): number {
  const pcs = clamp(data.problemClarityScore, 0, 1)
  const ss = clamp(data.solutionSpecificity, 0, 1)
  const adNormalized = normalizeInverse(Math.max(data.assumptionDensity, 1), 1, 10)
  const la = clamp(data.layerAlignment, 0, 1)

  return 0.35 * pcs + 0.35 * ss + 0.15 * adNormalized + 0.15 * la
}

export function computeValidationScore(data: ValidationInput): number {
  const hcr = clamp(data.hypothesisConversionRate, 0, 1)
  const es = clamp(data.evidenceStrength, 0, 1)
  const snr = clamp(data.signalNoiseRatio, 0, 1)

  return 0.5 * hcr + 0.3 * es + 0.2 * snr
}

export function computeLaunchScore(data: LaunchInput, config: KhaldunConfig): number {
  const bcp = clamp(data.buildCompletionPercentage, 0, 1)
  const uarNormalized = normalize(data.userAcquisitionRate, 0, config.expectedMaxUAR)
  const pmf =
    0.4 * clamp(data.retentionRate, 0, 1) +
    0.3 * clamp(data.usageFrequency, 0, 1) +
    0.3 * clamp(data.userSatisfaction, 0, 1)

  return 0.4 * bcp + 0.3 * clamp(uarNormalized, 0, 1) + 0.3 * pmf
}

export function computeGrowthScore(data: GrowthInput): number {
  const rgrNormalized = normalize(data.revenueGrowthRate, -0.2, 0.5)
  const cact = clamp(data.cacEfficiencyTrend, 0, 1)
  const rd = clamp(data.retentionDynamics, 0, 1)

  return 0.4 * clamp(rgrNormalized, 0, 1) + 0.3 * cact + 0.3 * rd
}

export function computeScaleScore(data: ScaleInput): number {
  const oei = clamp(data.operationalEfficiencyIndex, 0, 1)
  const msg = clamp(data.marketShareGrowth, 0, 1)
  const sss = clamp(data.systemScalabilityScore, 0, 1)

  return 0.4 * oei + 0.3 * msg + 0.3 * sss
}
