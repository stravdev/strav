import type { Command } from 'commander'
import chalk from 'chalk'
import { bootstrap, shutdown } from '../cli/bootstrap.ts'
import MigrationTracker from '@stravigor/database/database/migration/tracker'
import MigrationRunner from '@stravigor/database/database/migration/runner'
import { discoverDomains } from '@stravigor/database'
import { getDatabasePaths } from '../config/loader.ts'

export function register(program: Command): void {
  program
    .command('migrate')
    .alias('migration:run')
    .description('Run pending migrations')
    .option('-s, --scope <scope>', 'Domain (e.g., public, tenant, factory, marketing)', 'public')
    .action(async (opts: { scope: string }) => {
      let db
      try {
        // Get configured database paths
        const dbPaths = await getDatabasePaths()

        // Validate scope against available domains
        const availableDomains = discoverDomains(dbPaths.schemas)
        if (!availableDomains.includes(opts.scope)) {
          throw new Error(`Invalid domain: ${opts.scope}. Available domains: ${availableDomains.join(', ')}`)
        }
        const scope = opts.scope

        const { db: database } = await bootstrap()
        db = database

        const scopedPath = `${dbPaths.migrations}/${scope}`
        const tracker = new MigrationTracker(db, scope)
        const runner = new MigrationRunner(db, tracker, scopedPath, scope)

        console.log(chalk.cyan('Running pending migrations...'))

        const result = await runner.run()

        if (result.applied.length === 0) {
          console.log(chalk.green('Nothing to migrate. All migrations are up to date.'))
          return
        }

        console.log(
          chalk.green(`\nApplied ${result.applied.length} migration(s) in batch ${result.batch}:`)
        )
        for (const version of result.applied) {
          console.log(chalk.dim(`  - ${version}`))
        }
      } catch (err) {
        console.error(chalk.red(`Error: ${err instanceof Error ? err.message : err}`))
        process.exit(1)
      } finally {
        if (db) await shutdown(db)
      }
    })
}
