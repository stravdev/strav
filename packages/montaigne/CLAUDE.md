# @stravigor/montaigne

Montaigne v1.0 scoring engine — recursive career development state engine that computes career maturity across 5 stages (Discovery, Exploration, Alignment, Transition, Establishment), transition readiness, feedback loops, and system health metrics.

## Dependencies
- @stravigor/kernel (peer)

## Consumed by
- apps/platform (via MontaigneProvider or direct pure function imports)

## Commands
- bun test
- bun run typecheck

## Architecture
- src/types.ts — all type definitions (StateVector, InputMetrics, MontaigneConfig, etc.)
- src/utils.ts — pure math utilities (clamp, normalize, average, variance)
- src/stages.ts — 5 stage score functions (pure)
- src/transitions.ts — 4 transition readiness functions (pure)
- src/feedback.ts — forward and backward feedback (pure)
- src/environment.ts — environmental modulation (pure)
- src/system.ts — coherence, derailment risk, oscillation detection (pure)
- src/signals.ts — confidence-based signal resolution (pure)
- src/handoff.ts — model handoff check (pure)
- src/engine.ts — updateStateSystem orchestrator (pure)
- src/config.ts — default config and validation
- src/errors.ts — MontaigneError hierarchy
- src/montaigne_manager.ts — IoC-aware manager (wraps engine, emits events)
- src/montaigne_provider.ts — service provider registration
- src/helpers.ts — `montaigne` convenience object

## Design Principles
- Pure computation core: all scoring functions are deterministic with zero side effects
- The Manager adds IoC integration and event emission on top of the pure core
- No database dependency — persistence is the platform's responsibility
- All pure functions are exported from the barrel for direct use without IoC

## Events
- montaigne:state.updated — emitted after every state computation
- montaigne:transition.ready — emitted when a transition becomes ready (newly)
- montaigne:oscillation.detected — emitted when oscillation is first detected
- montaigne:handoff.triggered — emitted when a model handoff is triggered

## Spec Reference
- apps/platform/docs/models/montaigne/math.md
- apps/platform/docs/models/montaigne/scoring-algorithm.md
- apps/platform/docs/models/montaigne/stages.md
