# @stravigor/khaldun

Khaldun v2.2 scoring engine — recursive entrepreneurial state engine that computes venture maturity across 5 stages (Ideation, Validation, Launch, Growth, Scale), transition readiness, feedback loops, and system health metrics.

## Dependencies
- @stravigor/kernel (peer)

## Consumed by
- apps/platform (via KhaldunProvider or direct pure function imports)

## Commands
- bun test
- bun run typecheck

## Architecture
- src/types.ts — all type definitions (StateVector, InputMetrics, KhaldunConfig, etc.)
- src/utils.ts — pure math utilities (clamp, normalize, average, variance)
- src/stages.ts — 5 stage score functions (pure)
- src/transitions.ts — 4 transition readiness functions (pure)
- src/feedback.ts — forward and backward feedback (pure)
- src/environment.ts — environmental modulation (pure)
- src/system.ts — coherence, failure probability, oscillation detection (pure)
- src/team_coherence.ts — team coherence for shared projects/circles (pure)
- src/signals.ts — confidence-based signal resolution (pure)
- src/engine.ts — updateStateSystem orchestrator (pure)
- src/config.ts — default config and validation
- src/errors.ts — KhaldunError hierarchy
- src/khaldun_manager.ts — IoC-aware manager (wraps engine, emits events)
- src/khaldun_provider.ts — service provider registration
- src/helpers.ts — `khaldun` convenience object

## Design Principles
- Pure computation core: all scoring functions are deterministic with zero side effects
- The Manager adds IoC integration and event emission on top of the pure core
- No database dependency — persistence is the platform's responsibility
- All pure functions are exported from the barrel for direct use without IoC

## Events
- khaldun:state.updated — emitted after every state computation
- khaldun:transition.ready — emitted when a transition becomes ready (newly)
- khaldun:oscillation.detected — emitted when oscillation is first detected
- khaldun:team.coherence.low — emitted when team coherence drops below 0.5

## Spec Reference
- apps/platform/docs/models/khaldun/math.md
- apps/platform/docs/models/khaldun/scoring-algorithm.md
- apps/platform/docs/models/khaldun/stages.md
