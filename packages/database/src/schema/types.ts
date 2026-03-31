/**
 * Schema DSL Types - Complete PostgreSQL type support
 */
import type { FieldDefinition } from './field_definition'
import type FieldBuilder from './field_builder'

export enum Archetype {
  Entity = 'entity',
  Component = 'component',
  Attribute = 'attribute',
  Association = 'association',
  Event = 'event',
  Reference = 'reference',
  Configuration = 'configuration',
  Contribution = 'contribution',
}

/** The input shape that users pass to {@link defineSchema}. */
export interface SchemaInput {
  archetype?: Archetype
  parents?: string[]
  associates?: string[]
  as?: Record<string, string>
  fields: Record<string, FieldBuilder>
}

/** The resolved schema stored in the registry. */
export interface SchemaDefinition {
  name: string
  archetype: Archetype
  parents?: string[]
  associates?: string[]
  as?: Record<string, string>
  fields: Record<string, FieldDefinition>
}
