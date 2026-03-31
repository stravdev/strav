import type { HandoffInput, HandoffResult } from './types.ts'

export function checkModelHandoff(handoff: HandoffInput): HandoffResult {
  // Only relevant during alignment or transition stages
  if (
    handoff.activeStage !== 'alignment' &&
    handoff.activeStage !== 'transition'
  ) {
    return { triggered: false }
  }

  if (!handoff.entrepreneurialIntentDetected) {
    return { triggered: false }
  }

  return {
    triggered: true,
    targetModel: 'khaldun',
    relationship: 'parallel',
    dataBridge: handoff.dataBridge ?? undefined,
    requiresUserConfirmation: true,
  }
}
