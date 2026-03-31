import { inject, Configuration, Emitter, ConfigurationError } from '@stravigor/kernel'
import type {
  InputMetrics,
  StateVector,
  EnvironmentVector,
  KhaldunConfig,
  Signal,
  ResolvedSignal,
} from './types.ts'
import { DEFAULT_CONFIG, validateConfig } from './config.ts'
import { updateStateSystem } from './engine.ts'
import { resolveInput } from './signals.ts'

@inject
export default class KhaldunManager {
  private static _config: KhaldunConfig

  constructor(config: Configuration) {
    const overrides = config.get('khaldun', {}) as Partial<KhaldunConfig>
    KhaldunManager._config = { ...DEFAULT_CONFIG, ...overrides }
    validateConfig(KhaldunManager._config)
  }

  static get config(): KhaldunConfig {
    if (!KhaldunManager._config) {
      throw new ConfigurationError(
        'KhaldunManager not configured. Resolve it through the container first.'
      )
    }
    return KhaldunManager._config
  }

  static getDefaultConfig(): KhaldunConfig {
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
      KhaldunManager._config
    )

    await Emitter.emit('khaldun:state.updated', { state, inputMetrics, environment })

    if (previousState) {
      const t = state.transitions
      const p = previousState.transitions
      if (t.IVT.isReady && !p.IVT.isReady)
        await Emitter.emit('khaldun:transition.ready', { transition: 'IVT', result: t.IVT })
      if (t.VLT.isReady && !p.VLT.isReady)
        await Emitter.emit('khaldun:transition.ready', { transition: 'VLT', result: t.VLT })
      if (t.LGT.isReady && !p.LGT.isReady)
        await Emitter.emit('khaldun:transition.ready', { transition: 'LGT', result: t.LGT })
      if (t.GST.isReady && !p.GST.isReady)
        await Emitter.emit('khaldun:transition.ready', { transition: 'GST', result: t.GST })
    }

    if (
      state.oscillationFlag.detected &&
      (!previousState || !previousState.oscillationFlag.detected)
    ) {
      await Emitter.emit('khaldun:oscillation.detected', { flag: state.oscillationFlag })
    }

    if (
      state.teamCoherence < 0.5 &&
      (!previousState || previousState.teamCoherence >= 0.5)
    ) {
      await Emitter.emit('khaldun:team.coherence.low', {
        teamCoherence: state.teamCoherence,
      })
    }

    return state
  }

  static resolveSignal(signal: Signal): ResolvedSignal {
    return resolveInput(signal)
  }

  static reset(): void {
    KhaldunManager._config = undefined as any
  }
}
