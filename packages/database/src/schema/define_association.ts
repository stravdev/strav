import { Archetype } from './types'
import type { SchemaDefinition } from './types'
import type FieldBuilder from './field_builder'
import defineSchema from './define_schema'

interface AssociationOptions {
  as?: Record<string, string>
  fields?: Record<string, FieldBuilder>
}

/**
 * Define an association (many-to-many junction) schema between two entities.
 *
 * Automatically sets archetype to `'association'`, generates the table name
 * as `{entityA}_{entityB}`, and records the two associates.
 *
 * Only specify additional pivot fields — the FK columns to both entities
 * are injected automatically by the {@link RepresentationBuilder}.
 *
 * @example
 * // With named properties on each entity model:
 * export default defineAssociation(['team', 'user'], {
 *   as: { team: 'members', user: 'teams' },
 *   fields: {
 *     role: t.enum(['admin', 'developer', 'tester']),
 *   },
 * })
 *
 * // Legacy shorthand (fields only, no model properties):
 * export default defineAssociation(['team', 'user'], {
 *   role: t.enum(['admin', 'developer', 'tester']),
 * })
 */
export default function defineAssociation(
  entities: [string, string],
  options: AssociationOptions | Record<string, FieldBuilder> = {}
): SchemaDefinition {
  const [entityA, entityB] = entities

  let fields: Record<string, FieldBuilder>
  let as: Record<string, string> | undefined

  if (isAssociationOptions(options)) {
    fields = options.fields ?? {}
    as = options.as
  } else {
    fields = options
  }

  return defineSchema(`${entityA}_${entityB}`, {
    archetype: Archetype.Association,
    associates: [entityA, entityB],
    as,
    fields,
  })
}

function isAssociationOptions(obj: unknown): obj is AssociationOptions {
  return typeof obj === 'object' && obj !== null && ('as' in obj || 'fields' in obj)
}
