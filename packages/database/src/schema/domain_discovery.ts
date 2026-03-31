import { readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * Discovers available domains by scanning the database/schemas directory.
 *
 * Domains are subdirectories under database/schemas/.
 * The 'public' domain always exists (system schemas).
 * Other domains represent business domains (tenant, factory, marketing, etc.).
 */

/** Validate that a domain name is safe for use in PostgreSQL table names */
export function validateDomainName(domainName: string): void {
  // Allow alphanumeric characters and underscores only
  if (!/^[a-z][a-z0-9_]*$/i.test(domainName)) {
    throw new Error(`Invalid domain name: ${domainName}. Must start with a letter and contain only letters, numbers, and underscores.`)
  }

  // Prevent SQL injection and reserved words
  const reservedWords = ['public', 'information_schema', 'pg_catalog', 'pg_toast']
  if (reservedWords.includes(domainName.toLowerCase()) && domainName.toLowerCase() !== 'public') {
    throw new Error(`Domain name '${domainName}' is reserved and cannot be used.`)
  }
}

/** Discover available domains from the filesystem */
export function discoverDomains(schemasPath: string = 'database/schemas'): string[] {
  const basePath = resolve(schemasPath)

  let entries: string[]
  try {
    entries = readdirSync(basePath, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
  } catch {
    // If schemas directory doesn't exist, return just public
    return ['public']
  }

  // Validate all discovered domain names
  for (const domainName of entries) {
    validateDomainName(domainName)
  }

  // Ensure public is always included and comes first
  const domains = new Set(entries)
  domains.add('public')

  // Sort with public first, then alphabetically
  return Array.from(domains).sort((a, b) => {
    if (a === 'public') return -1
    if (b === 'public') return 1
    return a.localeCompare(b)
  })
}

/** Check if a specific domain exists */
export function domainExists(domainName: string, schemasPath: string = 'database/schemas'): boolean {
  validateDomainName(domainName)

  if (domainName === 'public') {
    return true // public always exists conceptually
  }

  const domainPath = join(resolve(schemasPath), domainName)
  try {
    const stat = readdirSync(domainPath)
    return true
  } catch {
    return false
  }
}

/** Get the migration tracking table name for a domain */
export function getMigrationTableName(domain: string): string {
  validateDomainName(domain)

  if (domain === 'public') {
    return '_strav_migrations'
  }

  return `_strav_${domain}_migrations`
}