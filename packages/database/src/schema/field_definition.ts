import type { PostgreSQLType } from './postgres'

/**
 * A single validation constraint.
 * Code generators read these to produce runtime validation rules.
 */
export interface FieldValidator {
  type: 'min' | 'max' | 'email' | 'url' | 'regex' | 'length' | 'precision' | 'scale'
  params?: Record<string, unknown>
}

/**
 * Serializable description of a single schema field.
 *
 * Produced by the {@link FieldBuilder} fluent chain, consumed by
 * code generators, migration engines, and validators.
 */
export interface FieldDefinition {
  /** The resolved PostgreSQL column type (e.g. 'varchar', 'integer', 'jsonb'). */
  pgType: PostgreSQLType

  /** Whether the field is NOT NULL. */
  required: boolean

  /** Whether the field explicitly allows NULL. */
  nullable: boolean

  /** Whether the field has a UNIQUE constraint. */
  unique: boolean

  /** Default value expression (literal or SQL expression string). */
  defaultValue?: unknown

  /** Whether the field is a primary key. */
  primaryKey: boolean

  /** Whether the field should have a database index. */
  index: boolean

  /** Whether the field contains sensitive data (excluded from logs/serialization). */
  sensitive: boolean

  /** Whether the field is an array. If true, pgType describes the element type. */
  isArray: boolean

  /** Array dimensions (1 = one-dimensional, 2 = two-dimensional, etc.). */
  arrayDimensions: number

  /** Maximum length for varchar/char, or bit length for bit types. */
  length?: number

  /** Precision for decimal/numeric types. */
  precision?: number

  /** Scale for decimal/numeric types. */
  scale?: number

  /** For reference fields: the name of the referenced table/schema. */
  references?: string

  /** For enum fields: the list of allowed string values. */
  enumValues?: string[]

  /** Validation constraints collected from the fluent chain. */
  validators: FieldValidator[]

  /** Whether this field is a ULID (stored as char(26)). */
  isUlid?: boolean
}
