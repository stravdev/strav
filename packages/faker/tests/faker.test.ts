import { describe, it, expect } from 'bun:test'
import { faker, Faker } from '../src/index.ts'

describe('Faker', () => {
  describe('seeding', () => {
    it('should produce reproducible results with the same seed', () => {
      const faker1 = new Faker({ seed: 123 })
      const faker2 = new Faker({ seed: 123 })

      expect(faker1.string.uuid()).toBe(faker2.string.uuid())
      expect(faker1.number.int(1, 100)).toBe(faker2.number.int(1, 100))
      expect(faker1.person.fullName()).toBe(faker2.person.fullName())
    })

    it('should produce different results with different seeds', () => {
      const faker1 = new Faker({ seed: 123 })
      const faker2 = new Faker({ seed: 456 })

      expect(faker1.string.uuid()).not.toBe(faker2.string.uuid())
    })

    it('should reseed correctly', () => {
      const f = new Faker()
      f.seed(999)
      const value1 = f.number.int(1, 1000)
      f.seed(999)
      const value2 = f.number.int(1, 1000)
      expect(value1).toBe(value2)
    })
  })

  describe('helper methods', () => {
    it('should generate multiple values with many()', () => {
      const names = faker.many(() => faker.person.firstName(), 5)
      expect(names).toHaveLength(5)
      expect(names.every(n => typeof n === 'string')).toBe(true)
    })

    it('should select one value with oneOf()', () => {
      const value = faker.oneOf('a', 'b', 'c')
      expect(['a', 'b', 'c']).toContain(value)
    })

    it('should conditionally generate with maybe()', () => {
      faker.seed(123)
      const values: (string | undefined)[] = []
      for (let i = 0; i < 100; i++) {
        values.push(faker.maybe(() => 'value', { probability: 0.5 }))
      }
      expect(values.some(v => v === 'value')).toBe(true)
      expect(values.some(v => v === undefined)).toBe(true)
    })
  })
})