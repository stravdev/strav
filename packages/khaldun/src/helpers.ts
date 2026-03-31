import KhaldunManager from './khaldun_manager.ts'
import type {
  InputMetrics,
  StateVector,
  EnvironmentVector,
  KhaldunConfig,
  Signal,
  ResolvedSignal,
} from './types.ts'

/**
 * Khaldun helper — the primary convenience API.
 *
 * @example
 * import { khaldun } from '@stravigor/khaldun'
 *
 * const state = await khaldun.evaluate(metrics, previousState, environment)
 */
export const khaldun = {
  evaluate(
    inputMetrics: InputMetrics,
    previousState: StateVector | null,
    environment: EnvironmentVector
  ): Promise<StateVector> {
    return KhaldunManager.evaluate(inputMetrics, previousState, environment)
  },

  resolveSignal(signal: Signal): ResolvedSignal {
    return KhaldunManager.resolveSignal(signal)
  },

  get config(): KhaldunConfig {
    return KhaldunManager.config
  },

  getDefaultConfig(): KhaldunConfig {
    return KhaldunManager.getDefaultConfig()
  },
}
