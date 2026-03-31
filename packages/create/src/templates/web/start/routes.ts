import { router } from '@strav/http/http'
import { view } from '@strav/view'

router.get('/', async () => {
  return view('welcome', { name: '__PROJECT_NAME__' })
})

router.get('/api/health', () => {
  return Response.json({ status: 'ok' })
})
