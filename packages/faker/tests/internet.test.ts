import { describe, it, expect } from 'bun:test'
import { faker } from '../src/index.ts'

describe('InternetModule', () => {
  it('should generate valid email addresses', () => {
    const email = faker.internet.email()
    expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
  })

  it('should generate emails with custom names', () => {
    const email = faker.internet.email({ firstName: 'john', lastName: 'doe' })
    expect(email).toMatch(/john|doe/i)
  })

  it('should generate usernames', () => {
    const username = faker.internet.username()
    expect(typeof username).toBe('string')
    expect(username.length).toBeGreaterThan(0)
  })

  it('should generate passwords', () => {
    const password = faker.internet.password()
    expect(typeof password).toBe('string')
    expect(password.length).toBeGreaterThanOrEqual(12)
  })

  it('should generate memorable passwords', () => {
    const password = faker.internet.password({ memorable: true })
    expect(typeof password).toBe('string')
    expect(password.length).toBeGreaterThan(0)
  })

  it('should generate URLs', () => {
    const url = faker.internet.url()
    expect(url).toMatch(/^https?:\/\/[^\s/$.?#].[^\s]*$/)
  })

  it('should generate domain names', () => {
    const domain = faker.internet.domainName()
    expect(domain).toMatch(/^[a-z]+\.[a-z]+$/)
  })

  it('should generate IP addresses', () => {
    const ip = faker.internet.ipAddress()
    expect(ip).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)
    const parts = ip.split('.').map(Number)
    parts.forEach(part => {
      expect(part).toBeGreaterThanOrEqual(0)
      expect(part).toBeLessThanOrEqual(255)
    })
  })

  it('should generate IPv6 addresses', () => {
    const ipv6 = faker.internet.ipv6Address()
    expect(ipv6).toMatch(/^[0-9a-f:]+$/)
    expect(ipv6.split(':')).toHaveLength(8)
  })

  it('should generate MAC addresses', () => {
    const mac = faker.internet.mac()
    expect(mac).toMatch(/^[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}$/)
  })

  it('should generate user agents', () => {
    const userAgent = faker.internet.userAgent()
    expect(typeof userAgent).toBe('string')
    expect(userAgent.length).toBeGreaterThan(10)
    expect(userAgent).toMatch(/Mozilla/)
  })

  it('should generate port numbers', () => {
    const port = faker.internet.port()
    expect(port).toBeGreaterThanOrEqual(1)
    expect(port).toBeLessThanOrEqual(65535)
  })

  it('should generate protocols', () => {
    const protocol = faker.internet.protocol()
    expect(typeof protocol).toBe('string')
    expect(protocol.length).toBeGreaterThan(0)
  })

  it('should generate HTTP methods', () => {
    const method = faker.internet.httpMethod()
    expect(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']).toContain(method)
  })

  it('should generate HTTP status codes', () => {
    const status = faker.internet.httpStatusCode()
    expect(typeof status).toBe('number')
    expect([200, 201, 204, 301, 302, 304, 400, 401, 403, 404, 405, 409, 422, 500, 502, 503, 504]).toContain(status)
  })

  it('should generate emojis', () => {
    const emoji = faker.internet.emoji()
    expect(typeof emoji).toBe('string')
    expect(emoji.length).toBeGreaterThan(0)
  })
})