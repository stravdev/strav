import { expect, test, describe } from 'bun:test'
import { ulid, isUlid } from '@stravigor/kernel/helpers'
import { BaseModel, ulid as ulidDecorator } from '../src/orm'
import { defineSchema, t, Archetype } from '../src/schema'

describe('ULID Support', () => {
  test('ulid() generates valid ULIDs', () => {
    const id = ulid()
    expect(id).toBeDefined()
    expect(typeof id).toBe('string')
    expect(id.length).toBe(26)
    expect(isUlid(id)).toBe(true)
  })

  test('isUlid() validates ULID format', () => {
    expect(isUlid('01HQVB2YKQF5JZRJ8E9QKQHQWR')).toBe(true)
    expect(isUlid('not-a-ulid')).toBe(false)
    expect(isUlid('IIIIIIIIIIIIIIIIIIIIIIIIII')).toBe(false) // I is not valid in Crockford's base32
    expect(isUlid('LLLLLLLLLLLLLLLLLLLLLLLLLL')).toBe(false) // L is not valid in Crockford's base32
    expect(isUlid('01HQVB2YKQF5JZRJ8E9QKQHQW')).toBe(false) // too short
    expect(isUlid('01HQVB2YKQF5JZRJ8E9QKQHQWRX')).toBe(false) // too long
  })

  test('TypeBuilder supports ulid() method', () => {
    const schema = defineSchema('TestModel', {
      archetype: Archetype.Entity,
      fields: {
        id: t.ulid().primaryKey(),
        email: t.varchar().email(),
      },
    })

    expect(schema).toBeDefined()
    expect(schema.fields.id).toBeDefined()
    expect(schema.fields.id.pgType).toBe('char')
    expect(schema.fields.id.length).toBe(26)
    expect(schema.fields.id.isUlid).toBe(true)
  })

  test('ULIDs are sortable', async () => {
    const id1 = ulid()
    // Wait to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 2))
    const id2 = ulid()
    await new Promise(resolve => setTimeout(resolve, 2))
    const id3 = ulid()

    const sorted = [id3, id1, id2].sort()
    expect(sorted[0]).toBe(id1)
    expect(sorted[1]).toBe(id2)
    expect(sorted[2]).toBe(id3)
  })

  test('@ulid decorator marks fields for auto-generation', () => {
    class TestModel extends BaseModel {
      @ulidDecorator
      declare id: string

      declare email: string
    }

    // This would be tested in an integration test with a real database
    // For now, we just verify the decorator is exported and can be applied
    expect(TestModel).toBeDefined()
  })
})