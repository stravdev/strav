import { join } from 'node:path'
import type { Command } from 'commander'
import chalk from 'chalk'
import SchemaRegistry from '@strav/database/schema/registry'
import ModelGenerator from '../generators/model_generator.ts'
import type { GeneratorConfig } from '../generators/config.ts'
import { discoverDomains } from '@strav/database'
import { loadGeneratorConfig, getDatabasePaths } from '../config/loader.ts'

export function register(program: Command): void {
  program
    .command('generate:models')
    .alias('g:models')
    .description('Generate model classes and enums from schema definitions')
    .option('--scope <scope>', 'Generate models for specific domain or "all" for all domains', 'all')
    .action(async (options) => {
      try {
        const scope = options.scope as string

        // Get configured database paths
        const dbPaths = await getDatabasePaths()

        // Validate scope against available domains or 'all'
        const availableDomains = discoverDomains(dbPaths.schemas)
        if (scope !== 'all' && !availableDomains.includes(scope)) {
          console.error(chalk.red(`Invalid domain: ${scope}. Available domains: ${availableDomains.join(', ')}, all`))
          process.exit(1)
        }

        console.log(chalk.cyan(`Generating models from ${scope === 'all' ? 'all' : scope} schemas...`))

        // Load generator config (if available)
        const config = await loadGeneratorConfig()

        const allFiles: any[] = []
        const scopesToProcess = scope === 'all' ? availableDomains : [scope]

        // When generating models for specific domains, we need all schemas loaded
        // to handle cross-domain references properly
        const fullRegistry = new SchemaRegistry()

        // Always load public schemas first (base schemas)
        await fullRegistry.discover(dbPaths.schemas, 'public')

        // Load schemas from all other domains if needed for validation or if generating models for those domains
        for (const domain of availableDomains) {
          if (domain !== 'public' && (scope === 'all' || scope === domain)) {
            await fullRegistry.discover(dbPaths.schemas, domain)
          }
        }

        // Validate all loaded schemas
        fullRegistry.validate()

        // Build representation from all loaded schemas
        const fullRepresentation = fullRegistry.buildRepresentation()

        // Build a map of schema name -> domain for cross-domain reference resolution
        const allSchemasMap = new Map<string, string>()

        // Load public schemas to identify which ones are public
        const publicRegistry = new SchemaRegistry()
        await publicRegistry.discover(dbPaths.schemas, 'public')
        const publicSchemaNames = new Set(publicRegistry.all().map(s => s.name))

        // Map schemas to their respective domains by checking which domain directory they came from
        for (const schema of fullRegistry.all()) {
          if (publicSchemaNames.has(schema.name)) {
            allSchemasMap.set(schema.name, 'public')
          } else {
            // For non-public schemas, find which domain they belong to
            // by checking which domains were loaded
            for (const domain of availableDomains) {
              if (domain !== 'public') {
                const domainRegistry = new SchemaRegistry()
                await domainRegistry.discover(dbPaths.schemas, domain)
                const domainSchemaNames = new Set(domainRegistry.all().map(s => s.name))
                if (domainSchemaNames.has(schema.name)) {
                  allSchemasMap.set(schema.name, domain)
                  break
                }
              }
            }
          }
        }

        for (const currentScope of scopesToProcess) {
          // Get just the schemas for the current scope
          const scopeRegistry = new SchemaRegistry()
          await scopeRegistry.discover(dbPaths.schemas, currentScope)

          if (scopeRegistry.all().length === 0) {
            console.log(chalk.yellow(`No schemas found for domain: ${currentScope}`))
            continue
          }

          const scopeSchemas = scopeRegistry.all()
          const generator = new ModelGenerator(scopeSchemas, fullRepresentation, config, currentScope, allSchemasMap)
          const files = await generator.writeAll()
          allFiles.push(...files)
        }

        if (allFiles.length === 0) {
          console.log(chalk.yellow('No models to generate.'))
          return
        }

        console.log(chalk.green(`\nGenerated ${allFiles.length} file(s):`))
        for (const file of allFiles) {
          console.log(chalk.dim(`  ${file.path}`))
        }
      } catch (err) {
        console.error(chalk.red(`Error: ${err instanceof Error ? err.message : err}`))
        process.exit(1)
      }
    })
}
