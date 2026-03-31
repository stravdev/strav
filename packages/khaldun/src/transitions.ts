import type {
  MutableStageScores,
  TransitionInput,
  KhaldunConfig,
  TransitionResult,
} from './types.ts'
import { clamp, normalize, normalizeInverse } from './utils.ts'

export function computeIVT(
  scores: MutableStageScores,
  metrics: TransitionInput,
  config: KhaldunConfig
): TransitionResult {
  const blockers: string[] = []

  // I^1.5 convex gate
  const ideationGate = scores.I ** 1.5
  if (scores.I < 0.6) blockers.push('Ideation maturity insufficient')

  // Assumption Readiness
  let assumptionReadiness = 0
  if (metrics.expectedAssumptions > 0 && metrics.identifiedAssumptions > 0) {
    assumptionReadiness = clamp(
      (metrics.identifiedAssumptions / metrics.expectedAssumptions) *
        (metrics.assumptionsWithTests / metrics.identifiedAssumptions),
      0,
      1
    )
  }
  if (assumptionReadiness < 0.5) blockers.push('Assumptions not identified or lack test plans')

  // Problem-Market Alignment
  const marketSizeScore = normalize(metrics.estimatedTAM, config.minViableTAM, config.maxTAM)
  const urgencyScore = clamp(metrics.problemUrgency, 0, 1)
  const problemMarketAlignment = clamp(
    clamp(metrics.segmentClarity, 0, 1) * marketSizeScore * urgencyScore,
    0,
    1
  )
  if (problemMarketAlignment < 0.5) blockers.push('Weak market fit or vague ICP')

  // Environmental Factor
  const ea = clamp(metrics.environmentalAwareness, 0, 1)
  const environmentalFactor = 0.7 + 0.3 * ea
  if (ea < 0.3) blockers.push('Operating environment constraints not mapped')

  const readinessScore = clamp(
    ideationGate * assumptionReadiness * problemMarketAlignment * environmentalFactor,
    0,
    1
  )

  return {
    readinessScore,
    isReady: readinessScore >= config.ivtThreshold,
    blockers,
  }
}

export function computeVLT(
  scores: MutableStageScores,
  metrics: TransitionInput,
  config: KhaldunConfig
): TransitionResult {
  const blockers: string[] = []

  // V^1.2 mild convex gate
  const validationGate = scores.V ** 1.2
  if (scores.V < 0.65) blockers.push('Validation maturity insufficient')

  // Market Confidence
  const marketConfidence = clamp(
    clamp(metrics.evidenceStrength, 0, 1) * clamp(metrics.demandSignalConsistency, 0, 1),
    0,
    1
  )
  if (marketConfidence < 0.6) blockers.push('Demand signals too weak or inconsistent')

  // Resource Readiness
  const resourceReadiness =
    0.4 * clamp(metrics.teamReadiness, 0, 1) +
    0.3 * clamp(metrics.capitalReadiness, 0, 1) +
    0.3 * clamp(metrics.techReadiness, 0, 1)
  if (resourceReadiness < 0.5) blockers.push('Critical resource gaps')

  const readinessScore = clamp(validationGate * marketConfidence * resourceReadiness, 0, 1)

  return {
    readinessScore,
    isReady: readinessScore >= config.vltThreshold,
    blockers,
  }
}

export function computeLGT(
  scores: MutableStageScores,
  metrics: TransitionInput,
  config: KhaldunConfig
): TransitionResult {
  const blockers: string[] = []

  if (scores.L < 0.7) blockers.push('Launch execution maturity too low')

  // PMF Validation: soft threshold at 0.6
  const pmfProxy = clamp(metrics.pmfProxy, 0, 1)
  const pmfValidation = pmfProxy >= 0.6 ? 1.0 : pmfProxy / 0.6
  if (pmfValidation < 1.0) blockers.push('PMF not strongly validated')

  // Market Response
  const uarNormalized =
    metrics.expectedGrowthTarget > 0
      ? normalize(metrics.userAcquisitionRate, 0, metrics.expectedGrowthTarget)
      : 0
  const marketResponse = clamp(uarNormalized * clamp(metrics.userSatisfaction, 0, 1), 0, 1)
  if (marketResponse < 0.7) blockers.push('Market traction insufficient')

  const readinessScore = clamp(scores.L * pmfValidation * marketResponse, 0, 1)

  return {
    readinessScore,
    isReady: readinessScore >= config.lgtThreshold,
    blockers,
  }
}

export function computeGST(
  scores: MutableStageScores,
  metrics: TransitionInput,
  config: KhaldunConfig
): TransitionResult {
  const blockers: string[] = []

  if (scores.G < 0.75) blockers.push('Growth engine not stable')

  // Sustainability Index
  const ltvCacNormalized = normalize(metrics.ltvToCacRatio, 1, 5)
  const paybackNormalized = normalizeInverse(metrics.paybackPeriodMonths, 1, 24)
  const sustainabilityIndex = clamp(0.6 * ltvCacNormalized + 0.4 * paybackNormalized, 0, 1)
  if (sustainabilityIndex < 0.8) blockers.push('Unit economics not strong enough')

  // Market Maturity
  const marketMaturity =
    metrics.totalAddressableMarket > metrics.currentMarketShare
      ? clamp(
          normalize(metrics.marketSize, metrics.currentMarketShare, metrics.totalAddressableMarket),
          0,
          1
        )
      : 0
  if (marketMaturity < 0.6) blockers.push('Market expansion premature')

  const readinessScore = clamp(scores.G * sustainabilityIndex * marketMaturity, 0, 1)

  return {
    readinessScore,
    isReady: readinessScore >= config.gstThreshold,
    blockers,
  }
}
