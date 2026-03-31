import {
  inject,
  Configuration,
  Emitter,
  ConfigurationError,
} from '@stravigor/kernel'
import type {
  InputMetrics,
  StateVector,
  EnvironmentVector,
  MontaigneConfig,
  Signal,
  ResolvedSignal,
} from './types.ts'
import { DEFAULT_CONFIG, validateConfig } from './config.ts'
import { updateStateSystem } from './engine.ts'
import { resolveInput } from './signals.ts'

@inject
export default class MontaigneManager {
  private static _config: MontaigneConfig

  constructor(config: Configuration) {
    const overrides = config.get(
      'montaigne',
      {}
    ) as Partial<MontaigneConfig>
    MontaigneManager._config = { ...DEFAULT_CONFIG, ...overrides }
    validateConfig(MontaigneManager._config)
  }

  static get config(): MontaigneConfig {
    if (!MontaigneManager._config) {
      throw new ConfigurationError(
        'MontaigneManager not configured. Resolve it through the container first.'
      )
    }
    return MontaigneManager._config
  }

  static getDefaultConfig(): MontaigneConfig {
    return { ...DEFAULT_CONFIG }
  }

  static async evaluate(
    inputMetrics: InputMetrics,
    previousState: StateVector | null,
    environment: EnvironmentVector
  ): Promise<StateVector> {
    const state = updateStateSystem(
      inputMetrics,
      previousState,
      environment,
      MontaigneManager._config
    )

    await Emitter.emit('montaigne:state.updated', {
      state,
      inputMetrics,
      environment,
    })

    if (previousState) {
      const t = state.transitions
      const p = previousState.transitions
      if (t.DET.isReady && !p.DET.isReady)
        await Emitter.emit('montaigne:transition.ready', {
          transition: 'DET',
          result: t.DET,
        })
      if (t.EAT.isReady && !p.EAT.isReady)
        await Emitter.emit('montaigne:transition.ready', {
          transition: 'EAT',
          result: t.EAT,
        })
      if (t.ATT.isReady && !p.ATT.isReady)
        await Emitter.emit('montaigne:transition.ready', {
          transition: 'ATT',
          result: t.ATT,
        })
      if (t.TET.isReady && !p.TET.isReady)
        await Emitter.emit('montaigne:transition.ready', {
          transition: 'TET',
          result: t.TET,
        })
    }

    if (
      state.oscillationFlag.detected &&
      (!previousState || !previousState.oscillationFlag.detected)
    ) {
      await Emitter.emit('montaigne:oscillation.detected', {
        flag: state.oscillationFlag,
      })
    }

    if (
      state.handoff.triggered &&
      (!previousState || !previousState.handoff.triggered)
    ) {
      await Emitter.emit('montaigne:handoff.triggered', {
        handoff: state.handoff,
      })
    }

    return state
  }

  static resolveSignal(signal: Signal): ResolvedSignal {
    return resolveInput(signal)
  }

  static reset(): void {
    MontaigneManager._config = undefined as any
  }
}
