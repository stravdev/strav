# Khaldun

Recursive entrepreneurial state engine that scores venture maturity across five stages (Ideation, Validation, Launch, Growth, Scale), computes transition readiness, applies feedback loops, and detects systemic risks. Named after Ibn Khaldun (1332–1406), the Tunisian historian-economist who first modeled civilizational progress as measurable stages.

The engine is **pure computation** — every function is deterministic with zero side effects. The platform handles persistence, agent orchestration, and signal extraction. Khaldun only computes.

## Quick start

```typescript
import { khaldun, updateStateSystem, DEFAULT_CONFIG } from '@strav/khaldun'

// Direct pure function (no IoC required)
const state = updateStateSystem(inputMetrics, previousState, environment, DEFAULT_CONFIG)

// Or via the IoC-aware helper (after KhaldunProvider is registered)
const state = await khaldun.evaluate(inputMetrics, previousState, environment)
```

## Setup

### Using a service provider (recommended)

```typescript
import { KhaldunProvider } from '@strav/khaldun'

app.use(new KhaldunProvider())
```

The `KhaldunProvider` registers `KhaldunManager` as a singleton. It depends on the `config` provider.

### Manual setup

```typescript
import { KhaldunManager } from '@strav/khaldun'

app.singleton(KhaldunManager)
app.resolve(KhaldunManager)
```

### Configuration

Create `config/khaldun.ts`:

```typescript
export default {
  forwardLearningRate: 0.1,    // λ — forward feedback learning rate (0.01–0.3)
  backwardLearningRate: 0.05,  // μ — backward feedback learning rate (0.01–0.15)

  // Transition thresholds
  ivtThreshold: 0.7,           // Ideation → Validation (0.5–0.9)
  vltThreshold: 0.75,          // Validation → Launch (0.5–0.9)
  lgtThreshold: 0.8,           // Launch → Growth (0.5–0.9)
  gstThreshold: 0.85,          // Growth → Scale (0.5–0.95)

  // Oscillation detection
  minProgressThreshold: 0.05,  // minimum delta to count as progress (0.01–0.1)
  oscillationWindowSize: 3,    // stagnant cycles before flagging (2–10)

  // Project-specific normalization
  expectedMaxUAR: 1000,        // max user acquisition rate for normalization
  minViableTAM: 1_000_000,    // minimum viable TAM
  maxTAM: 1_000_000_000,      // maximum TAM for normalization

  // Environmental modulation bounds
  envWeightMin: 0.7,           // minimum environmental multiplier (0.5–0.9)
  envWeightMax: 1.3,           // maximum environmental multiplier (1.1–1.5)
}
```

All fields are optional — omitted values use the defaults shown above. Validation runs at boot time and throws `KhaldunConfigError` for out-of-range values.

## Core concepts

### State vector

The output of every scoring run. Represents the complete state of a venture at a point in time.

```typescript
interface StateVector {
  I: number           // Ideation score (0–1)
  V: number           // Validation score (0–1)
  L: number           // Launch score (0–1)
  G: number           // Growth score (0–1)
  Sc: number          // Scale score (0–1)
  coherence: number   // cross-stage alignment (0–1)
  failureProbability: number  // systemic risk (0–1)
  oscillationFlag: OscillationFlag
  transitions: TransitionResults
  stagnantCycles: number      // internal counter for oscillation detection
}
```

### Input metrics

The scoring engine's input. Each section feeds a different computation.

```typescript
interface InputMetrics {
  ideation: IdeationInput       // PCS, SS, AD, LA
  validation: ValidationInput   // HCR, ES, SNR
  launch: LaunchInput           // BCP, UAR, retention, usage, satisfaction
  growth: GrowthInput           // RGR, CACT, RD
  scale: ScaleInput             // OEI, MSG, SSS
  transitions: TransitionInput  // per-transition metrics (assumptions, market, resources)
  feedback: FeedbackInput       // forward (PVS, AP, MR, PE, SF, TD, EG, RW) + backward (RCF, UBI, PRS)
  system: SystemInput           // runway, capital
}
```

### Environment vector

External context that modulates all scores by ±30%.

```typescript
interface EnvironmentVector {
  marketVolatility: number      // 0–1
  capitalAvailability: number   // 0–1
  competitiveIntensity: number  // 0–1
  industryMaturity: number      // 0–1
}
```

## Stage scores

Five weighted-sum functions compute the base maturity score for each stage.

### Ideation

```
I(t) = 0.35 × PCS + 0.35 × SS + 0.15 × AD_inv + 0.15 × LA
```

| Variable | Name | Meaning |
|----------|------|---------|
| PCS | Problem Clarity Score | Precision and specificity of problem definition |
| SS | Solution Specificity | Concreteness of proposed solution mechanism |
| AD | Assumption Density | Total assumptions / core hypotheses (lower is better, inverse-normalized) |
| LA | Layer Alignment | P³ coherence: `mean(product, purpose, politics) × (1 - variance)` |

### Validation

```
V(t) = 0.5 × HCR + 0.3 × ES + 0.2 × SNR
```

| Variable | Name | Meaning |
|----------|------|---------|
| HCR | Hypothesis Conversion Rate | Tested assumptions / total assumptions |
| ES | Evidence Strength | Weighted quality of validation signals |
| SNR | Signal-to-Noise Ratio | Consistent signals / total signals |

### Launch

```
L(t) = 0.4 × BCP + 0.3 × UAR_norm + 0.3 × PMF
PMF  = 0.4 × retention + 0.3 × usage + 0.3 × satisfaction
```

| Variable | Name | Meaning |
|----------|------|---------|
| BCP | Build Completion | Completed features / planned MVP features |
| UAR | User Acquisition Rate | Normalized against `config.expectedMaxUAR` |
| PMF | Product-Market Fit Proxy | Composite of retention, usage, satisfaction |

### Growth

```
G(t) = 0.4 × RGR_norm + 0.3 × CACT + 0.3 × RD
```

| Variable | Name | Meaning |
|----------|------|---------|
| RGR | Revenue Growth Rate | MoM growth, normalized from [-0.2, 0.5] |
| CACT | CAC Efficiency Trend | `1 - (current_CAC / baseline_CAC)` |
| RD | Retention Dynamics | `0.5 × LTV_trend + 0.5 × churn_stability` |

### Scale

```
Sc(t) = 0.4 × OEI + 0.3 × MSG + 0.3 × SSS
```

| Variable | Name | Meaning |
|----------|------|---------|
| OEI | Operational Efficiency Index | Revenue per employee, normalized |
| MSG | Market Share Growth | Relative market share delta |
| SSS | System Scalability Score | `1 - (peak_demand / max_capacity)` |

## Transitions

Four transition functions determine if a venture is ready to advance to the next stage. Each returns a `TransitionResult` with a readiness score, boolean gate, and specific blockers.

```typescript
interface TransitionResult {
  readinessScore: number  // 0–1
  isReady: boolean        // readinessScore >= threshold
  blockers: string[]      // human-readable reasons for not-ready
}
```

### Ideation → Validation (IVT)

```
IVT = I^1.5 × AssumptionReadiness × ProblemMarketAlignment × EnvironmentalFactor
Threshold: 0.7
```

**Blockers detected:**
- `I < 0.6` → "Ideation maturity insufficient"
- `AssumptionReadiness < 0.5` → "Assumptions not identified or lack test plans"
- `ProblemMarketAlignment < 0.5` → "Weak market fit or vague ICP"
- `EnvironmentalAwareness < 0.3` → "Operating environment constraints not mapped"

### Validation → Launch (VLT)

```
VLT = V^1.2 × MarketConfidence × ResourceReadiness
Threshold: 0.75
```

**Blockers:** Validation maturity, demand signals, resource gaps.

### Launch → Growth (LGT)

```
LGT = L × PMFValidation × MarketResponse
Threshold: 0.8
```

**Blockers:** Launch execution, PMF validation (soft threshold at 0.6), market traction.

### Growth → Scale (GST)

```
GST = G × SustainabilityIndex × MarketMaturity
Threshold: 0.85
```

**Blockers:** Growth stability, unit economics (LTV:CAC ≥ 3, payback ≤ 12 months), market expansion readiness.

## Feedback loops

Recursive cross-stage feedback creates a learning system where later stages refine earlier scores.

### Forward feedback

Later-stage reality refines earlier-stage scores:

```
I += λ × (PVS - AP)    // Ideation refined by validation reality
V += λ × (MR - PE)     // Validation refined by launch reality
L += λ × (SF - TD)     // Launch refined by growth insights
G += λ × (EG - RW)     // Growth refined by scale efficiency
```

`λ = config.forwardLearningRate` (default: 0.1)

### Backward feedback

Discoveries at a stage correct assumptions made at earlier stages:

```
V += μ × RCF    // Validation corrected by launch reality
L += μ × UBI    // Launch corrected by growth user insights
I += μ × PRS    // Ideation corrected by validation results
```

`μ = config.backwardLearningRate` (default: 0.05)

## Environmental modulation

External conditions modulate all stage scores with per-stage sensitivity. Each stage has different weights reflecting its sensitivity to market volatility, capital availability, competitive intensity, and industry maturity.

```
Modulation range: [config.envWeightMin, config.envWeightMax]  (default: 0.7–1.3)
```

- **Ideation** is most sensitive to industry maturity (emerging markets boost ideation value)
- **Launch** is most sensitive to market volatility (volatile markets penalize launch timing)
- **Growth** is most sensitive to capital availability (capital fuels growth)
- **Scale** is most sensitive to competitive intensity (competition constrains scale)

## System metrics

### Coherence

Cross-stage alignment. Requires both progress (high mean) AND balance (low variance):

```
Coherence = mean(I, V, L, G, Sc) × (1 - variance(I, V, L, G, Sc))
```

| Range | Interpretation |
|-------|---------------|
| 0.0–0.2 | Severely misaligned or no progress |
| 0.2–0.4 | Significant stage imbalance |
| 0.4–0.6 | Moderate alignment with gaps |
| 0.6–0.8 | Good cross-stage reinforcement |
| 0.8–1.0 | Strong systemic coherence |

### Failure probability

Product of three factors — any single factor at zero drives failure probability to 1:

```
P(Failure) = 1 - (stateMaturity × timeEfficiency × resourceSustainability)
```

### Oscillation detection

Identifies ventures that are stuck — bouncing between states without meaningful progress:

```
delta = Σ|S_i(t) - S_i(t-1)|
isStagnant = delta < config.minProgressThreshold
detected = stagnantCycles >= config.oscillationWindowSize
```

When detected, the engine recommends: *"Structural intervention needed: consider pivot, resource reallocation, or stage regression."*

## Signal resolution

Before inputs reach the scoring engine, signals from agents carry two independent confidence dimensions. The `resolveInput` function handles uncertainty:

```typescript
import { resolveInput } from '@strav/khaldun'

const resolved = resolveInput({
  value: 0.8,
  extractionConfidence: 0.9,  // how well the agent parsed the message
  signalTrust: 0.45,          // how much the system trusts the claim
})
// resolved.value ≈ 0.743 (dampened toward 0.5)
// resolved.dampened === true
```

| Effective confidence | Behavior |
|---------------------|----------|
| ≥ 0.5 | Value used directly |
| 0.2–0.5 | Dampened toward 0.5 proportionally |
| < 0.2 | Treated as missing (`null`) |

Where `effectiveConfidence = extractionConfidence × signalTrust`.

## The computation pipeline

`updateStateSystem` runs the full scoring pipeline in this order:

1. **Base scores** — compute 5 stage scores from `InputMetrics`
2. **Forward feedback** — later stages refine earlier scores
3. **Backward feedback** — discoveries correct earlier assumptions
4. **Environmental modulation** — external context adjusts all scores
5. **Coherence** — cross-stage alignment metric
6. **Failure probability** — systemic risk from maturity, time, and resources
7. **Oscillation detection** — stagnation check against previous state
8. **Transition readiness** — 4 transitions with blockers

The order matters: feedback adjusts scores before environmental modulation, which adjusts before transitions read them.

## Events

When using the IoC-integrated `KhaldunManager.evaluate()`, events are emitted:

| Event | Payload | When |
|-------|---------|------|
| `khaldun:state.updated` | `{ state, inputMetrics, environment }` | Every `evaluate()` call |
| `khaldun:transition.ready` | `{ transition, result }` | A transition becomes ready (newly) |
| `khaldun:oscillation.detected` | `{ flag }` | Oscillation first detected |

```typescript
import { Emitter } from '@strav/kernel'

Emitter.on('khaldun:transition.ready', ({ transition, result }) => {
  console.log(`${transition} is ready! Score: ${result.readinessScore}`)
  // Notify the orchestrator to suggest stage advancement
})

Emitter.on('khaldun:oscillation.detected', ({ flag }) => {
  console.log(`Oscillation detected after ${flag.cycles} stagnant cycles`)
  // Trigger intervention recommendation
})
```

## Direct function imports

All pure functions are exported from the barrel for use without IoC:

```typescript
import {
  // Stage scores
  computeIdeationScore,
  computeValidationScore,
  computeLaunchScore,
  computeGrowthScore,
  computeScaleScore,

  // Transitions
  computeIVT,
  computeVLT,
  computeLGT,
  computeGST,

  // Feedback
  applyForwardFeedback,
  applyBackwardFeedback,

  // Environment
  applyEnvironmentalModulation,

  // System metrics
  computeCoherence,
  computeFailureProbability,
  detectOscillation,

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
} from '@strav/khaldun'
```

This is useful for:
- **Testing** — test individual functions in isolation
- **Custom pipelines** — compose only the stages you need
- **Platform integration** — call functions without IoC overhead

## Platform integration

The platform consumes Khaldun through a standard pattern:

```typescript
// 1. Agents extract signals from conversation
const signal = { value: 0.8, extractionConfidence: 0.9, signalTrust: 0.7 }
const resolved = khaldun.resolveSignal(signal)

// 2. Resolved values are aggregated into InputMetrics
// (platform responsibility — not in this package)

// 3. Scoring engine computes new state
const newState = await khaldun.evaluate(inputMetrics, previousState, environment)

// 4. Platform persists the StateVector
// (platform responsibility — not in this package)

// 5. Orchestrator reads transitions and guides the conversation
if (newState.transitions.IVT.isReady) {
  // Suggest moving to Validation
}
for (const blocker of newState.transitions.IVT.blockers) {
  // Address specific gaps
}
```

## Model pluggability

Khaldun is the **first** scoring model, not the only one the platform will ever use. The platform codes against the `StateVector` and `InputMetrics` interfaces. A future model (e.g., career development) would:

1. Implement its own `updateStateSystem` with different stages and formulas
2. Return the same `StateVector` shape (stage scores, coherence, failure probability, transitions)
3. Accept the same `InputMetrics` shape (or a compatible superset)
4. Register as a different provider

The platform's orchestration, signal extraction, and dashboard rendering remain unchanged.

## Spec reference

The implementation follows these specification documents exactly:

- `apps/platform/docs/models/khaldun/math.md` — formal mathematical definitions
- `apps/platform/docs/models/khaldun/scoring-algorithm.md` — pseudocode and data model
- `apps/platform/docs/models/khaldun/stages.md` — stage definitions and variable descriptions
