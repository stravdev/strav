import type { Command } from 'commander'
import chalk from 'chalk'
import { bootstrap, shutdown } from '@stravigor/cli'
import FlagManager from '../flag_manager.ts'

export function register(program: Command): void {
  program
    .command('flag:setup')
    .description('Create the feature flag storage table')
    .action(async () => {
      let db
      try {
        const { db: database, config } = await bootstrap()
        db = database

        new FlagManager(db, config)

        console.log(chalk.dim('Creating features table...'))
        await FlagManager.ensureTables()
        console.log(chalk.green('Features table created successfully.'))
      } catch (err) {
        console.error(chalk.red(`Error: ${err instanceof Error ? err.message : err}`))
        process.exit(1)
      } finally {
        if (db) await shutdown(db)
      }
    })

  program
    .command('flag:purge [feature]')
    .description('Purge stored feature flag values')
    .option('--all', 'Purge all features')
    .action(async (feature?: string, options?: { all?: boolean }) => {
      let db
      try {
        const { db: database, config } = await bootstrap()
        db = database

        new FlagManager(db, config)

        if (options?.all || !feature) {
          console.log(chalk.dim('Purging all feature flags...'))
          await FlagManager.purgeAll()
          console.log(chalk.green('All feature flags purged.'))
        } else {
          console.log(chalk.dim(`Purging feature "${feature}"...`))
          await FlagManager.purge(feature)
          console.log(chalk.green(`Feature "${feature}" purged.`))
        }
      } catch (err) {
        console.error(chalk.red(`Error: ${err instanceof Error ? err.message : err}`))
        process.exit(1)
      } finally {
        if (db) await shutdown(db)
      }
    })

  program
    .command('flag:list')
    .description('List all stored feature flags')
    .action(async () => {
      let db
      try {
        const { db: database, config } = await bootstrap()
        db = database

        new FlagManager(db, config)

        const names = await FlagManager.stored()

        if (names.length === 0) {
          console.log(chalk.dim('No stored feature flags.'))
          return
        }

        console.log(chalk.bold(`Stored feature flags (${names.length}):\n`))
        for (const name of names) {
          const records = await FlagManager.store().allFor(name)
          console.log(
            `  ${chalk.cyan(name)} ${chalk.dim(`(${records.length} scope${records.length === 1 ? '' : 's'})`)}`
          )
          for (const r of records) {
            const val =
              typeof r.value === 'boolean'
                ? r.value
                  ? chalk.green('active')
                  : chalk.red('inactive')
                : chalk.yellow(JSON.stringify(r.value))
            console.log(`    ${chalk.dim(r.scope)} → ${val}`)
          }
        }
      } catch (err) {
        console.error(chalk.red(`Error: ${err instanceof Error ? err.message : err}`))
        process.exit(1)
      } finally {
        if (db) await shutdown(db)
      }
    })
}
