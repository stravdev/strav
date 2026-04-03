import { describe, it, expect } from 'bun:test'
import { faker } from '../src/index.ts'

describe('Modules', () => {
  describe('LoremModule', () => {
    it('should generate words', () => {
      const word = faker.lorem.word()
      expect(typeof word).toBe('string')
      expect(word.length).toBeGreaterThan(0)
    })

    it('should generate multiple words', () => {
      const words = faker.lorem.words(5)
      expect(words.split(' ')).toHaveLength(5)
    })

    it('should generate sentences', () => {
      const sentence = faker.lorem.sentence()
      expect(sentence.endsWith('.')).toBe(true)
      expect(sentence[0]).toMatch(/[A-Z]/)
    })

    it('should generate paragraphs', () => {
      const paragraph = faker.lorem.paragraph()
      expect(typeof paragraph).toBe('string')
      expect(paragraph.length).toBeGreaterThan(10)
    })

    it('should generate slugs', () => {
      const slug = faker.lorem.slug()
      expect(slug).toMatch(/^[a-z-]+$/)
    })
  })

  describe('CompanyModule', () => {
    it('should generate company names', () => {
      const name = faker.company.companyName()
      expect(typeof name).toBe('string')
      expect(name.length).toBeGreaterThan(0)
    })

    it('should generate company suffixes', () => {
      const suffix = faker.company.companySuffix()
      expect(typeof suffix).toBe('string')
      expect(suffix.length).toBeGreaterThan(0)
    })

    it('should generate catch phrases', () => {
      const phrase = faker.company.catchPhrase()
      expect(typeof phrase).toBe('string')
      expect(phrase.split(' ').length).toBeGreaterThanOrEqual(3)
    })

    it('should generate business speak', () => {
      const bs = faker.company.bs()
      expect(typeof bs).toBe('string')
      expect(bs.split(' ').length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('CommerceModule', () => {
    it('should generate product names', () => {
      const product = faker.commerce.productName()
      expect(typeof product).toBe('string')
      expect(product.split(' ').length).toBeGreaterThanOrEqual(3)
    })

    it('should generate prices', () => {
      const price = faker.commerce.price()
      expect(price).toMatch(/^\$\d+\.\d{2}$/)
    })

    it('should generate float prices', () => {
      const price = faker.commerce.priceFloat()
      expect(typeof price).toBe('number')
      expect(price).toBeGreaterThan(0)
    })

    it('should generate departments', () => {
      const dept = faker.commerce.department()
      expect(typeof dept).toBe('string')
      expect(dept.length).toBeGreaterThan(0)
    })

    it('should generate ISBN numbers', () => {
      const isbn = faker.commerce.isbn()
      expect(isbn).toMatch(/^978-\d-\d{2}-\d{6}-\d$/)
    })

    it('should generate EAN13 barcodes', () => {
      const ean = faker.commerce.ean13()
      expect(ean).toMatch(/^\d{13}$/)
    })
  })

  describe('LocationModule', () => {
    it('should generate cities', () => {
      const city = faker.location.city()
      expect(typeof city).toBe('string')
      expect(city.length).toBeGreaterThan(0)
    })

    it('should generate states', () => {
      const state = faker.location.state()
      expect(typeof state).toBe('string')
      expect(state.length).toBeGreaterThan(0)
    })

    it('should generate state abbreviations', () => {
      const abbr = faker.location.state({ abbr: true })
      expect(abbr).toHaveLength(2)
      expect(abbr).toMatch(/^[A-Z]{2}$/)
    })

    it('should generate countries', () => {
      const country = faker.location.country()
      expect(typeof country).toBe('string')
      expect(country.length).toBeGreaterThan(0)
    })

    it('should generate coordinates', () => {
      const coords = faker.location.coordinates()
      expect(coords).toHaveProperty('lat')
      expect(coords).toHaveProperty('lng')
      expect(coords.lat).toBeGreaterThanOrEqual(-90)
      expect(coords.lat).toBeLessThanOrEqual(90)
      expect(coords.lng).toBeGreaterThanOrEqual(-180)
      expect(coords.lng).toBeLessThanOrEqual(180)
    })

    it('should generate addresses', () => {
      const address = faker.location.streetAddress()
      expect(typeof address).toBe('string')
      expect(address).toMatch(/^\d+\s+.+/)
    })

    it('should generate zip codes', () => {
      const zip = faker.location.zipCode()
      expect(zip).toMatch(/^\d{5}(-\d{4})?$/)
    })
  })

  describe('DateGenerator', () => {
    it('should generate recent dates', () => {
      const recent = faker.date.recent()
      const now = new Date()
      expect(recent).toBeInstanceOf(Date)
      expect(recent.getTime()).toBeLessThanOrEqual(now.getTime())
    })

    it('should generate future dates', () => {
      const future = faker.date.soon()
      const now = new Date()
      expect(future).toBeInstanceOf(Date)
      expect(future.getTime()).toBeGreaterThanOrEqual(now.getTime())
    })

    it('should generate birthdates', () => {
      const birthdate = faker.date.birthdate()
      const now = new Date()
      expect(birthdate).toBeInstanceOf(Date)
      expect(birthdate.getTime()).toBeLessThan(now.getTime())
    })

    it('should generate months', () => {
      const month = faker.date.month()
      expect(typeof month).toBe('string')
      expect(month.length).toBeGreaterThan(2)
    })

    it('should generate abbreviated months', () => {
      const month = faker.date.month({ abbr: true })
      expect(month).toHaveLength(3)
    })
  })

  describe('ArrayGenerator', () => {
    it('should pick array elements', () => {
      const arr = ['a', 'b', 'c']
      const element = faker.array.element(arr)
      expect(arr).toContain(element)
    })

    it('should pick multiple array elements', () => {
      const arr = ['a', 'b', 'c', 'd', 'e']
      const elements = faker.array.elements(arr, 3)
      expect(elements).toHaveLength(3)
      elements.forEach(el => expect(arr).toContain(el))
    })

    it('should shuffle arrays', () => {
      const arr = [1, 2, 3, 4, 5]
      const shuffled = faker.array.shuffle(arr)
      expect(shuffled).toHaveLength(5)
      expect(shuffled).toEqual(expect.arrayContaining(arr))
      expect(arr).toEqual([1, 2, 3, 4, 5]) // original unchanged
    })
  })
})