import { join } from 'node:path'
import { readdirSync } from 'node:fs'
import type Database from '../database'
import type MigrationTracker from './tracker'
import type { MigrationManifest } from './types'
import { DatabaseError } from '@stravigor/kernel/exceptions/errors'
import { getMigrationTableName } from '../../schema/domain_discovery'

export interface RunResult {
  applied: string[]
  batch: number
}

export interface RollbackResult {
  rolledBack: string[]
  batch: number
}

/**
 * Executes migration SQL files against the database.
 *
 * Each migration version is run inside a transaction so a failure
 * rolls back the entire version (not just the failing file).
 */
export default class MigrationRunner {
  private domain: string

  constructor(
    private db: Database,
    private tracker: MigrationTracker,
    private migrationsPath: string,
    domain: string = 'public'
  ) {
    this.domain = domain
  }

  /** Apply all pending migrations. */
  async run(): Promise<RunResult> {
    await this.tracker.ensureTable()

    const allVersions = this.listVersions()
    const pending = await this.tracker.getPendingVersions(allVersions)

    if (pending.length === 0) return { applied: [], batch: 0 }

    const batch = (await this.tracker.getLastBatch()) + 1

    for (const version of pending) {
      await this.applyMigration(version, batch)
    }

    return { applied: pending, batch }
  }

  /** Rollback the latest batch, or a specific batch if provided. */
  async rollback(batch?: number): Promise<RollbackResult> {
    await this.tracker.ensureTable()

    const targetBatch = batch ?? (await this.tracker.getLastBatch())
    if (targetBatch === 0) return { rolledBack: [], batch: 0 }

    const records = await this.tracker.getMigrationsByBatch(targetBatch)
    if (records.length === 0) return { rolledBack: [], batch: targetBatch }

    // Records are already ordered DESC by version from the tracker
    const rolledBack: string[] = []
    for (const record of records) {
      await this.rollbackMigration(record.version)
      rolledBack.push(record.version)
    }

    return { rolledBack, batch: targetBatch }
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private async applyMigration(version: string, batch: number): Promise<void> {
    const manifest = await this.readManifest(version)
    const files = manifest.executionOrder.up

    try {
      await this.db.sql.begin(async tx => {
        for (const file of files) {
          const sqlContent = await Bun.file(join(this.migrationsPath, version, file)).text()
          if (sqlContent.trim()) {
            await tx.unsafe(sqlContent)
          }
        }
        // Use the appropriate tracking table based on domain
        const tableName = getMigrationTableName(this.domain)
        await tx.unsafe(`INSERT INTO ${tableName} (version, batch) VALUES ($1, $2)`, [
          version,
          batch,
        ])
      })
    } catch (err) {
      throw new DatabaseError(
        `Migration ${version} failed: ${err instanceof Error ? err.message : err}`
      )
    }
  }

  private async rollbackMigration(version: string): Promise<void> {
    const manifest = await this.readManifest(version)
    const files = manifest.executionOrder.down

    try {
      await this.db.sql.begin(async tx => {
        for (const file of files) {
          const sqlContent = await Bun.file(join(this.migrationsPath, version, file)).text()
          if (sqlContent.trim()) {
            await tx.unsafe(sqlContent)
          }
        }
        // Use the appropriate tracking table based on domain
        const tableName = getMigrationTableName(this.domain)
        await tx.unsafe(`DELETE FROM ${tableName} WHERE version = $1`, [version])
      })
    } catch (err) {
      throw new DatabaseError(
        `Rollback of migration ${version} failed: ${err instanceof Error ? err.message : err}`
      )
    }
  }

  private async readManifest(version: string): Promise<MigrationManifest> {
    const manifestPath = join(this.migrationsPath, version, 'manifest.json')
    return await Bun.file(manifestPath).json()
  }

  /** List all migration version directories sorted numerically. */
  private listVersions(): string[] {
    try {
      const entries = readdirSync(this.migrationsPath, { withFileTypes: true })
      return entries
        .filter(e => e.isDirectory() && /^\d+$/.test(e.name))
        .map(e => e.name)
        .sort()
    } catch {
      return []
    }
  }
}
