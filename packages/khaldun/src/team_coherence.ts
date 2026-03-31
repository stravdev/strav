import type { CircleInput } from './types.ts'
import { clamp, average, variance } from './utils.ts'

/**
 * Mean absolute difference across all unique pairs.
 * Returns 0 for fewer than 2 values.
 */
export function pairwiseMeanDiff(values: number[]): number {
  if (values.length < 2) return 0
  const diffs: number[] = []
  for (let i = 0; i < values.length; i++) {
    for (let j = i + 1; j < values.length; j++) {
      diffs.push(Math.abs(values[i]! - values[j]!))
    }
  }
  return average(diffs)
}

export function computeTeamCoherence(circleData: CircleInput | null): number {
  if (circleData === null) return 1.0

  // 1. Signal agreement: how much do members agree on shared variables?
  const agreements: number[] = []
  for (const [variable, signals] of circleData.memberSignals) {
    if (circleData.deferredVariables.has(variable)) continue
    if (signals.length < 2) continue
    const pairDiffs: number[] = []
    for (let i = 0; i < signals.length; i++) {
      for (let j = i + 1; j < signals.length; j++) {
        pairDiffs.push(Math.abs(signals[i]!.value - signals[j]!.value))
      }
    }
    agreements.push(1 - average(pairDiffs))
  }
  const signalAgreement = agreements.length > 0 ? average(agreements) : 1.0

  // 2. Engagement symmetry: are all members contributing equally?
  const sessions = [...circleData.sessionsPerMember.values()]
  let engagementSymmetry: number
  if (sessions.length < 2 || Math.max(...sessions) === 0) {
    engagementSymmetry = 1.0
  } else {
    const mean = average(sessions)
    if (mean === 0) {
      engagementSymmetry = 1.0
    } else {
      const stddev = Math.sqrt(variance(sessions))
      const coeffOfVariation = stddev / mean
      engagementSymmetry = clamp(1 - coeffOfVariation, 0, 1)
    }
  }

  // 3. Vision alignment: do members agree on P3 layers?
  const p3Signals = [...circleData.p3SignalsPerMember.values()]
  let visionAlignment: number
  if (p3Signals.length < 2) {
    visionAlignment = 1.0
  } else {
    const productAgreement =
      1 - pairwiseMeanDiff(p3Signals.map((s) => s.product))
    const purposeAgreement =
      1 - pairwiseMeanDiff(p3Signals.map((s) => s.purpose))
    const politicsAgreement =
      1 - pairwiseMeanDiff(p3Signals.map((s) => s.politics))
    visionAlignment = average([
      productAgreement,
      purposeAgreement,
      politicsAgreement,
    ])
  }

  // 4. Weighted combination
  const tc =
    0.5 * signalAgreement + 0.2 * engagementSymmetry + 0.3 * visionAlignment
  return clamp(tc, 0, 1)
}

/**
 * Resolve contested input variables to their last consensus value.
 * Called before standard signal aggregation — if a variable is contested,
 * the scoring engine uses the last consensus value instead of any member's
 * current position.
 */
export function resolveContestedInput(
  variable: string,
  circleData: CircleInput | null
): number | null {
  if (circleData === null) return null
  if (circleData.contestedVariables.has(variable)) {
    return circleData.lastConsensusValues.get(variable) ?? null
  }
  return null
}

export function applyTeamCoherence(
  transitionScore: number,
  circleData: CircleInput | null
): number {
  const tc = computeTeamCoherence(circleData)
  return transitionScore * Math.pow(tc, 0.5)
}
