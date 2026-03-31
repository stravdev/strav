import { describe, test, expect, beforeEach } from 'bun:test'
import { social } from '../src/helpers.ts'
import SocialManager from '../src/social_manager.ts'
import { GoogleProvider } from '../src/providers/google_provider.ts'

function mockDb() {
  return {
    sql: Object.assign(() => Promise.resolve([]), { unsafe: () => Promise.resolve([]) }),
  } as any
}

function mockConfig(data: Record<string, unknown>) {
  return {
    get(key: string, defaultValue?: unknown): unknown {
      const parts = key.split('.')
      let current: any = data
      for (const part of parts) {
        if (current === undefined || current === null) return defaultValue
        current = current[part]
      }
      return current !== undefined ? current : defaultValue
    },
  } as any
}

describe('social helper', () => {
  beforeEach(() => {
    new SocialManager(
      mockDb(),
      mockConfig({
        social: {
          providers: {
            google: {
              clientId: 'id',
              clientSecret: 'secret',
              redirectUrl: 'http://localhost/cb',
            },
          },
        },
      })
    )
    SocialManager.reset()
  })

  test('driver() delegates to SocialManager', () => {
    const driver = social.driver('google')
    expect(driver).toBeInstanceOf(GoogleProvider)
  })

  test('extend() delegates to SocialManager', () => {
    social.extend('custom', config => new GoogleProvider(config))

    new SocialManager(
      mockDb(),
      mockConfig({
        social: {
          providers: {
            myapp: { driver: 'custom', clientId: 'x', clientSecret: 'x', redirectUrl: 'x' },
          },
        },
      })
    )

    const driver = social.driver('myapp')
    expect(driver).toBeInstanceOf(GoogleProvider)
  })
})
