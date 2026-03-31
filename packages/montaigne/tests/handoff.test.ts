import { test, expect, describe } from 'bun:test'
import { checkModelHandoff } from '../src/handoff.ts'
import type { HandoffInput } from '../src/types.ts'

describe('checkModelHandoff', () => {
  test('not triggered when stage is discovery', () => {
    const input: HandoffInput = {
      activeStage: 'discovery',
      entrepreneurialIntentDetected: true,
      dataBridge: null,
    }
    expect(checkModelHandoff(input).triggered).toBe(false)
  })

  test('not triggered when stage is exploration', () => {
    const input: HandoffInput = {
      activeStage: 'exploration',
      entrepreneurialIntentDetected: true,
      dataBridge: null,
    }
    expect(checkModelHandoff(input).triggered).toBe(false)
  })

  test('not triggered when stage is establishment', () => {
    const input: HandoffInput = {
      activeStage: 'establishment',
      entrepreneurialIntentDetected: true,
      dataBridge: null,
    }
    expect(checkModelHandoff(input).triggered).toBe(false)
  })

  test('not triggered when no entrepreneurial intent', () => {
    const input: HandoffInput = {
      activeStage: 'alignment',
      entrepreneurialIntentDetected: false,
      dataBridge: null,
    }
    expect(checkModelHandoff(input).triggered).toBe(false)
  })

  test('triggered during alignment with intent', () => {
    const input: HandoffInput = {
      activeStage: 'alignment',
      entrepreneurialIntentDetected: true,
      dataBridge: null,
    }
    const result = checkModelHandoff(input)
    expect(result.triggered).toBe(true)
    expect(result.targetModel).toBe('khaldun')
    expect(result.relationship).toBe('parallel')
    expect(result.requiresUserConfirmation).toBe(true)
  })

  test('triggered during transition with intent', () => {
    const input: HandoffInput = {
      activeStage: 'transition',
      entrepreneurialIntentDetected: true,
      dataBridge: null,
    }
    const result = checkModelHandoff(input)
    expect(result.triggered).toBe(true)
    expect(result.targetModel).toBe('khaldun')
  })

  test('data bridge is passed through when provided', () => {
    const bridge = {
      skills: ['ts', 'design'],
      values: 'autonomy',
      personality: 'intj',
      marketResearch: null,
      fitSignals: null,
      network: ['alice', 'bob'],
      financialPlan: { savings: 50000 },
      narrative: 'building my own thing',
    }
    const input: HandoffInput = {
      activeStage: 'alignment',
      entrepreneurialIntentDetected: true,
      dataBridge: bridge,
    }
    const result = checkModelHandoff(input)
    expect(result.dataBridge).toBe(bridge)
  })

  test('data bridge is undefined when not provided', () => {
    const input: HandoffInput = {
      activeStage: 'alignment',
      entrepreneurialIntentDetected: true,
      dataBridge: null,
    }
    const result = checkModelHandoff(input)
    expect(result.dataBridge).toBeUndefined()
  })
})
