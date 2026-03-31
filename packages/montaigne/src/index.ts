// Manager
export { default, default as MontaigneManager } from './montaigne_manager.ts'

// Provider
export { default as MontaigneProvider } from './montaigne_provider.ts'

// Helper
export { montaigne } from './helpers.ts'

// Pure computation (for direct use without IoC)
export { updateStateSystem } from './engine.ts'
export { resolveInput } from './signals.ts'
export {
  computeDiscoveryScore,
  computeExplorationScore,
  computeAlignmentScore,
  computeTransitionScore,
  computeEstablishmentScore,
} from './stages.ts'
export { computeDET, computeEAT, computeATT, computeTET } from './transitions.ts'
export { applyForwardFeedback, applyBackwardFeedback } from './feedback.ts'
export { applyEnvironmentalModulation } from './environment.ts'
export { computeCoherence, computeDerailmentRisk, detectOscillation } from './system.ts'
export { checkModelHandoff } from './handoff.ts'
export { clamp, normalize, normalizeInverse, average, variance } from './utils.ts'
export { DEFAULT_CONFIG, validateConfig } from './config.ts'

// Errors
export { MontaigneError, MontaigneConfigError } from './errors.ts'

// Types
export type {
  Signal,
  ResolvedSignal,
  InputMetrics,
  DiscoveryInput,
  ExplorationInput,
  AlignmentInput,
  TransitionStageInput,
  EstablishmentInput,
  TransitionInput,
  FeedbackInput,
  SystemInput,
  HandoffInput,
  HandoffDataBridge,
  HandoffResult,
  EnvironmentVector,
  StateVector,
  TransitionResult,
  TransitionResults,
  OscillationFlag,
  MontaigneConfig,
  MutableStageScores,
} from './types.ts'
