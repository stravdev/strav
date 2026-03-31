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

export interface IdeationInput {
  problemClarityScore: number
  solutionSpecificity: number
  assumptionDensity: number
  layerAlignment: number
}

export interface ValidationInput {
  hypothesisConversionRate: number
  evidenceStrength: number
  signalNoiseRatio: number
}

export interface LaunchInput {
  buildCompletionPercentage: number
  userAcquisitionRate: number
  retentionRate: number
  usageFrequency: number
  userSatisfaction: number
}

export interface GrowthInput {
  revenueGrowthRate: number
  cacEfficiencyTrend: number
  retentionDynamics: number
}

export interface ScaleInput {
  operationalEfficiencyIndex: number
  marketShareGrowth: number
  systemScalabilityScore: number
}

export interface TransitionInput {
  // IVT
  identifiedAssumptions: number
  expectedAssumptions: number
  assumptionsWithTests: number
  segmentClarity: number
  estimatedTAM: number
  problemUrgency: number
  environmentalAwareness: number
  // VLT
  evidenceStrength: number
  demandSignalConsistency: number
  teamReadiness: number
  capitalReadiness: number
  techReadiness: number
  // LGT
  pmfProxy: number
  userAcquisitionRate: number
  userSatisfaction: number
  expectedGrowthTarget: number
  // GST
  ltvToCacRatio: number
  paybackPeriodMonths: number
  marketSize: number
  currentMarketShare: number
  totalAddressableMarket: number
}

export interface FeedbackInput {
  // Forward
  problemValidationScore: number
  assumptionPenalty: number
  marketResponse: number
  predictionError: number
  scalabilityFactor: number
  technicalDebt: number
  efficiencyGain: number
  resourceWaste: number
  // Backward
  realityCheckFactor: number
  userBehaviorInsight: number
  problemRedefinitionSignal: number
}

export interface SystemInput {
  runwayRemaining: number
  expectedRunway: number
  availableCapital: number
  requiredCapital: number
}

// ── Circle (Team Coherence) ──────────────────────────────────────────────────

export interface CircleMemberSignal {
  memberId: string
  value: number
  signalTrust: number
}

export interface P3Signal {
  product: number
  purpose: number
  politics: number
}

export interface CircleInput {
  memberSignals: Map<string, CircleMemberSignal[]>
  sessionsPerMember: Map<string, number>
  p3SignalsPerMember: Map<string, P3Signal>
  contestedVariables: Set<string>
  deferredVariables: Set<string>
  lastConsensusValues: Map<string, number>
}

// ── Composite Input ──────────────────────────────────────────────────────────

export interface InputMetrics {
  ideation: IdeationInput
  validation: ValidationInput
  launch: LaunchInput
  growth: GrowthInput
  scale: ScaleInput
  transitions: TransitionInput
  feedback: FeedbackInput
  system: SystemInput
  circle: CircleInput | null
}

// ── Environment ──────────────────────────────────────────────────────────────

export interface EnvironmentVector {
  marketVolatility: number
  capitalAvailability: number
  competitiveIntensity: number
  industryMaturity: number
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
  IVT: TransitionResult
  VLT: TransitionResult
  LGT: TransitionResult
  GST: TransitionResult
}

export interface StateVector {
  I: number
  V: number
  L: number
  G: number
  Sc: number
  coherence: number
  failureProbability: number
  oscillationFlag: OscillationFlag
  transitions: TransitionResults
  stagnantCycles: number
  teamCoherence: number
}

// ── Mutable stage scores (internal computation pipeline) ─────────────────────

export interface MutableStageScores {
  I: number
  V: number
  L: number
  G: number
  Sc: number
}

// ── Configuration ────────────────────────────────────────────────────────────

export interface KhaldunConfig {
  forwardLearningRate: number
  backwardLearningRate: number
  ivtThreshold: number
  vltThreshold: number
  lgtThreshold: number
  gstThreshold: number
  minProgressThreshold: number
  oscillationWindowSize: number
  expectedMaxUAR: number
  minViableTAM: number
  maxTAM: number
  envWeightMin: number
  envWeightMax: number
}
