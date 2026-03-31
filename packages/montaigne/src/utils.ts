import type { MutableStageScores } from './types.ts'

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0
  return clamp((value - min) / (max - min), 0, 1)
}

export function normalizeInverse(
  value: number,
  min: number,
  max: number
): number {
  return 1 - normalize(value, min, max)
}

export function average(values: number[]): number {
  if (values.length === 0) return 0
  let sum = 0
  for (const v of values) sum += v
  return sum / values.length
}

export function variance(values: number[]): number {
  if (values.length === 0) return 0
  const mean = average(values)
  let sum = 0
  for (const v of values) sum += (v - mean) ** 2
  return sum / values.length
}

export function clampStageScores(
  scores: MutableStageScores
): MutableStageScores {
  scores.D = clamp(scores.D, 0, 1)
  scores.Ex = clamp(scores.Ex, 0, 1)
  scores.A = clamp(scores.A, 0, 1)
  scores.T = clamp(scores.T, 0, 1)
  scores.Es = clamp(scores.Es, 0, 1)
  return scores
}
