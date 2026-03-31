import MontaigneManager from './montaigne_manager.ts'
import type {
  InputMetrics,
  StateVector,
  EnvironmentVector,
  MontaigneConfig,
  Signal,
  ResolvedSignal,
} from './types.ts'

/**
 * Montaigne helper — the primary convenience API.
 *
 * @example
 * import { montaigne } from '@stravigor/montaigne'
 *
 * const state = await montaigne.evaluate(metrics, previousState, environment)
 */
export const montaigne = {
  evaluate(
    inputMetrics: InputMetrics,
    previousState: StateVector | null,
    environment: EnvironmentVector
  ): Promise<StateVector> {
    return MontaigneManager.evaluate(
      inputMetrics,
      previousState,
      environment
    )
  },

  resolveSignal(signal: Signal): ResolvedSignal {
    return MontaigneManager.resolveSignal(signal)
  },

  get config(): MontaigneConfig {
    return MontaigneManager.config
  },

  getDefaultConfig(): MontaigneConfig {
    return MontaigneManager.getDefaultConfig()
  },
}
