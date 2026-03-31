import { defineSchema, t, Archetype } from '@stravigor/database/schema'

export default defineSchema('_strav_devtools_aggregates', {
  archetype: Archetype.Event,
  fields: {
    bucket: t.integer().required(),
    period: t.integer().required(),
    type: t.varchar(30).required(),
    key: t.text().required(),
    aggregate: t.varchar(10).required(),
    value: t.numeric(20, 2).required(),
    count: t.integer().nullable(),
  },
})
