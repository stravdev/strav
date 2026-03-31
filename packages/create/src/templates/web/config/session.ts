export default {
  cookie: 'strav_session',
  lifetime: 120,
  httpOnly: true,
  secure: false,
  sameSite: 'lax' as const,
}
