import type { MutableStageScores } from './types.ts'

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0
  return clamp((value - min) / (max - min), 0, 1)
}

export function normalizeInverse(value: number, min: number, max: number): number {
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

export function clampStageScores(scores: MutableStageScores): MutableStageScores {
  scores.I = clamp(scores.I, 0, 1)
  scores.V = clamp(scores.V, 0, 1)
  scores.L = clamp(scores.L, 0, 1)
  scores.G = clamp(scores.G, 0, 1)
  scores.Sc = clamp(scores.Sc, 0, 1)
  return scores
}
