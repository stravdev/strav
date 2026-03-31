import type { Signal, ResolvedSignal } from './types.ts'

export function resolveInput(signal: Signal): ResolvedSignal {
  const effectiveConfidence = signal.extractionConfidence * signal.signalTrust

  if (effectiveConfidence >= 0.5) {
    return { value: signal.value, dampened: false }
  }

  if (effectiveConfidence >= 0.2) {
    const dampingFactor = effectiveConfidence / 0.5
    return {
      value: 0.5 + (signal.value - 0.5) * dampingFactor,
      dampened: true,
    }
  }

  return { value: null, dampened: false }
}
