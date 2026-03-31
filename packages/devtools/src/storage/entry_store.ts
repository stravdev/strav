import type { SQL } from 'bun'
import type { DevtoolsEntry, EntryRecord, EntryType } from '../types.ts'

/**
 * Stores and queries raw devtools entries in `_strav_devtools_entries`.
 *
 * Each entry represents a single recorded event (request, query, exception, etc.)
 * and belongs to a batch (all entries from a single request/job share a batchId).
 */
export default class EntryStore {
  constructor(private sql: SQL) {}

  /** Create the entries table if it doesn't exist. */
  async ensureTable(): Promise<void> {
    await this.sql`
      CREATE TABLE IF NOT EXISTS "_strav_devtools_entries" (
        "id" BIGSERIAL PRIMARY KEY,
        "uuid" UUID NOT NULL,
        "batch_id" UUID NOT NULL,
        "type" VARCHAR(30) NOT NULL,
        "family_hash" VARCHAR(64),
        "content" JSONB NOT NULL DEFAULT '{}',
        "tags" TEXT[] NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `

    await this.sql`
      CREATE INDEX IF NOT EXISTS "idx_strav_devtools_entries_batch"
        ON "_strav_devtools_entries" ("batch_id")
    `

    await this.sql`
      CREATE INDEX IF NOT EXISTS "idx_strav_devtools_entries_type_created"
        ON "_strav_devtools_entries" ("type", "created_at" DESC)
    `

    await this.sql`
      CREATE INDEX IF NOT EXISTS "idx_strav_devtools_entries_family_hash"
        ON "_strav_devtools_entries" ("family_hash")
        WHERE "family_hash" IS NOT NULL
    `
  }

  /** Insert one or more entries. */
  async store(entries: DevtoolsEntry[]): Promise<void> {
    if (entries.length === 0) return

    for (const entry of entries) {
      const tagsLiteral = `{${entry.tags.map(t => `"${t.replace(/"/g, '\\"')}"`).join(',')}}`
      await this.sql`
        INSERT INTO "_strav_devtools_entries"
          ("uuid", "batch_id", "type", "family_hash", "content", "tags", "created_at")
        VALUES (
          ${entry.uuid},
          ${entry.batchId},
          ${entry.type},
          ${entry.familyHash},
          ${JSON.stringify(entry.content)},
          ${tagsLiteral}::TEXT[],
          ${entry.createdAt}
        )
      `
    }
  }

  /** List entries by type, most recent first. */
  async list(type?: EntryType, limit = 50, offset = 0): Promise<EntryRecord[]> {
    let rows

    if (type) {
      rows = await this.sql`
        SELECT * FROM "_strav_devtools_entries"
        WHERE "type" = ${type}
        ORDER BY "created_at" DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else {
      rows = await this.sql`
        SELECT * FROM "_strav_devtools_entries"
        ORDER BY "created_at" DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    }

    return rows.map(hydrateEntry)
  }

  /** Find a single entry by UUID. */
  async find(uuid: string): Promise<EntryRecord | null> {
    const rows = await this.sql`
      SELECT * FROM "_strav_devtools_entries"
      WHERE "uuid" = ${uuid}
      LIMIT 1
    `
    return rows.length > 0 ? hydrateEntry(rows[0] as Record<string, unknown>) : null
  }

  /** Find all entries in a batch, for cross-referencing. */
  async batch(batchId: string): Promise<EntryRecord[]> {
    const rows = await this.sql`
      SELECT * FROM "_strav_devtools_entries"
      WHERE "batch_id" = ${batchId}
      ORDER BY "created_at" ASC
    `
    return rows.map(hydrateEntry)
  }

  /** Search entries by tag. */
  async byTag(tag: string, limit = 50): Promise<EntryRecord[]> {
    const rows = await this.sql`
      SELECT * FROM "_strav_devtools_entries"
      WHERE ${tag} = ANY("tags")
      ORDER BY "created_at" DESC
      LIMIT ${limit}
    `
    return rows.map(hydrateEntry)
  }

  /** Delete entries older than the given number of hours. */
  async prune(hours: number): Promise<number> {
    const rows = await this.sql`
      DELETE FROM "_strav_devtools_entries"
      WHERE "created_at" < NOW() - MAKE_INTERVAL(hours => ${hours})
    `
    return rows.count
  }

  /** Count entries, optionally filtered by type. */
  async count(type?: EntryType): Promise<number> {
    if (type) {
      const rows = await this.sql`
        SELECT COUNT(*)::int AS count FROM "_strav_devtools_entries"
        WHERE "type" = ${type}
      `
      return (rows[0] as Record<string, unknown>).count as number
    }

    const rows = await this.sql`
      SELECT COUNT(*)::int AS count FROM "_strav_devtools_entries"
    `
    return (rows[0] as Record<string, unknown>).count as number
  }
}

function hydrateEntry(row: Record<string, unknown>): EntryRecord {
  return {
    id: Number(row.id),
    uuid: row.uuid as string,
    batchId: row.batch_id as string,
    type: row.type as EntryType,
    familyHash: (row.family_hash as string) ?? null,
    content: (typeof row.content === 'string' ? JSON.parse(row.content) : row.content) as Record<
      string,
      unknown
    >,
    tags: (row.tags ?? []) as string[],
    createdAt: row.created_at as Date,
  }
}
