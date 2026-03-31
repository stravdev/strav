import type { PostgreSQLType } from './postgres'
import type { FieldDefinition, FieldValidator } from './field_definition'

/** Initial options that the type builder can pass at construction time. */
interface FieldBuilderOptions {
  length?: number
  precision?: number
  scale?: number
  references?: string
  enumValues?: string[]
}

/**
 * Fluent builder for a single field definition.
 *
 * Created by the `t` type builder; collects modifiers, validators,
 * and type parameters, then exposes the result as a {@link FieldDefinition}.
 *
 * @example
 * t.varchar(255).email().unique().required()
 */
export default class FieldBuilder {
  private def: FieldDefinition

  constructor(pgType: PostgreSQLType, options?: FieldBuilderOptions) {
    this.def = {
      pgType,
      required: false,
      nullable: false,
      unique: false,
      primaryKey: false,
      index: false,
      sensitive: false,
      isArray: false,
      arrayDimensions: 1,
      length: options?.length,
      precision: options?.precision,
      scale: options?.scale,
      references: options?.references,
      enumValues: options?.enumValues,
      validators: [],
    }
  }

  // === Modifiers ===

  /** Mark the field as NOT NULL. */
  required(): this {
    this.def.required = true
    return this
  }

  /** Mark the field as explicitly nullable. */
  nullable(): this {
    this.def.nullable = true
    return this
  }

  /** Add a UNIQUE constraint. */
  unique(): this {
    this.def.unique = true
    return this
  }

  /** Set the column's DEFAULT value. */
  default(value: unknown): this {
    this.def.defaultValue = value
    return this
  }

  /** Mark the field as a primary key. */
  primaryKey(): this {
    this.def.primaryKey = true
    return this
  }

  /** Add a database index on this field. */
  index(): this {
    this.def.index = true
    return this
  }

  /** Mark the field as containing sensitive data. */
  sensitive(): this {
    this.def.sensitive = true
    return this
  }

  /** Convert this field to a PostgreSQL array type. */
  array(dimensions: number = 1): this {
    this.def.isArray = true
    this.def.arrayDimensions = dimensions
    return this
  }

  // === Validators ===

  /** Minimum value/length validator. */
  min(value: number): this {
    this.def.validators.push({ type: 'min', params: { value } })
    return this
  }

  /** Maximum value/length validator. */
  max(value: number): this {
    this.def.validators.push({ type: 'max', params: { value } })
    return this
  }

  /** Email format validator. */
  email(): this {
    this.def.validators.push({ type: 'email' })
    return this
  }

  /** URL format validator. */
  url(): this {
    this.def.validators.push({ type: 'url' })
    return this
  }

  /** Regex pattern validator. */
  regex(pattern: string | RegExp): this {
    const source = pattern instanceof RegExp ? pattern.source : pattern
    this.def.validators.push({ type: 'regex', params: { pattern: source } })
    return this
  }

  /** String length validator (exact or range). */
  length(min: number, max?: number): this {
    this.def.validators.push({ type: 'length', params: { min, max } })
    return this
  }

  /** Numeric precision. Also sets the type parameter for SQL generation. */
  precision(p: number): this {
    this.def.precision = p
    this.def.validators.push({ type: 'precision', params: { value: p } })
    return this
  }

  /** Numeric scale. Also sets the type parameter for SQL generation. */
  scale(s: number): this {
    this.def.scale = s
    this.def.validators.push({ type: 'scale', params: { value: s } })
    return this
  }

  // === Accessors ===

  /** Return the finalized field definition. */
  toDefinition(): FieldDefinition {
    const definition = { ...this.def, validators: [...this.def.validators] }
    // Preserve the isUlid flag if it was set
    if ((this as any)._isUlid) {
      definition.isUlid = true
    }
    return definition
  }
}
