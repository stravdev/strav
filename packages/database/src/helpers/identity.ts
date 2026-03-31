import BaseModel from '../orm/base_model'

/** Extract a user ID from a BaseModel instance or a raw string/number. */
export function extractUserId(user: unknown): string {
  if (typeof user === 'string') return user
  if (typeof user === 'number') return String(user)
  if (user instanceof BaseModel) {
    const ctor = user.constructor as typeof BaseModel
    return String((user as unknown as Record<string, unknown>)[ctor.primaryKeyProperty])
  }
  throw new Error('Pass a BaseModel instance or a string/number user ID.')
}
