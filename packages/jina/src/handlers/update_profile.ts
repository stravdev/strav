import { Emitter } from '@strav/kernel'
import type { Context } from '@strav/http'
import JinaManager from '../jina_manager.ts'
import { JinaEvents } from '../types.ts'

export async function updateProfileHandler(ctx: Context): Promise<Response> {
  const data = await ctx.body<Record<string, unknown>>()
  const user = ctx.get('user')

  await JinaManager.actions.updateProfile!(user, data)

  if (Emitter.listenerCount(JinaEvents.PROFILE_UPDATED) > 0) {
    Emitter.emit(JinaEvents.PROFILE_UPDATED, { user, ctx }).catch(() => {})
  }

  return ctx.json({ message: 'Profile updated.' })
}
