import type { SQL } from 'bun'
import type { AggregateRecord, AggregateFunction } from '../types.ts'

/** Aggregation periods in seconds. */
export const PERIODS = {
  ONE_HOUR: 3600,
  SIX_HOURS: 21600,
  ONE_DAY: 86400,
  SEVEN_DAYS: 604800,
} as const

/**
 * Stores and queries pre-aggregated metric buckets in `_strav_devtools_aggregates`.
 *
 * Used by recorders to store slow request counts, slow query counts, etc.
 * The dashboard reads these for time-series charts without scanning raw entries.
 */
export default class AggregateStore {
  constructor(private sql: SQL) {}

  /** Create the aggregates table if it doesn't exist. */
  async ensureTable(): Promise<void> {
    await this.sql`
      CREATE TABLE IF NOT EXISTS "_strav_devtools_aggregates" (
        "id" BIGSERIAL PRIMARY KEY,
        "bucket" INT NOT NULL,
        "period" INT NOT NULL,
        "type" VARCHAR(30) NOT NULL,
        "key" TEXT NOT NULL DEFAULT '',
        "aggregate" VARCHAR(10) NOT NULL,
        "value" NUMERIC(20, 2) NOT NULL DEFAULT 0,
        "count" INT,
        UNIQUE ("bucket", "period", "type", "aggregate", "key")
      )
    `

    await this.sql`
      CREATE INDEX IF NOT EXISTS "idx_strav_devtools_aggregates_lookup"
        ON "_strav_devtools_aggregates" ("type", "period", "bucket" DESC)
    `
  }

  /**
   * Record a value into the appropriate time buckets.
   * Updates existing bucket rows via upsert (INSERT ... ON CONFLICT).
   */
  async record(
    type: string,
    key: string,
    value: number,
    aggregates: AggregateFunction[]
  ): Promise<void> {
    const now = Math.floor(Date.now() / 1000)

    for (const period of Object.values(PERIODS)) {
      const bucket = Math.floor(now / period) * period

      for (const agg of aggregates) {
        await this.upsert(bucket, period, type, key, agg, value)
      }
    }
  }

  /** Query aggregated data for a type over a time range. */
  async query(
    type: string,
    period: number,
    aggregate: AggregateFunction,
    limit = 24
  ): Promise<AggregateRecord[]> {
    const rows = await this.sql`
      SELECT * FROM "_strav_devtools_aggregates"
      WHERE "type" = ${type}
        AND "period" = ${period}
        AND "aggregate" = ${aggregate}
      ORDER BY "bucket" DESC
      LIMIT ${limit}
    `
    return rows.map(hydrateAggregate)
  }

  /** Query top keys by aggregate value for a type. */
  async topKeys(
    type: string,
    period: number,
    aggregate: AggregateFunction,
    limit = 10
  ): Promise<AggregateRecord[]> {
    const now = Math.floor(Date.now() / 1000)
    const since = now - period

    const rows = await this.sql`
      SELECT "key", SUM("value") AS "value", SUM("count") AS "count",
             MAX("bucket") AS "bucket", ${period}::int AS "period",
             ${type} AS "type", ${aggregate} AS "aggregate", 0 AS "id"
      FROM "_strav_devtools_aggregates"
      WHERE "type" = ${type}
        AND "period" = ${period}
        AND "aggregate" = ${aggregate}
        AND "bucket" >= ${since}
      GROUP BY "key"
      ORDER BY SUM("value") DESC
      LIMIT ${limit}
    `
    return rows.map(hydrateAggregate)
  }

  /** Delete aggregates older than the given number of hours. */
  async prune(hours: number): Promise<number> {
    const cutoff = Math.floor(Date.now() / 1000) - hours * 3600

    const rows = await this.sql`
      DELETE FROM "_strav_devtools_aggregates"
      WHERE "bucket" < ${cutoff}
    `
    return rows.count
  }

  private async upsert(
    bucket: number,
    period: number,
    type: string,
    key: string,
    aggregate: AggregateFunction,
    value: number
  ): Promise<void> {
    switch (aggregate) {
      case 'count':
        await this.sql`
          INSERT INTO "_strav_devtools_aggregates" ("bucket", "period", "type", "key", "aggregate", "value", "count")
          VALUES (${bucket}, ${period}, ${type}, ${key}, 'count', 1, 1)
          ON CONFLICT ("bucket", "period", "type", "aggregate", "key")
          DO UPDATE SET "value" = "_strav_devtools_aggregates"."value" + 1,
                        "count" = COALESCE("_strav_devtools_aggregates"."count", 0) + 1
        `
        break

      case 'sum':
        await this.sql`
          INSERT INTO "_strav_devtools_aggregates" ("bucket", "period", "type", "key", "aggregate", "value", "count")
          VALUES (${bucket}, ${period}, ${type}, ${key}, 'sum', ${value}, 1)
          ON CONFLICT ("bucket", "period", "type", "aggregate", "key")
          DO UPDATE SET "value" = "_strav_devtools_aggregates"."value" + ${value},
                        "count" = COALESCE("_strav_devtools_aggregates"."count", 0) + 1
        `
        break

      case 'max':
        await this.sql`
          INSERT INTO "_strav_devtools_aggregates" ("bucket", "period", "type", "key", "aggregate", "value", "count")
          VALUES (${bucket}, ${period}, ${type}, ${key}, 'max', ${value}, 1)
          ON CONFLICT ("bucket", "period", "type", "aggregate", "key")
          DO UPDATE SET "value" = GREATEST("_strav_devtools_aggregates"."value", ${value}),
                        "count" = COALESCE("_strav_devtools_aggregates"."count", 0) + 1
        `
        break

      case 'min':
        await this.sql`
          INSERT INTO "_strav_devtools_aggregates" ("bucket", "period", "type", "key", "aggregate", "value", "count")
          VALUES (${bucket}, ${period}, ${type}, ${key}, 'min', ${value}, 1)
          ON CONFLICT ("bucket", "period", "type", "aggregate", "key")
          DO UPDATE SET "value" = LEAST("_strav_devtools_aggregates"."value", ${value}),
                        "count" = COALESCE("_strav_devtools_aggregates"."count", 0) + 1
        `
        break

      case 'avg':
        await this.sql`
          INSERT INTO "_strav_devtools_aggregates" ("bucket", "period", "type", "key", "aggregate", "value", "count")
          VALUES (${bucket}, ${period}, ${type}, ${key}, 'avg', ${value}, 1)
          ON CONFLICT ("bucket", "period", "type", "aggregate", "key")
          DO UPDATE SET "value" = (
                          "_strav_devtools_aggregates"."value" * COALESCE("_strav_devtools_aggregates"."count", 1)
                          + ${value}
                        ) / (COALESCE("_strav_devtools_aggregates"."count", 1) + 1),
                        "count" = COALESCE("_strav_devtools_aggregates"."count", 0) + 1
        `
        break
    }
  }
}

function hydrateAggregate(row: Record<string, unknown>): AggregateRecord {
  return {
    id: Number(row.id),
    bucket: Number(row.bucket),
    period: Number(row.period),
    type: row.type as string,
    key: row.key as string,
    aggregate: row.aggregate as AggregateFunction,
    value: Number(row.value),
    count: row.count != null ? Number(row.count) : null,
  }
}
