import type { PostgreSQLType } from './postgres'

export { toSnakeCase } from '@strav/kernel/helpers/strings'

/**
 * Map a serial/bigserial/smallserial pgType to the corresponding integer type
 * used for foreign key columns. All other types pass through unchanged.
 *
 * @example
 * serialToIntegerType('serial')    // 'integer'
 * serialToIntegerType('bigserial') // 'bigint'
 * serialToIntegerType('uuid')      // 'uuid'
 */
export function serialToIntegerType(pgType: PostgreSQLType): PostgreSQLType {
  if (pgType === 'serial') return 'integer'
  if (pgType === 'bigserial') return 'bigint'
  if (pgType === 'smallserial') return 'smallint'
  return pgType
}
