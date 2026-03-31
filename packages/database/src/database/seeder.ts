import Database from './database'

/**
 * Base class for database seeders.
 *
 * Extend this class and implement {@link run} to populate the database
 * with dev/test data. Use {@link call} to compose sub-seeders from a
 * main `DatabaseSeeder`.
 *
 * @example
 * import { Seeder } from '@stravigor/database/database'
 *
 * export default class DatabaseSeeder extends Seeder {
 *   async run(): Promise<void> {
 *     await this.call(UserSeeder)
 *     await this.call(PostSeeder)
 *   }
 * }
 */
export abstract class Seeder {
  constructor(protected db: Database) {}

  /** Insert seed data. */
  abstract run(): Promise<void>

  /** Invoke another seeder. */
  async call(SeederClass: new (db: Database) => Seeder): Promise<void> {
    const seeder = new SeederClass(this.db)
    await seeder.run()
  }
}
