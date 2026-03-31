import { router } from '@stravigor/http/http'

router.get('/', () => {
  return Response.json({
    name: '__PROJECT_NAME__',
    status: 'running',
  })
})

router.get('/health', () => {
  return Response.json({ status: 'ok' })
})
