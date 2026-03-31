import type { Command } from 'commander'
import chalk from 'chalk'
import { bootstrap, shutdown } from '../cli/bootstrap.ts'
import MigrationTracker from '@strav/database/database/migration/tracker'
import MigrationRunner from '@strav/database/database/migration/runner'
import { discoverDomains } from '@strav/database'
import { getDatabasePaths } from '../config/loader.ts'

export function register(program: Command): void {
  program
    .command('rollback')
    .alias('migration:rollback')
    .description('Rollback migrations by batch')
    .option('--batch <number>', 'Specific batch number to rollback')
    .option('-s, --scope <scope>', 'Domain (e.g., public, tenant, factory, marketing)', 'public')
    .action(async (opts: { batch?: string; scope: string }) => {
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

        const batchNum = opts.batch ? parseInt(opts.batch, 10) : undefined

        console.log(
          batchNum
            ? chalk.cyan(`Rolling back batch ${batchNum}...`)
            : chalk.cyan('Rolling back last batch...')
        )

        const result = await runner.rollback(batchNum)

        if (result.rolledBack.length === 0) {
          console.log(chalk.yellow('Nothing to rollback.'))
          return
        }

        console.log(
          chalk.green(
            `\nRolled back ${result.rolledBack.length} migration(s) from batch ${result.batch}:`
          )
        )
        for (const version of result.rolledBack) {
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
