import Database from '../database'
import { DateTime } from 'luxon'
import { toSnakeCase } from '@strav/kernel/helpers/strings'

export interface DateTimeRepairOptions {
  tableName: string
  columnName: string
  /**
   * Strategy for handling corrupted dates:
   * - 'delete': Delete rows with corrupted dates
   * - 'null': Set corrupted dates to NULL
   * - 'backup': Create a backup column before repair
   * - 'current_timestamp': Replace with current timestamp
   * - 'restore_from_backup': Restore from a backup column
   */
  strategy: 'delete' | 'null' | 'backup' | 'current_timestamp' | 'restore_from_backup'
  /** Backup column name when using 'backup' or 'restore_from_backup' strategy */
  backupColumn?: string
  /** Dry run - show what would be changed without making changes */
  dryRun?: boolean
}

export interface DateTimeRepairResult {
  tableName: string
  columnName: string
  corruptedCount: number
  repairedCount: number
  backupColumn?: string
  changes: Array<{
    action: string
    rowId: any
    oldValue: any
    newValue: any
  }>
  sql: string[]
}

/**
 * DateTime Repair Utility
 *
 * Helps detect and fix corrupted DateTime data, particularly the Y2K corruption issue
 * where valid dates get corrupted to "2000-01-01 00:00:00".
 */
export class DateTimeRepairer {
  constructor(private db: Database) {}

  /**
   * Detect corrupted DateTime data in a specific table/column.
   */
  async detectCorruption(tableName: string, columnName: string): Promise<{
    total: number
    corrupted: number
    samples: any[]
  }> {
    const snakeColumn = toSnakeCase(columnName)

    // Count total non-null records
    const totalQuery = `SELECT COUNT(*) as count FROM "${tableName}" WHERE "${snakeColumn}" IS NOT NULL`
    const totalResult = await this.db.sql.unsafe(totalQuery)
    const total = parseInt(totalResult[0]?.count || '0')

    // Count Y2K corruption pattern (2000-01-01 00:00:00)
    const corruptedQuery = `
      SELECT COUNT(*) as count
      FROM "${tableName}"
      WHERE "${snakeColumn}" >= '2000-01-01 00:00:00'::timestamptz
      AND "${snakeColumn}" < '2000-01-02 00:00:00'::timestamptz
    `
    const corruptedResult = await this.db.sql.unsafe(corruptedQuery)
    const corrupted = parseInt(corruptedResult[0]?.count || '0')

    // Get samples of corrupted data
    const samplesQuery = `
      SELECT *, ctid as _row_id
      FROM "${tableName}"
      WHERE "${snakeColumn}" >= '2000-01-01 00:00:00'::timestamptz
      AND "${snakeColumn}" < '2000-01-02 00:00:00'::timestamptz
      LIMIT 10
    `
    const samples = corrupted > 0 ? await this.db.sql.unsafe(samplesQuery) : []

    return { total, corrupted, samples }
  }

  /**
   * Repair corrupted DateTime data.
   */
  async repairCorruption(options: DateTimeRepairOptions): Promise<DateTimeRepairResult> {
    const { tableName, columnName, strategy, backupColumn, dryRun = false } = options
    const snakeColumn = toSnakeCase(columnName)

    // First, detect corruption
    const detection = await this.detectCorruption(tableName, columnName)

    if (detection.corrupted === 0) {
      return {
        tableName,
        columnName,
        corruptedCount: 0,
        repairedCount: 0,
        changes: [],
        sql: []
      }
    }

    const changes: Array<{ action: string, rowId: any, oldValue: any, newValue: any }> = []
    const sql: string[] = []
    let repairedCount = 0

    try {
      // Start transaction for atomic operation
      await this.db.sql.begin(async (trx) => {
        // Create backup if requested
        if (strategy === 'backup' && backupColumn) {
          const backupSql = `ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS "${backupColumn}" TIMESTAMPTZ`
          sql.push(backupSql)
          if (!dryRun) {
            await trx.unsafe(backupSql)
          }

          const copySql = `UPDATE "${tableName}" SET "${backupColumn}" = "${snakeColumn}" WHERE "${backupColumn}" IS NULL`
          sql.push(copySql)
          if (!dryRun) {
            await trx.unsafe(copySql)
          }
        }

        // Apply repair strategy
        switch (strategy) {
          case 'delete':
            const deleteSql = `
              DELETE FROM "${tableName}"
              WHERE "${snakeColumn}" >= '2000-01-01 00:00:00'::timestamptz
              AND "${snakeColumn}" < '2000-01-02 00:00:00'::timestamptz
            `
            sql.push(deleteSql)
            if (!dryRun) {
              const deleteResult = await trx.unsafe(deleteSql)
              repairedCount = deleteResult.length
            } else {
              repairedCount = detection.corrupted
            }

            for (const sample of detection.samples) {
              changes.push({
                action: 'DELETE',
                rowId: sample._row_id,
                oldValue: sample[snakeColumn],
                newValue: null
              })
            }
            break

          case 'null':
            const nullSql = `
              UPDATE "${tableName}"
              SET "${snakeColumn}" = NULL
              WHERE "${snakeColumn}" >= '2000-01-01 00:00:00'::timestamptz
              AND "${snakeColumn}" < '2000-01-02 00:00:00'::timestamptz
            `
            sql.push(nullSql)
            if (!dryRun) {
              await trx.unsafe(nullSql)
              repairedCount = detection.corrupted
            } else {
              repairedCount = detection.corrupted
            }

            for (const sample of detection.samples) {
              changes.push({
                action: 'SET_NULL',
                rowId: sample._row_id,
                oldValue: sample[snakeColumn],
                newValue: null
              })
            }
            break

          case 'current_timestamp':
            const timestampSql = `
              UPDATE "${tableName}"
              SET "${snakeColumn}" = CURRENT_TIMESTAMP
              WHERE "${snakeColumn}" >= '2000-01-01 00:00:00'::timestamptz
              AND "${snakeColumn}" < '2000-01-02 00:00:00'::timestamptz
            `
            sql.push(timestampSql)
            if (!dryRun) {
              await trx.unsafe(timestampSql)
              repairedCount = detection.corrupted
            } else {
              repairedCount = detection.corrupted
            }

            const currentTime = DateTime.now().toISO()
            for (const sample of detection.samples) {
              changes.push({
                action: 'SET_CURRENT_TIMESTAMP',
                rowId: sample._row_id,
                oldValue: sample[snakeColumn],
                newValue: currentTime
              })
            }
            break

          case 'restore_from_backup':
            if (!backupColumn) {
              throw new Error('backupColumn is required for restore_from_backup strategy')
            }

            const restoreSql = `
              UPDATE "${tableName}"
              SET "${snakeColumn}" = "${backupColumn}"
              WHERE "${snakeColumn}" >= '2000-01-01 00:00:00'::timestamptz
              AND "${snakeColumn}" < '2000-01-02 00:00:00'::timestamptz
              AND "${backupColumn}" IS NOT NULL
            `
            sql.push(restoreSql)
            if (!dryRun) {
              await trx.unsafe(restoreSql)
              repairedCount = detection.corrupted
            } else {
              repairedCount = detection.corrupted
            }

            for (const sample of detection.samples) {
              changes.push({
                action: 'RESTORE_FROM_BACKUP',
                rowId: sample._row_id,
                oldValue: sample[snakeColumn],
                newValue: sample[backupColumn] || 'NULL'
              })
            }
            break
        }
      })

    } catch (error) {
      throw new Error(`DateTime repair failed: ${error}`)
    }

    return {
      tableName,
      columnName: snakeColumn,
      corruptedCount: detection.corrupted,
      repairedCount,
      backupColumn,
      changes,
      sql
    }
  }

  /**
   * Repair multiple tables/columns in batch.
   */
  async repairMultiple(repairs: DateTimeRepairOptions[]): Promise<DateTimeRepairResult[]> {
    const results: DateTimeRepairResult[] = []

    for (const options of repairs) {
      try {
        const result = await this.repairCorruption(options)
        results.push(result)
      } catch (error) {
        results.push({
          tableName: options.tableName,
          columnName: options.columnName,
          corruptedCount: 0,
          repairedCount: 0,
          changes: [],
          sql: [],
          error: `${error}`
        } as DateTimeRepairResult & { error: string })
      }
    }

    return results
  }

  /**
   * Generate a repair migration script.
   */
  generateMigrationScript(results: DateTimeRepairResult[]): string {
    const lines: string[] = []

    lines.push('-- DateTime Corruption Repair Migration')
    lines.push(`-- Generated on ${DateTime.now().toISO()}`)
    lines.push('-- WARNING: Review this script carefully before running')
    lines.push('')

    for (const result of results) {
      lines.push(`-- Table: ${result.tableName}, Column: ${result.columnName}`)
      lines.push(`-- Corrupted records found: ${result.corruptedCount}`)
      lines.push(`-- Records to repair: ${result.repairedCount}`)
      lines.push('')

      if (result.sql.length > 0) {
        lines.push('BEGIN;')
        lines.push('')

        for (const sqlStatement of result.sql) {
          lines.push(sqlStatement + ';')
        }

        lines.push('')
        lines.push('COMMIT;')
      }

      lines.push('')
      lines.push('-- Changes:')
      for (const change of result.changes.slice(0, 5)) { // Show first 5 changes
        lines.push(`--   ${change.action}: Row ${change.rowId}, ${change.oldValue} -> ${change.newValue}`)
      }
      if (result.changes.length > 5) {
        lines.push(`--   ... and ${result.changes.length - 5} more changes`)
      }
      lines.push('')
      lines.push('----------------------------------------')
      lines.push('')
    }

    return lines.join('\n')
  }
}