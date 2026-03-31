import type { Command } from 'commander'
import chalk from 'chalk'
import { bootstrap, shutdown } from '@stravigor/cli'
import DevtoolsManager from '../devtools_manager.ts'

export function register(program: Command): void {
  program
    .command('devtools:prune')
    .description('Prune old devtools entries and aggregates')
    .option('--hours <hours>', 'Delete entries older than this many hours', '24')
    .action(async (options: { hours: string }) => {
      let db
      try {
        const { db: database, config } = await bootstrap()
        db = database

        new DevtoolsManager(db, config)

        const hours = parseInt(options.hours, 10)
        console.log(chalk.dim(`Pruning entries older than ${hours} hours...`))

        const entries = await DevtoolsManager.entryStore.prune(hours)
        const aggregates = await DevtoolsManager.aggregateStore.prune(hours)

        console.log(chalk.green(`Pruned ${entries} entries and ${aggregates} aggregates.`))
      } catch (err) {
        console.error(chalk.red(`Error: ${err instanceof Error ? err.message : err}`))
        process.exit(1)
      } finally {
        if (db) await shutdown(db)
      }
    })

  program
    .command('devtools:setup')
    .description('Create the devtools storage tables')
    .action(async () => {
      let db
      try {
        const { db: database, config } = await bootstrap()
        db = database

        new DevtoolsManager(db, config)

        console.log(chalk.dim('Creating devtools tables...'))
        await DevtoolsManager.ensureTables()
        console.log(chalk.green('Devtools tables created successfully.'))
      } catch (err) {
        console.error(chalk.red(`Error: ${err instanceof Error ? err.message : err}`))
        process.exit(1)
      } finally {
        if (db) await shutdown(db)
      }
    })
}
