import { defineSchema, t, Archetype } from '@strav/database/schema'

export default defineSchema('user', {
  archetype: Archetype.Entity,
  fields: {
    email: t.varchar(255).required().unique().index(),
    name: t.varchar(255).required(),
    password: t.varchar(255).required().sensitive(),
  },
})
