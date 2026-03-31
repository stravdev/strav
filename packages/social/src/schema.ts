import { defineSchema, t, Archetype } from '@strav/database'

export const schema = defineSchema('social_account', {
  archetype: Archetype.Component,
  parents: ['user'],
  fields: {
    provider: t.varchar(50).required().index(),
    providerId: t.varchar(255).required().index(),
    token: t.text().required().sensitive(),
    refreshToken: t.text().nullable().sensitive(),
    expiresAt: t.timestamptz().nullable(),
  },
})
