/**
 * Convert a camelCase or PascalCase string to snake_case.
 *
 * @example
 * toSnakeCase('firstName')  // 'first_name'
 * toSnakeCase('HTMLParser')  // 'html_parser'
 * toSnakeCase('already_snake') // 'already_snake'
 */
export function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/([a-z\d])([A-Z])/g, '$1_$2')
    .toLowerCase()
}

/**
 * Convert a snake_case string to camelCase.
 *
 * @example
 * toCamelCase('first_name')      // 'firstName'
 * toCamelCase('created_at')      // 'createdAt'
 * toCamelCase('reviewed_by_id')  // 'reviewedById'
 * toCamelCase('id')              // 'id'
 */
export function toCamelCase(str: string): string {
  return str.replace(/_([a-z\d])/g, (_, c) => c.toUpperCase())
}

/**
 * Convert a snake_case or plain string to PascalCase.
 *
 * @example
 * toPascalCase('user_role')   // 'UserRole'
 * toPascalCase('user')        // 'User'
 * toPascalCase('order_item')  // 'OrderItem'
 */
export function toPascalCase(str: string): string {
  const camel = toCamelCase(str)
  return camel.charAt(0).toUpperCase() + camel.slice(1)
}

/**
 * Naively pluralize an English word.
 *
 * Handles common suffixes (s/x/z/ch/sh → es, consonant+y → ies).
 * Not a full inflection library — adequate for code-gen route paths.
 *
 * @example
 * pluralize('user')      // 'users'
 * pluralize('category')  // 'categories'
 * pluralize('status')    // 'statuses'
 */
export function pluralize(word: string): string {
  if (
    word.endsWith('s') ||
    word.endsWith('x') ||
    word.endsWith('z') ||
    word.endsWith('ch') ||
    word.endsWith('sh')
  ) {
    return word + 'es'
  }
  if (word.endsWith('y') && !/[aeiou]y$/.test(word)) {
    return word.slice(0, -1) + 'ies'
  }
  return word + 's'
}
