# Montaigne

Recursive career development state engine that scores career maturity across five stages (Discovery, Exploration, Alignment, Transition, Establishment), computes transition readiness, applies feedback loops, and detects systemic risks. Named after Michel de Montaigne (1533-1592), the French philosopher who invented the essay form ("essayer" = to try) — reflecting the experimental, self-reflective nature of career development.

The engine is **pure computation** — every function is deterministic with zero side effects. The platform handles persistence, agent orchestration, and signal extraction. Montaigne only computes.

## Quick start

```typescript
import { montaigne, updateStateSystem, DEFAULT_CONFIG } from '@stravigor/montaigne'

// Direct pure function (no IoC required)
const state = updateStateSystem(inputMetrics, previousState, environment, DEFAULT_CONFIG)

// Or via the IoC-aware helper (after MontaigneProvider is registered)
const state = await montaigne.evaluate(inputMetrics, previousState, environment)
```

## Setup

### Using a service provider (recommended)

```typescript
import { MontaigneProvider } from '@stravigor/montaigne'

app.use(new MontaigneProvider())
```

The `MontaigneProvider` registers `MontaigneManager` as a singleton. It depends on the `config` provider.

### Manual setup

```typescript
import { MontaigneManager } from '@stravigor/montaigne'

app.singleton(MontaigneManager)
app.resolve(MontaigneManager)
```

### Configuration

Create `config/montaigne.ts`:

```typescript
export default {
  forwardLearningRate: 0.1,    // lambda -- forward feedback learning rate (0.01-0.3)
  backwardLearningRate: 0.05,  // mu -- backward feedback learning rate (0.01-0.15)

  // Transition thresholds
  detThreshold: 0.6,           // Discovery -> Exploration (0.4-0.8)
  eatThreshold: 0.65,          // Exploration -> Alignment (0.4-0.8)
  attThreshold: 0.7,           // Alignment -> Transition (0.5-0.9)
  tetThreshold: 0.6,           // Transition -> Establishment (0.4-0.8)

  // Oscillation detection
  minProgressThreshold: 0.05,  // minimum delta to count as progress (0.01-0.1)
  oscillationWindowSize: 3,    // stagnant cycles before flagging (2-10)

  // Career-specific parameters
  minTestedDirections: 2,      // minimum directions explored before EAT (1-10)
  minFeedbackSignals: 3,       // minimum signals before TET (1-10)
  expectedDirections: 4,       // expected total directions for normalization (2-10)
  periodicRecalcInterval: 'weekly' as const,  // recalculation cadence

  // Environmental modulation bounds
  envWeightMin: 0.7,           // minimum environmental multiplier (0.5-0.9)
  envWeightMax: 1.3,           // maximum environmental multiplier (1.1-1.5)
}
```

All fields are optional — omitted values use the defaults shown above. Validation runs at boot time and throws `MontaigneConfigError` for out-of-range values.

## Core concepts

### State vector

The output of every scoring run. Represents the complete state of a career development journey at a point in time.

```typescript
interface StateVector {
  D: number            // Discovery score (0-1)
  Ex: number           // Exploration score (0-1)
  A: number            // Alignment score (0-1)
  T: number            // Transition score (0-1)
  Es: number           // Establishment score (0-1)
  coherence: number    // cross-stage alignment (0-1)
  derailmentRisk: number  // systemic risk (0-1)
  oscillationFlag: OscillationFlag
  transitions: TransitionResults
  handoff: HandoffResult
  stagnantCycles: number  // internal counter for oscillation detection
}
```

### Input metrics

The scoring engine's input. Each section feeds a different computation.

```typescript
interface InputMetrics {
  discovery: DiscoveryInput       // SKS, SG, RP
  exploration: ExplorationInput   // OB, EE, FSS
  alignment: AlignmentInput       // PC, GCR, NC
  transition: TransitionStageInput // AC, ESQ, SS
  establishment: EstablishmentInput // RFS, PT, II
  transitions: TransitionInput    // per-transition metrics
  feedback: FeedbackInput         // forward + backward
  system: SystemInput             // pace, energy, support
  handoff: HandoffInput           // model handoff detection
}
```

### Environment vector

External context that modulates all scores by +/-30%.

```typescript
interface EnvironmentVector {
  jobMarketConditions: number   // 0-1
  financialRunway: number       // 0-1
  roleCompetition: number       // 0-1 (inverted: high competition penalizes)
  industryTrajectory: number    // 0-1
}
```

## Stage scores

Five weighted-sum functions compute the base maturity score for each stage.

### Discovery

```
D(t) = 0.4 * SKS + 0.35 * SG + 0.25 * RP
```

| Variable | Name | Meaning |
|----------|------|---------|
| SKS | Self-Knowledge Score | Depth and specificity of self-understanding |
| SG | Satisfaction Gap | Clarity about what's missing in current situation |
| RP | Readiness Posture | Openness and psychological readiness for change |

### Exploration

```
Ex(t) = 0.3 * OB + 0.35 * EE + 0.35 * FSS
```

| Variable | Name | Meaning |
|----------|------|---------|
| OB | Opportunity Breadth | Range of directions being actively explored |
| EE | Experiment Engagement | Real-world testing vs. theoretical research |
| FSS | Fit Signal Strength | Quality of signals about direction fit |

### Alignment

```
A(t) = 0.35 * PC + 0.35 * GCR + 0.3 * NC
```

| Variable | Name | Meaning |
|----------|------|---------|
| PC | Pathway Clarity | Specificity of the target career path |
| GCR | Gap Closure Rate | Progress on closing skill/experience/network gaps |
| NC | Narrative Coherence | Ability to tell a compelling transition story |

### Transition

```
T(t) = 0.4 * AC + 0.35 * ESQ + 0.25 * SS
```

| Variable | Name | Meaning |
|----------|------|---------|
| AC | Action Commitment | Irreversible actions taken (applications, resignations, enrollments) |
| ESQ | Early Signal Quality | Quality of initial feedback from the new context |
| SS | Support Stability | Strength of support system during transition |

### Establishment

```
Es(t) = 0.35 * RFS + 0.3 * PT + 0.35 * II
```

| Variable | Name | Meaning |
|----------|------|---------|
| RFS | Role Fit Score | How well the new role matches expectations |
| PT | Performance Trajectory | Early performance signals in the new context |
| II | Identity Integration | Degree to which new role is integrated into identity |

## Transitions

Four transition functions determine if someone is ready to advance to the next stage. Each returns a `TransitionResult` with a readiness score, boolean gate, and specific blockers.

**Key difference from Khaldun:** Montaigne uses **linear gating** (no convex exponents), reflecting the more gradual nature of career transitions vs. venture milestones.

```typescript
interface TransitionResult {
  readinessScore: number  // 0-1
  isReady: boolean        // readinessScore >= threshold
  blockers: string[]      // human-readable reasons for not-ready
}
```

### Discovery -> Exploration (DET)

```
DET = D * purposeClarity * opennessFactor
purposeClarity = SKS * (1 - identityAmbiguity)
opennessFactor = 0.7 + 0.3 * explorationReadiness
Threshold: 0.6
```

**Blockers detected:**
- `D < 0.5` -> "Self-knowledge insufficient to explore meaningfully"
- `purposeClarity < 0.4` -> "Core identity questions remain unanswered"
- `readinessPosture < 0.3` -> "Readiness posture critically low"

### Exploration -> Alignment (EAT)

```
EAT = Ex * directionConvergence * experimentDepth
directionConvergence = preferenceClarity * (1 - remainingAmbiguity)
experimentDepth = min(1, testedDirections / minTestedDirections)
Threshold: 0.65
```

**Blockers:** Exploration maturity, direction convergence, experiment engagement.

### Alignment -> Transition (ATT)

```
ATT = A * targetSpecificity * resourceAssessment * riskAwareness
targetSpecificity = roleSpecificity * pathwayCompleteness
resourceAssessment = 0.4 * financial + 0.3 * skill + 0.3 * network
riskAwareness = 0.7 + 0.3 * riskAssessmentQuality
Threshold: 0.7
```

**Blockers:** Alignment maturity, target specificity, resource gaps, narrative coherence.

### Transition -> Establishment (TET)

```
TET = T * commitmentLevel * earlyFeedbackPresence
commitmentLevel = min(1, committedActions / commitmentThreshold)
earlyFeedbackPresence = min(1, feedbackSignals / minFeedbackSignals)
Threshold: 0.6
```

**Blockers:** Transition actions, commitment level, support stability.

## Feedback loops

Recursive cross-stage feedback creates a learning system where later stages refine earlier scores.

### Forward feedback

Later-stage reality refines earlier-stage scores:

```
D  += lambda * (SAA - IS)    // Discovery refined by self-assessment accuracy vs. identity surprise
Ex += lambda * (DV - EW)     // Exploration refined by direction viability vs. exploration waste
A  += lambda * (PA - RG)     // Alignment refined by plan accuracy vs. reality gap
T  += lambda * (TSQ - AdC)   // Transition refined by signal quality vs. adaptation cost
```

`lambda = config.forwardLearningRate` (default: 0.1)

### Backward feedback

Discoveries at a stage correct assumptions made at earlier stages:

```
A  += mu * PRS    // Alignment corrected by plan revision signal
Ex += mu * DCS    // Exploration corrected by direction correction signal
D  += mu * IRS    // Discovery corrected by identity revision signal
```

`mu = config.backwardLearningRate` (default: 0.05)

## Environmental modulation

External conditions modulate all stage scores with per-stage sensitivity. Each stage has different weights reflecting its sensitivity to job market conditions, financial runway, role competition, and industry trajectory.

```
Modulation range: [config.envWeightMin, config.envWeightMax]  (default: 0.7-1.3)
```

- **Discovery** is least affected by external conditions (primarily internal process)
- **Exploration** is moderately affected by job market conditions and industry trajectory
- **Alignment** is sensitive to role competition and financial runway
- **Transition** is most affected by all external factors (highest stakes moment)
- **Establishment** is moderately affected, mainly by industry trajectory

## System metrics

### Coherence

Cross-stage alignment. Requires both progress (high mean) AND balance (low variance):

```
Coherence = mean(D, Ex, A, T, Es) * (1 - variance(D, Ex, A, T, Es))
```

| Range | Interpretation |
|-------|---------------|
| 0.0-0.2 | Severely misaligned or no progress |
| 0.2-0.4 | Significant stage imbalance |
| 0.4-0.6 | Moderate alignment with gaps |
| 0.6-0.8 | Good cross-stage reinforcement |
| 0.8-1.0 | Strong systemic coherence |

### Derailment risk

Unlike Khaldun's failure probability (which models venture collapse), derailment risk models the chance that a career transition stalls or regresses:

```
DerailmentRisk = 1 - (paceEfficiency * energyFactor * supportFactor)
paceEfficiency = min(1, timeAtCurrentStage / expectedStageTime)
energyFactor = energyReserves  (0-1)
supportFactor = supportStrength  (0-1)
```

Any single factor at zero drives derailment risk to 1.

### Oscillation detection

Identifies people who are stuck — cycling through the same patterns without meaningful progress:

```
delta = sum(|S_i(t) - S_i(t-1)|)
isStagnant = delta < config.minProgressThreshold
detected = stagnantCycles >= config.oscillationWindowSize
```

When detected, the engine recommends: *"Progress has stalled. Consider revisiting core assumptions, exploring a different direction, or seeking external perspective."*

## Model handoff

Montaigne supports automatic handoff to Khaldun (the entrepreneurship model) when entrepreneurial intent is detected during the Alignment or Transition stages.

```typescript
interface HandoffResult {
  triggered: boolean
  dataBridge: HandoffDataBridge | null
}

interface HandoffDataBridge {
  skills: number        // from Discovery self-knowledge
  values: number        // from Discovery satisfaction gap
  network: number       // from Alignment network readiness
  financialPlan: number // from Alignment financial readiness
}
```

The data bridge maps career development signals to Khaldun inputs:
- Discovery skills -> Khaldun resources
- Values -> P3 purpose
- Network -> key partners
- Financial plan -> capital readiness

Both models run in parallel on the same user; the platform orchestrator routes by context.

## Signal resolution

Before inputs reach the scoring engine, signals from agents carry two independent confidence dimensions. The `resolveInput` function handles uncertainty:

```typescript
import { resolveInput } from '@stravigor/montaigne'

const resolved = resolveInput({
  value: 0.8,
  extractionConfidence: 0.9,  // how well the agent parsed the message
  signalTrust: 0.45,          // how much the system trusts the claim
})
// resolved.value ~ 0.743 (dampened toward 0.5)
// resolved.dampened === true
```

| Effective confidence | Behavior |
|---------------------|----------|
| >= 0.5 | Value used directly |
| 0.2-0.5 | Dampened toward 0.5 proportionally |
| < 0.2 | Treated as missing (`null`) |

Where `effectiveConfidence = extractionConfidence * signalTrust`.

## The computation pipeline

`updateStateSystem` runs the full scoring pipeline in this order:

1. **Base scores** — compute 5 stage scores from `InputMetrics`
2. **Forward feedback** — later stages refine earlier scores
3. **Backward feedback** — discoveries correct earlier assumptions
4. **Environmental modulation** — external context adjusts all scores
5. **Coherence** — cross-stage alignment metric
6. **Derailment risk** — systemic risk from pace, energy, and support
7. **Oscillation detection** — stagnation check against previous state
8. **Transition readiness** — 4 transitions with blockers
9. **Model handoff** — check for entrepreneurial intent (Khaldun handoff)

The order matters: feedback adjusts scores before environmental modulation, which adjusts before transitions read them. Handoff is evaluated last because it reads the active stage and intent.

## Events

When using the IoC-integrated `MontaigneManager.evaluate()`, events are emitted:

| Event | Payload | When |
|-------|---------|------|
| `montaigne:state.updated` | `{ state, inputMetrics, environment }` | Every `evaluate()` call |
| `montaigne:transition.ready` | `{ transition, result }` | A transition becomes ready (newly) |
| `montaigne:oscillation.detected` | `{ flag }` | Oscillation first detected |
| `montaigne:handoff.triggered` | `{ handoff }` | Model handoff first triggered |

```typescript
import { Emitter } from '@stravigor/kernel'

Emitter.on('montaigne:transition.ready', ({ transition, result }) => {
  console.log(`${transition} is ready! Score: ${result.readinessScore}`)
  // Notify the orchestrator to suggest stage advancement
})

Emitter.on('montaigne:handoff.triggered', ({ handoff }) => {
  console.log('Entrepreneurial intent detected — spawn Khaldun project')
  // Platform creates linked Khaldun project with data bridge
})
```

## Direct function imports

All pure functions are exported from the barrel for use without IoC:

```typescript
import {
  // Stage scores
  computeDiscoveryScore,
  computeExplorationScore,
  computeAlignmentScore,
  computeTransitionScore,
  computeEstablishmentScore,

  // Transitions
  computeDET,
  computeEAT,
  computeATT,
  computeTET,

  // Feedback
  applyForwardFeedback,
  applyBackwardFeedback,

  // Environment
  applyEnvironmentalModulation,

  // System metrics
  computeCoherence,
  computeDerailmentRisk,
  detectOscillation,

  // Model handoff
  checkModelHandoff,

  // Signals
  resolveInput,

  // Orchestrator
  updateStateSystem,

  // Utilities
  clamp,
  normalize,
  normalizeInverse,
  average,
  variance,

  // Config
  DEFAULT_CONFIG,
  validateConfig,
} from '@stravigor/montaigne'
```

This is useful for:
- **Testing** — test individual functions in isolation
- **Custom pipelines** — compose only the stages you need
- **Platform integration** — call functions without IoC overhead

## Platform integration

The platform consumes Montaigne through a standard pattern:

```typescript
// 1. Agents extract signals from conversation
const signal = { value: 0.8, extractionConfidence: 0.9, signalTrust: 0.7 }
const resolved = montaigne.resolveSignal(signal)

// 2. Resolved values are aggregated into InputMetrics
// (platform responsibility -- not in this package)

// 3. Scoring engine computes new state
const newState = await montaigne.evaluate(inputMetrics, previousState, environment)

// 4. Platform persists the StateVector
// (platform responsibility -- not in this package)

// 5. Orchestrator reads transitions and guides the conversation
if (newState.transitions.DET.isReady) {
  // Suggest moving to Exploration
}
for (const blocker of newState.transitions.DET.blockers) {
  // Address specific gaps
}

// 6. Check for model handoff
if (newState.handoff.triggered) {
  // Spawn linked Khaldun project with data bridge
  const bridge = newState.handoff.dataBridge
}
```

## Key differences from Khaldun

| Aspect | Khaldun | Montaigne |
|--------|---------|-----------|
| Domain | Entrepreneurship | Career development |
| Gating | Convex (I^1.5, V^1.2) | Linear (no exponents) |
| Thresholds | 0.7 -> 0.85 | 0.6 -> 0.7 |
| Risk metric | Failure probability | Derailment risk |
| Data source | Mixed (metrics + conversation) | Primarily conversational |
| Handoff | Receives from Montaigne | Triggers handoff to Khaldun |
| Lifecycle | Linear (venture has endpoint) | Cyclical (Establishment -> Discovery) |
| Team Coherence | Yes (circles) | No (career is individual) |

## Spec reference

The implementation follows these specification documents exactly:

- `apps/platform/docs/models/montaigne/math.md` — formal mathematical definitions
- `apps/platform/docs/models/montaigne/scoring-algorithm.md` — pseudocode and data model
- `apps/platform/docs/models/montaigne/stages.md` — stage definitions and variable descriptions
