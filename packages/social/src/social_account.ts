import { extractUserId } from '@strav/database'
import SocialManager from './social_manager.ts'
import type { SocialUser } from './types.ts'

/** The DB record for a social account link. */
export interface SocialAccountData {
  id: number
  userId: string | number
  provider: string
  providerId: string
  token: string
  refreshToken: string | null
  expiresAt: Date | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Static helper for managing social account records.
 *
 * Follows the same pattern as AccessToken: all methods are static,
 * database access goes through the parent manager (SocialManager.db).
 *
 * @example
 * const account = await SocialAccount.findByProvider('github', '12345')
 * const accounts = await SocialAccount.findByUser(user)
 * const created = await SocialAccount.create({ user, provider: 'google', ... })
 */
export default class SocialAccount {
  private static get sql() {
    return SocialManager.db.sql
  }

  private static get fk() {
    return SocialManager.userFkColumn
  }

  /**
   * Find a social account by provider name and provider-specific user ID.
   * This is the primary lookup used during OAuth callback.
   */
  static async findByProvider(
    provider: string,
    providerId: string
  ): Promise<SocialAccountData | null> {
    const rows = await SocialAccount.sql`
      SELECT * FROM "social_account"
      WHERE "provider" = ${provider}
        AND "provider_id" = ${providerId}
      LIMIT 1
    `
    return rows.length > 0 ? SocialAccount.hydrate(rows[0] as Record<string, unknown>) : null
  }

  /**
   * Find all social accounts linked to a user.
   */
  static async findByUser(user: unknown): Promise<SocialAccountData[]> {
    const userId = extractUserId(user)
    const fk = SocialAccount.fk
    const rows = await SocialAccount.sql.unsafe(
      `SELECT * FROM "social_account" WHERE "${fk}" = $1 ORDER BY "created_at" ASC`,
      [userId]
    )
    return rows.map((r: any) => SocialAccount.hydrate(r))
  }

  /**
   * Create a new social account link.
   */
  static async create(data: {
    user: unknown
    provider: string
    providerId: string
    token: string
    refreshToken?: string | null
    expiresAt?: Date | null
  }): Promise<SocialAccountData> {
    const userId = extractUserId(data.user)
    const fk = SocialAccount.fk
    const rows = await SocialAccount.sql.unsafe(
      `INSERT INTO "social_account" ("${fk}", "provider", "provider_id", "token", "refresh_token", "expires_at")
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        userId,
        data.provider,
        data.providerId,
        data.token,
        data.refreshToken ?? null,
        data.expiresAt ?? null,
      ]
    )
    return SocialAccount.hydrate(rows[0] as Record<string, unknown>)
  }

  /**
   * Find an existing social account by provider or create a new one.
   * If the account already exists, its tokens are updated.
   */
  static async findOrCreate(
    provider: string,
    socialUser: SocialUser,
    user: unknown
  ): Promise<{ account: SocialAccountData; created: boolean }> {
    const existing = await SocialAccount.findByProvider(provider, socialUser.id)
    if (existing) {
      await SocialAccount.updateTokens(
        existing.id,
        socialUser.token,
        socialUser.refreshToken,
        socialUser.expiresIn ? new Date(Date.now() + socialUser.expiresIn * 1000) : null
      )
      existing.token = socialUser.token
      existing.refreshToken = socialUser.refreshToken
      existing.expiresAt = socialUser.expiresIn
        ? new Date(Date.now() + socialUser.expiresIn * 1000)
        : null
      return { account: existing, created: false }
    }

    const account = await SocialAccount.create({
      user,
      provider,
      providerId: socialUser.id,
      token: socialUser.token,
      refreshToken: socialUser.refreshToken,
      expiresAt: socialUser.expiresIn ? new Date(Date.now() + socialUser.expiresIn * 1000) : null,
    })
    return { account, created: true }
  }

  /**
   * Update OAuth tokens for an existing social account.
   */
  static async updateTokens(
    id: number,
    token: string,
    refreshToken: string | null,
    expiresAt: Date | null
  ): Promise<void> {
    await SocialAccount.sql`
      UPDATE "social_account"
      SET "token" = ${token},
          "refresh_token" = ${refreshToken},
          "expires_at" = ${expiresAt},
          "updated_at" = NOW()
      WHERE "id" = ${id}
    `
  }

  /** Delete a social account by its database ID. */
  static async delete(id: number): Promise<void> {
    await SocialAccount.sql`
      DELETE FROM "social_account" WHERE "id" = ${id}
    `
  }

  /** Delete all social accounts for a user. */
  static async deleteByUser(user: unknown): Promise<void> {
    const userId = extractUserId(user)
    const fk = SocialAccount.fk
    await SocialAccount.sql.unsafe(`DELETE FROM "social_account" WHERE "${fk}" = $1`, [userId])
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private static hydrate(row: Record<string, unknown>): SocialAccountData {
    const fk = SocialAccount.fk
    return {
      id: row.id as number,
      userId: row[fk] as string | number,
      provider: row.provider as string,
      providerId: row.provider_id as string,
      token: row.token as string,
      refreshToken: (row.refresh_token as string) ?? null,
      expiresAt: (row.expires_at as Date) ?? null,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    }
  }
}
