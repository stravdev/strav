import { defineSchema, t, Archetype } from '@strav/database/schema'

export default defineSchema('_strav_devtools_entries', {
  archetype: Archetype.Event,
  fields: {
    uuid: t.uuid().required(),
    batchId: t.uuid().required().index(),
    type: t.varchar(30).required().index(),
    familyHash: t.varchar(64).nullable().index(),
    content: t.jsonb().required(),
    tags: t.text().array().required(),
  },
})
