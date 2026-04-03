import { describe, it, expect } from 'bun:test'
import { faker } from '../src/index.ts'

describe('StringGenerator', () => {
  it('should generate valid UUIDs', () => {
    const uuid = faker.string.uuid()
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  })

  it('should generate nanoids with correct length', () => {
    const id = faker.string.nanoid(10)
    expect(id).toHaveLength(10)
    expect(id).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('should generate alpha strings', () => {
    const alpha = faker.string.alpha({ length: 8 })
    expect(alpha).toHaveLength(8)
    expect(alpha).toMatch(/^[A-Za-z]+$/)
  })

  it('should generate lowercase alpha strings', () => {
    const alpha = faker.string.alpha({ length: 8, casing: 'lower' })
    expect(alpha).toMatch(/^[a-z]+$/)
  })

  it('should generate uppercase alpha strings', () => {
    const alpha = faker.string.alpha({ length: 8, casing: 'upper' })
    expect(alpha).toMatch(/^[A-Z]+$/)
  })

  it('should generate alphanumeric strings', () => {
    const alphanum = faker.string.alphanumeric({ length: 10 })
    expect(alphanum).toHaveLength(10)
    expect(alphanum).toMatch(/^[A-Za-z0-9]+$/)
  })

  it('should generate numeric strings', () => {
    const numeric = faker.string.numeric(6)
    expect(numeric).toHaveLength(6)
    expect(numeric).toMatch(/^[0-9]+$/)
  })

  it('should generate hexadecimal strings', () => {
    const hex = faker.string.hexadecimal(8)
    expect(hex).toMatch(/^0x[0-9a-f]{8}$/)
  })

  it('should generate binary strings', () => {
    const binary = faker.string.binary(8)
    expect(binary).toMatch(/^0b[01]{8}$/)
  })

  it('should generate octal strings', () => {
    const octal = faker.string.octal(8)
    expect(octal).toMatch(/^0o[0-7]{8}$/)
  })

  it('should generate strings from patterns', () => {
    const pattern = faker.string.sample('###-??-@@@')
    expect(pattern).toMatch(/^\d{3}-[a-z]{2}-[a-z0-9]{3}$/)
  })
})