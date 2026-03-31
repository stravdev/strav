import { router } from '@stravigor/http/http'
import { view } from '@stravigor/view'

router.get('/', async () => {
  return view('welcome', { name: '__PROJECT_NAME__' })
})

router.get('/api/health', () => {
  return Response.json({ status: 'ok' })
})
