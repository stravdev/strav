import type {
  DiscoveryInput,
  ExplorationInput,
  AlignmentInput,
  TransitionStageInput,
  EstablishmentInput,
} from './types.ts'
import { clamp } from './utils.ts'

export function computeDiscoveryScore(data: DiscoveryInput): number {
  const sks = clamp(data.selfKnowledgeScore, 0, 1)
  const sg = clamp(data.satisfactionGap, 0, 1)
  const rp = clamp(data.readinessPosture, 0, 1)

  return 0.4 * sks + 0.35 * sg + 0.25 * rp
}

export function computeExplorationScore(data: ExplorationInput): number {
  const ob = clamp(data.opportunityBreadth, 0, 1)
  const ee = clamp(data.experimentEngagement, 0, 1)
  const fss = clamp(data.fitSignalStrength, 0, 1)

  return 0.3 * ob + 0.35 * ee + 0.35 * fss
}

export function computeAlignmentScore(data: AlignmentInput): number {
  const pc = clamp(data.pathwayClarity, 0, 1)
  const gcr = clamp(data.gapClosureRate, 0, 1)
  const nc = clamp(data.narrativeCoherence, 0, 1)

  return 0.35 * pc + 0.35 * gcr + 0.3 * nc
}

export function computeTransitionScore(data: TransitionStageInput): number {
  const ac = clamp(data.actionCommitment, 0, 1)
  const esq = clamp(data.earlySignalQuality, 0, 1)
  const ss = clamp(data.supportStability, 0, 1)

  return 0.4 * ac + 0.35 * esq + 0.25 * ss
}

export function computeEstablishmentScore(data: EstablishmentInput): number {
  const rfs = clamp(data.roleFitScore, 0, 1)
  const pt = clamp(data.performanceTrajectory, 0, 1)
  const ii = clamp(data.identityIntegration, 0, 1)

  return 0.35 * rfs + 0.3 * pt + 0.35 * ii
}
