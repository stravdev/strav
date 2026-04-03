import { describe, it, expect } from 'bun:test'
import { faker } from '../src/index.ts'

describe('PersonModule', () => {
  it('should generate first names', () => {
    const firstName = faker.person.firstName()
    expect(typeof firstName).toBe('string')
    expect(firstName.length).toBeGreaterThan(0)
  })

  it('should generate last names', () => {
    const lastName = faker.person.lastName()
    expect(typeof lastName).toBe('string')
    expect(lastName.length).toBeGreaterThan(0)
  })

  it('should generate full names', () => {
    const fullName = faker.person.fullName()
    expect(typeof fullName).toBe('string')
    expect(fullName.includes(' ')).toBe(true)
  })

  it('should generate genders', () => {
    const gender = faker.person.gender()
    expect(['male', 'female']).toContain(gender)
  })

  it('should generate prefixes', () => {
    const prefix = faker.person.prefix()
    expect(typeof prefix).toBe('string')
    expect(prefix.length).toBeGreaterThan(0)
  })

  it('should generate suffixes', () => {
    const suffix = faker.person.suffix()
    expect(typeof suffix).toBe('string')
    expect(suffix.length).toBeGreaterThan(0)
  })

  it('should generate job titles', () => {
    const jobTitle = faker.person.jobTitle()
    expect(typeof jobTitle).toBe('string')
    expect(jobTitle.length).toBeGreaterThan(0)
  })

  it('should generate bios', () => {
    const bio = faker.person.bio()
    expect(typeof bio).toBe('string')
    expect(bio.length).toBeGreaterThan(10)
    expect(bio.includes('years of experience')).toBe(true)
  })

  it('should generate usernames', () => {
    const username = faker.person.username()
    expect(typeof username).toBe('string')
    expect(username.length).toBeGreaterThan(0)
    expect(username).toMatch(/^[a-z0-9._]+$/)
  })

  it('should generate usernames from provided names', () => {
    const username = faker.person.username('john', 'doe')
    expect(typeof username).toBe('string')
    expect(username.toLowerCase().includes('john') || username.toLowerCase().includes('doe')).toBe(true)
  })
})