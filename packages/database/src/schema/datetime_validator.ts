import Database from '../database/database'
import { toSnakeCase } from '@strav/kernel/helpers/strings'

export interface DateTimeValidationError {
  table: string
  column: string
  expectedType: string
  actualType: string
  suggestion: string
}

export interface DateTimeValidationResult {
  isValid: boolean
  errors: DateTimeValidationError[]
  warnings: string[]
}

/**
 * Database schema validator for DateTime fields.
 * Helps prevent DateTime corruption by ensuring proper column types.
 */
export class DateTimeValidator {
  constructor(private db: Database) {}

  /**
   * Validate that DateTime fields in a model are mapped to appropriate database columns.
   */
  async validateModel(
    modelClass: any,
    dateTimeFields: string[]
  ): Promise<DateTimeValidationResult> {
    const tableName = toSnakeCase(modelClass.name)
    const errors: DateTimeValidationError[] = []
    const warnings: string[] = []

    try {
      // Get table schema information from PostgreSQL
      const columnInfo = await this.getTableColumnTypes(tableName)

      if (columnInfo.length === 0) {
        warnings.push(`Table '${tableName}' not found in database. Skipping validation.`)
        return { isValid: true, errors, warnings }
      }

      // Check each DateTime field
      for (const field of dateTimeFields) {
        const columnName = toSnakeCase(field)
        const column = columnInfo.find(col => col.column_name === columnName)

        if (!column) {
          warnings.push(`Column '${columnName}' not found in table '${tableName}'`)
          continue
        }

        const isValidType = this.isValidDateTimeColumnType(column.data_type)

        if (!isValidType) {
          errors.push({
            table: tableName,
            column: columnName,
            expectedType: 'timestamptz or timestamp',
            actualType: column.data_type,
            suggestion: this.getSuggestion(column.data_type, columnName, tableName)
          })
        }
      }

    } catch (error) {
      warnings.push(`Failed to validate table '${tableName}': ${error}`)
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Get column type information for a specific table.
   */
  private async getTableColumnTypes(tableName: string): Promise<any[]> {
    const query = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = $1
      AND table_schema = CURRENT_SCHEMA()
      ORDER BY ordinal_position
    `

    return await this.db.sql.unsafe(query, [tableName])
  }

  /**
   * Check if a database column type is valid for DateTime storage.
   */
  private isValidDateTimeColumnType(dataType: string): boolean {
    const validTypes = [
      'timestamp without time zone',
      'timestamp with time zone',
      'timestamptz',
      'timestamp'
    ]

    return validTypes.includes(dataType.toLowerCase())
  }

  /**
   * Generate a suggestion for fixing an invalid column type.
   */
  private getSuggestion(actualType: string, columnName: string, tableName: string): string {
    const suggestions: Record<string, string> = {
      'text': `Change column type: ALTER TABLE "${tableName}" ALTER COLUMN "${columnName}" TYPE TIMESTAMPTZ USING "${columnName}"::TIMESTAMPTZ;`,
      'varchar': `Change column type: ALTER TABLE "${tableName}" ALTER COLUMN "${columnName}" TYPE TIMESTAMPTZ USING "${columnName}"::TIMESTAMPTZ;`,
      'character varying': `Change column type: ALTER TABLE "${tableName}" ALTER COLUMN "${columnName}" TYPE TIMESTAMPTZ USING "${columnName}"::TIMESTAMPTZ;`,
      'boolean': `Column type mismatch. DateTime fields should not be stored as boolean. Consider using TIMESTAMPTZ instead.`,
      'integer': `Column type mismatch. DateTime fields should not be stored as integer. Consider using TIMESTAMPTZ instead.`,
      'bigint': `If this is a Unix timestamp, consider: ALTER TABLE "${tableName}" ALTER COLUMN "${columnName}" TYPE TIMESTAMPTZ USING TO_TIMESTAMP("${columnName}");`,
      'jsonb': `DateTime stored as JSON may cause corruption. Consider: ALTER TABLE "${tableName}" ALTER COLUMN "${columnName}" TYPE TIMESTAMPTZ;`,
      'json': `DateTime stored as JSON may cause corruption. Consider: ALTER TABLE "${tableName}" ALTER COLUMN "${columnName}" TYPE TIMESTAMPTZ;`
    }

    return suggestions[actualType.toLowerCase()] ||
           `Consider changing column type to TIMESTAMPTZ: ALTER TABLE "${tableName}" ALTER COLUMN "${columnName}" TYPE TIMESTAMPTZ;`
  }

  /**
   * Validate all DateTime fields across multiple models.
   */
  async validateModels(modelsConfig: Array<{ modelClass: any, dateTimeFields: string[] }>): Promise<DateTimeValidationResult> {
    const allErrors: DateTimeValidationError[] = []
    const allWarnings: string[] = []

    for (const { modelClass, dateTimeFields } of modelsConfig) {
      const result = await this.validateModel(modelClass, dateTimeFields)
      allErrors.push(...result.errors)
      allWarnings.push(...result.warnings)
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings
    }
  }

  /**
   * Check for common DateTime corruption patterns in existing data.
   */
  async detectCorruptedDateTimeData(tableName: string, dateTimeColumns: string[]): Promise<{
    corrupted: Array<{ table: string, column: string, count: number, samples: any[] }>
  }> {
    const corrupted: Array<{ table: string, column: string, count: number, samples: any[] }> = []

    for (const column of dateTimeColumns) {
      const columnName = toSnakeCase(column)

      try {
        // Check for the specific Y2K corruption pattern
        const y2kCorruptionQuery = `
          SELECT COUNT(*) as count
          FROM "${tableName}"
          WHERE "${columnName}" >= '2000-01-01 00:00:00'::timestamp
          AND "${columnName}" < '2000-01-02 00:00:00'::timestamp
        `

        const y2kResult = await this.db.sql.unsafe(y2kCorruptionQuery)
        const y2kCount = parseInt(y2kResult[0]?.count || '0')

        if (y2kCount > 0) {
          // Get some samples
          const samplesQuery = `
            SELECT "${columnName}", ctid
            FROM "${tableName}"
            WHERE "${columnName}" >= '2000-01-01 00:00:00'::timestamp
            AND "${columnName}" < '2000-01-02 00:00:00'::timestamp
            LIMIT 5
          `

          const samples = await this.db.sql.unsafe(samplesQuery)

          corrupted.push({
            table: tableName,
            column: columnName,
            count: y2kCount,
            samples
          })
        }

      } catch (error) {
        // Skip columns that can't be queried (might not exist or wrong type)
        continue
      }
    }

    return { corrupted }
  }
}