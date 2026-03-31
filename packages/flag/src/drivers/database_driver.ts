import type { SQL } from 'bun'
import type { FeatureStore } from '../feature_store.ts'
import type { ScopeKey, StoredFeature } from '../types.ts'

/** PostgreSQL-backed feature store using `_strav_features`. */
export class DatabaseDriver implements FeatureStore {
  readonly name = 'database'

  constructor(private sql: SQL) {}

  async ensureTable(): Promise<void> {
    await this.sql`
      CREATE TABLE IF NOT EXISTS "_strav_features" (
        "id"         BIGSERIAL PRIMARY KEY,
        "feature"    VARCHAR(255) NOT NULL,
        "scope"      VARCHAR(255) NOT NULL,
        "value"      JSONB NOT NULL DEFAULT 'true',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `

    await this.sql`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_strav_features_lookup"
        ON "_strav_features" ("feature", "scope")
    `
  }

  async get(feature: string, scope: ScopeKey): Promise<unknown | undefined> {
    const rows = await this.sql`
      SELECT "value" FROM "_strav_features"
      WHERE "feature" = ${feature} AND "scope" = ${scope}
      LIMIT 1
    `
    if (rows.length === 0) return undefined
    return parseValue(rows[0].value)
  }

  async getMany(features: string[], scope: ScopeKey): Promise<Map<string, unknown>> {
    if (features.length === 0) return new Map()

    const rows = await this.sql`
      SELECT "feature", "value" FROM "_strav_features"
      WHERE "feature" IN ${this.sql(features)} AND "scope" = ${scope}
    `

    const result = new Map<string, unknown>()
    for (const row of rows) {
      result.set(row.feature as string, parseValue(row.value))
    }
    return result
  }

  async set(feature: string, scope: ScopeKey, value: unknown): Promise<void> {
    const jsonValue = JSON.stringify(value)
    await this.sql`
      INSERT INTO "_strav_features" ("feature", "scope", "value", "created_at", "updated_at")
      VALUES (${feature}, ${scope}, ${jsonValue}::jsonb, NOW(), NOW())
      ON CONFLICT ("feature", "scope")
      DO UPDATE SET "value" = ${jsonValue}::jsonb, "updated_at" = NOW()
    `
  }

  async setMany(
    entries: Array<{ feature: string; scope: ScopeKey; value: unknown }>
  ): Promise<void> {
    if (entries.length === 0) return
    if (entries.length === 1) {
      await this.set(entries[0]!.feature, entries[0]!.scope, entries[0]!.value)
      return
    }

    await this.sql.begin(async tx => {
      for (const e of entries) {
        const jsonValue = JSON.stringify(e.value)
        await tx`
          INSERT INTO "_strav_features" ("feature", "scope", "value", "created_at", "updated_at")
          VALUES (${e.feature}, ${e.scope}, ${jsonValue}::jsonb, NOW(), NOW())
          ON CONFLICT ("feature", "scope")
          DO UPDATE SET "value" = ${jsonValue}::jsonb, "updated_at" = NOW()
        `
      }
    })
  }

  async forget(feature: string, scope: ScopeKey): Promise<void> {
    await this.sql`
      DELETE FROM "_strav_features"
      WHERE "feature" = ${feature} AND "scope" = ${scope}
    `
  }

  async purge(feature: string): Promise<void> {
    await this.sql`
      DELETE FROM "_strav_features"
      WHERE "feature" = ${feature}
    `
  }

  async purgeAll(): Promise<void> {
    await this.sql`DELETE FROM "_strav_features"`
  }

  async featureNames(): Promise<string[]> {
    const rows = await this.sql`
      SELECT DISTINCT "feature" FROM "_strav_features"
      ORDER BY "feature"
    `
    return rows.map((r: Record<string, unknown>) => r.feature as string)
  }

  async allFor(feature: string): Promise<StoredFeature[]> {
    const rows = await this.sql`
      SELECT "feature", "scope", "value", "created_at", "updated_at"
      FROM "_strav_features"
      WHERE "feature" = ${feature}
      ORDER BY "scope"
    `

    return rows.map((row: Record<string, unknown>) => ({
      feature: row.feature as string,
      scope: row.scope as ScopeKey,
      value: parseValue(row.value),
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    }))
  }
}

function parseValue(raw: unknown): unknown {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch {
      return raw
    }
  }
  return raw
}
