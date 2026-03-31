import { resolve, relative } from 'node:path'
import type { GeneratedFile } from './model_generator.ts'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GeneratorPaths {
  models: string
  enums: string
  controllers: string
  services: string
  events: string
  validators: string
  policies: string
  resources: string
  routes: string
  tests: string
  docs: string
  // Database paths
  schemas: string
  migrations: string
}

export interface ModelNaming {
  [domain: string]: string | null | undefined
}

export interface GeneratorConfig {
  paths?: Partial<GeneratorPaths>
  modelNaming?: ModelNaming
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_PATHS: GeneratorPaths = {
  models: 'app/models',
  enums: 'app/enums',
  controllers: 'app/http/controllers',
  services: 'app/services',
  events: 'app/events',
  validators: 'app/validators',
  policies: 'app/policies',
  resources: 'app/resources',
  routes: 'start',
  tests: 'tests/api',
  docs: 'public/_docs',
  // Database paths
  schemas: 'database/schemas',
  migrations: 'database/migrations',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Merge user config with defaults, returning fully resolved paths. */
export function resolvePaths(config?: GeneratorConfig, scope?: string): GeneratorPaths {
  const basePaths = config?.paths ? { ...DEFAULT_PATHS, ...config.paths } : { ...DEFAULT_PATHS }

  // If a domain is provided, append it to models and enums paths
  if (scope) {
    return {
      ...basePaths,
      models: `${basePaths.models}/${scope}`,
      enums: `${basePaths.enums}/${scope}`
    }
  }

  return basePaths
}

/**
 * Compute a relative import path from a file inside `fromDir` to a file
 * inside `toDir`. Returns a path suitable for ES import statements
 * (e.g. `'../../services'`, `'../enums'`).
 */
export function relativeImport(fromDir: string, toDir: string): string {
  let rel = relative(fromDir, toDir)
  // Normalize Windows separators for import paths
  rel = rel.split('\\').join('/')
  return rel.startsWith('.') ? rel : './' + rel
}

/** Get the model name prefix for a given domain. Returns empty string if no prefix. */
export function getModelPrefix(config: GeneratorConfig | undefined, domain: string | undefined): string {
  if (!domain) return ''

  // Public domain has no prefix by default
  if (domain === 'public') {
    return config?.modelNaming?.[domain] ?? ''
  }

  // For other domains, use configured prefix or default to PascalCase
  if (config?.modelNaming?.[domain] !== undefined) {
    return config.modelNaming[domain] || ''
  }

  // Default prefix: PascalCase the domain name
  return domain.charAt(0).toUpperCase() + domain.slice(1).toLowerCase()
}

/**
 * Format generated files with Prettier and write them to disk.
 * Resolves the Prettier config from each file's location (so the project's
 * `.prettierrc` is picked up automatically). Falls back to writing
 * unformatted content if Prettier is not installed.
 */
export async function formatAndWrite(files: GeneratedFile[]): Promise<void> {
  let prettier: typeof import('prettier') | null = null
  try {
    prettier = await import('prettier')
  } catch {
    // Prettier not installed — write unformatted
  }

  for (const file of files) {
    let content = file.content
    if (prettier) {
      const filePath = resolve(file.path)
      const options = await prettier.resolveConfig(filePath)
      content = await prettier.format(content, { ...options, filepath: filePath })
    }
    await Bun.write(file.path, content)
  }
}
