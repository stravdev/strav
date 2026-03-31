import { join } from 'node:path'
import type {
  SchemaDiff,
  GeneratedSql,
  MigrationManifest,
  MigrationSummary,
  TableDiff,
} from './types'

/**
 * Creates the migration directory structure and writes SQL files + manifest.
 *
 * @example
 * const fileGen = new MigrationFileGenerator('database/migrations')
 * await fileGen.generate(version, 'initial', generatedSql, diff)
 */
export default class MigrationFileGenerator {
  constructor(private basePath: string) {}

  async generate(
    version: string,
    message: string,
    sql: GeneratedSql,
    diff: SchemaDiff,
    tableOrder?: string[]
  ): Promise<string> {
    const migrationDir = join(this.basePath, version)

    // Build file list and execution order
    const upOrder: string[] = []
    const downOrder: string[] = []

    // 1. Enums
    if (sql.enumsUp.trim()) {
      await Bun.write(join(migrationDir, 'enums', 'up.sql'), sql.enumsUp + '\n')
      await Bun.write(join(migrationDir, 'enums', 'down.sql'), sql.enumsDown + '\n')
      upOrder.push('enums/up.sql')
      downOrder.unshift('enums/down.sql')
    }

    // 2. Tables — in dependency order for up, reverse for down
    const tableNames = this.resolveTableOrder(diff.tables, tableOrder)
    for (const name of tableNames) {
      const tableSql = sql.tables.get(name)
      if (!tableSql) continue
      await Bun.write(join(migrationDir, 'tables', name, 'up.sql'), tableSql.up + '\n')
      await Bun.write(join(migrationDir, 'tables', name, 'down.sql'), tableSql.down + '\n')
      upOrder.push(`tables/${name}/up.sql`)
      downOrder.unshift(`tables/${name}/down.sql`)
    }

    // 3. Constraints
    if (sql.constraintsUp.trim()) {
      await Bun.write(join(migrationDir, 'constraints', 'up.sql'), sql.constraintsUp + '\n')
      await Bun.write(join(migrationDir, 'constraints', 'down.sql'), sql.constraintsDown + '\n')
      upOrder.push('constraints/up.sql')
      downOrder.unshift('constraints/down.sql')
    }

    // 4. Indexes
    if (sql.indexesUp.trim()) {
      await Bun.write(join(migrationDir, 'indexes', 'up.sql'), sql.indexesUp + '\n')
      await Bun.write(join(migrationDir, 'indexes', 'down.sql'), sql.indexesDown + '\n')
      upOrder.push('indexes/up.sql')
      downOrder.unshift('indexes/down.sql')
    }

    // Build manifest
    const manifest: MigrationManifest = {
      version,
      message,
      generatedAt: new Date().toISOString(),
      summary: this.buildSummary(diff),
      executionOrder: { up: upOrder, down: downOrder },
    }

    await Bun.write(join(migrationDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')

    return migrationDir
  }

  private resolveTableOrder(tableDiffs: TableDiff[], tableOrder?: string[]): string[] {
    const tableNames = tableDiffs.map(t => (t.kind === 'modify' ? t.tableName : t.table.name))

    if (!tableOrder) return tableNames

    // Sort based on provided dependency order, keeping unknown tables at the end
    const orderIndex = new Map(tableOrder.map((name, i) => [name, i]))
    return [...tableNames].sort((a, b) => {
      const ai = orderIndex.get(a) ?? Infinity
      const bi = orderIndex.get(b) ?? Infinity
      return ai - bi
    })
  }

  private buildSummary(diff: SchemaDiff): MigrationSummary {
    let tablesToCreate = 0
    let tablesToDrop = 0
    let tablesToModify = 0
    let enumsToCreate = 0
    let enumsToModify = 0
    let enumsToDrop = 0

    for (const t of diff.tables) {
      if (t.kind === 'create') tablesToCreate++
      else if (t.kind === 'drop') tablesToDrop++
      else if (t.kind === 'modify') tablesToModify++
    }

    for (const e of diff.enums) {
      if (e.kind === 'create') enumsToCreate++
      else if (e.kind === 'modify') enumsToModify++
      else if (e.kind === 'drop') enumsToDrop++
    }

    return {
      tablesToCreate,
      tablesToDrop,
      tablesToModify,
      enumsToCreate,
      enumsToModify,
      enumsToDrop,
    }
  }
}
