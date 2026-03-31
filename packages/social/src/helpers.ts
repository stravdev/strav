import type { AbstractProvider } from './abstract_provider.ts'
import SocialAccount from './social_account.ts'
import SocialManager from './social_manager.ts'
import type { ProviderConfig, SocialUser } from './types.ts'
import type { SocialAccountData } from './social_account.ts'

export const social = {
  driver(name: string): AbstractProvider {
    return SocialManager.driver(name)
  },

  extend(name: string, factory: (config: ProviderConfig) => AbstractProvider): void {
    SocialManager.extend(name, factory)
  },

  /**
   * Find an existing social account by provider or create a new one.
   * If the account already exists, its tokens are updated.
   *
   * @example
   * const socialUser = await social.driver('google').user(ctx)
   * const { account, created } = await social.findOrCreate('google', socialUser, user)
   */
  findOrCreate(
    provider: string,
    socialUser: SocialUser,
    user: unknown
  ): Promise<{ account: SocialAccountData; created: boolean }> {
    return SocialAccount.findOrCreate(provider, socialUser, user)
  },
}
