// ── Signals ──────────────────────────────────────────────────────────────────

export interface Signal {
  value: number
  extractionConfidence: number
  signalTrust: number
}

export interface ResolvedSignal {
  value: number | null
  dampened: boolean
}

// ── Input Metrics ────────────────────────────────────────────────────────────

export interface DiscoveryInput {
  selfKnowledgeScore: number
  satisfactionGap: number
  readinessPosture: number
}

export interface ExplorationInput {
  opportunityBreadth: number
  experimentEngagement: number
  fitSignalStrength: number
}

export interface AlignmentInput {
  pathwayClarity: number
  gapClosureRate: number
  narrativeCoherence: number
}

export interface TransitionStageInput {
  actionCommitment: number
  earlySignalQuality: number
  supportStability: number
}

export interface EstablishmentInput {
  roleFitScore: number
  performanceTrajectory: number
  identityIntegration: number
}

export interface TransitionInput {
  // DET
  identityAmbiguity: number
  explorationReadiness: number
  // EAT
  preferenceClarity: number
  remainingAmbiguity: number
  testedDirections: number
  // ATT
  roleSpecificity: number
  pathwayCompleteness: number
  financialReadiness: number
  skillReadiness: number
  networkReadiness: number
  riskAssessmentQuality: number
  // TET
  committedActions: number
  commitmentThreshold: number
  feedbackSignals: number
}

export interface FeedbackInput {
  // Forward
  selfAssessmentAccuracy: number
  identitySurprise: number
  directionViability: number
  explorationWaste: number
  planAccuracy: number
  realityGap: number
  transitionSignalQuality: number
  adaptationCost: number
  // Backward
  planRevisionSignal: number
  directionCorrectionSignal: number
  identityRevisionSignal: number
}

export interface SystemInput {
  timeAtCurrentStage: number
  expectedStageTime: number
  financialRunway: number
  energyReserves: number
  supportStrength: number
}

// ── Handoff ──────────────────────────────────────────────────────────────────

export interface HandoffDataBridge {
  skills: unknown
  values: unknown
  personality: unknown
  marketResearch: unknown
  fitSignals: unknown
  network: unknown
  financialPlan: unknown
  narrative: unknown
}

export interface HandoffInput {
  activeStage: string
  entrepreneurialIntentDetected: boolean
  dataBridge: HandoffDataBridge | null
}

// ── Composite Input ──────────────────────────────────────────────────────────

export interface InputMetrics {
  discovery: DiscoveryInput
  exploration: ExplorationInput
  alignment: AlignmentInput
  transition: TransitionStageInput
  establishment: EstablishmentInput
  transitions: TransitionInput
  feedback: FeedbackInput
  system: SystemInput
  handoff: HandoffInput
}

// ── Environment ──────────────────────────────────────────────────────────────

export interface EnvironmentVector {
  jobMarketConditions: number
  financialRunway: number
  roleCompetition: number
  industryTrajectory: number
}

// ── State ────────────────────────────────────────────────────────────────────

export interface TransitionResult {
  readinessScore: number
  isReady: boolean
  blockers: string[]
}

export interface OscillationFlag {
  detected: boolean
  cycles: number
  recommendation: string | null
}

export interface TransitionResults {
  DET: TransitionResult
  EAT: TransitionResult
  ATT: TransitionResult
  TET: TransitionResult
}

export interface HandoffResult {
  triggered: boolean
  targetModel?: string
  relationship?: string
  dataBridge?: HandoffDataBridge
  requiresUserConfirmation?: boolean
}

export interface StateVector {
  D: number
  Ex: number
  A: number
  T: number
  Es: number
  coherence: number
  derailmentRisk: number
  oscillationFlag: OscillationFlag
  transitions: TransitionResults
  stagnantCycles: number
  handoff: HandoffResult
}

// ── Mutable stage scores (internal computation pipeline) ─────────────────────

export interface MutableStageScores {
  D: number
  Ex: number
  A: number
  T: number
  Es: number
}

// ── Configuration ────────────────────────────────────────────────────────────

export interface MontaigneConfig {
  forwardLearningRate: number
  backwardLearningRate: number
  detThreshold: number
  eatThreshold: number
  attThreshold: number
  tetThreshold: number
  minProgressThreshold: number
  oscillationWindowSize: number
  minTestedDirections: number
  minFeedbackSignals: number
  expectedDirections: number
  envWeightMin: number
  envWeightMax: number
  periodicRecalcInterval: string
}
