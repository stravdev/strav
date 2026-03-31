import { describe, test, expect } from 'bun:test'
import { schema } from '../src/schema.ts'
import { Archetype } from '@stravigor/database'

describe('social_account schema', () => {
  test('name is social_account', () => {
    expect(schema.name).toBe('social_account')
  })

  test('archetype is Component', () => {
    expect(schema.archetype).toBe(Archetype.Component)
  })

  test('parents includes user', () => {
    expect(schema.parents).toEqual(['user'])
  })

  test('has required provider field with index', () => {
    const f = schema.fields.provider
    expect(f).toBeDefined()
    expect(f.pgType).toBe('varchar')
    expect(f.required).toBe(true)
    expect(f.index).toBe(true)
  })

  test('has required providerId field with index', () => {
    const f = schema.fields.providerId
    expect(f).toBeDefined()
    expect(f.pgType).toBe('varchar')
    expect(f.required).toBe(true)
    expect(f.index).toBe(true)
  })

  test('has sensitive token field', () => {
    const f = schema.fields.token
    expect(f).toBeDefined()
    expect(f.pgType).toBe('text')
    expect(f.required).toBe(true)
    expect(f.sensitive).toBe(true)
  })

  test('has nullable sensitive refreshToken field', () => {
    const f = schema.fields.refreshToken
    expect(f).toBeDefined()
    expect(f.pgType).toBe('text')
    expect(f.nullable).toBe(true)
    expect(f.sensitive).toBe(true)
  })

  test('has nullable expiresAt field', () => {
    const f = schema.fields.expiresAt
    expect(f).toBeDefined()
    expect(f.pgType).toBe('timestamptz')
    expect(f.nullable).toBe(true)
  })
})
