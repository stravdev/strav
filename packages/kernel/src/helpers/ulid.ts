import { ulid as generateUlid } from 'ulid'

/**
 * Generate a ULID (Universally Unique Lexicographically Sortable Identifier).
 *
 * ULIDs are 26-character strings that are:
 * - Lexicographically sortable
 * - Contain a timestamp component
 * - Cryptographically secure random component
 *
 * @returns A new ULID string
 */
export function ulid(): string {
  return generateUlid()
}

/**
 * Check if a string is a valid ULID.
 *
 * @param value The string to check
 * @returns true if the string is a valid ULID format
 */
export function isUlid(value: string): boolean {
  // ULID is exactly 26 characters long and uses Crockford's base32
  // Crockford's base32 excludes I, L, O, U to avoid confusion
  const ulidRegex = /^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26}$/
  return ulidRegex.test(value)
}