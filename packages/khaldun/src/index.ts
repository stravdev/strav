// Manager
export { default, default as KhaldunManager } from './khaldun_manager.ts'

// Provider
export { default as KhaldunProvider } from './khaldun_provider.ts'

// Helper
export { khaldun } from './helpers.ts'

// Pure computation (for direct use without IoC)
export { updateStateSystem } from './engine.ts'
export { resolveInput } from './signals.ts'
export {
  computeIdeationScore,
  computeValidationScore,
  computeLaunchScore,
  computeGrowthScore,
  computeScaleScore,
} from './stages.ts'
export { computeIVT, computeVLT, computeLGT, computeGST } from './transitions.ts'
export { applyForwardFeedback, applyBackwardFeedback } from './feedback.ts'
export { applyEnvironmentalModulation } from './environment.ts'
export { computeCoherence, computeFailureProbability, detectOscillation } from './system.ts'
export { computeTeamCoherence, applyTeamCoherence, resolveContestedInput, pairwiseMeanDiff } from './team_coherence.ts'
export { clamp, normalize, normalizeInverse, average, variance } from './utils.ts'
export { DEFAULT_CONFIG, validateConfig } from './config.ts'

// Errors
export { KhaldunError, KhaldunConfigError } from './errors.ts'

// Types
export type {
  Signal,
  ResolvedSignal,
  InputMetrics,
  IdeationInput,
  ValidationInput,
  LaunchInput,
  GrowthInput,
  ScaleInput,
  TransitionInput,
  FeedbackInput,
  SystemInput,
  EnvironmentVector,
  StateVector,
  TransitionResult,
  TransitionResults,
  OscillationFlag,
  KhaldunConfig,
  MutableStageScores,
  CircleInput,
  CircleMemberSignal,
  P3Signal,
} from './types.ts'
