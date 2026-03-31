# Page Stubs

25 ready-to-copy `.strav` templates. Copy into `resources/views/`, change "MyApp", ship.


## Quick start

```bash
# Copy all stubs into your project
cp -r node_modules/@strav/safir/stubs/* resources/views/
```

Or copy only what you need:

```bash
# Just auth pages
cp -r node_modules/@strav/safir/stubs/layouts resources/views/
cp -r node_modules/@strav/safir/stubs/partials resources/views/
cp -r node_modules/@strav/safir/stubs/auth resources/views/
```


## How stubs work

Stubs are plain `.strav` template files using:

- **Tailwind utility classes** for all styling (no external CSS file needed)
- **`@layout()` inheritance** for shared page structure
- **`@include()` partials** for reusable fragments
- **`@if` / `@each`** for conditional and list rendering
- **`{{ variable }}`** for server data interpolation

Every page extends a layout. Every layout extends `layouts/base`. The inheritance chain:

```
your-page.strav
  → layouts/app.strav (or auth, or marketing)
    → layouts/base.strav (HTML shell, Tailwind CDN, @islands())
```


## Layouts

### `layouts/base.strav`

The HTML document shell. Every other layout extends this.

- `<!DOCTYPE html>`, charset, viewport
- Tailwind CDN via `<script src="https://cdn.tailwindcss.com">`
- Inter font from Google Fonts
- `@block('content')` — where child layouts inject their content
- `@islands()` — loads Vue island bundle before `</body>`
- `{{ title }}` — set from your route handler

### `layouts/auth.strav`

Centered card on a zinc-50 background. Used for login, register, password flows.

- Extends `layouts/base`
- Brand link at top center
- Max-width container (~384px)
- `@block('body')` — where auth pages inject their card

### `layouts/app.strav`

Sidebar + main content for authenticated pages.

- Extends `layouts/base`
- Left sidebar (w-64): brand, nav links, user section with logout
- Main content area with horizontal padding
- Mobile: sidebar hidden, simple top bar shown
- `@block('body')` — where app pages inject their content
- Expects `user` object with `name` property

### `layouts/marketing.strav`

Public-facing pages with navbar and footer.

- Extends `layouts/base`
- Sticky navbar: brand left, Sign in + Get started right
- Footer: copyright + links (Privacy, Terms, Contact)
- `@block('body')` — where marketing pages inject their sections


## Partials

### `partials/flash.strav`

Flash message display. Include in any page:

```strav
@include('partials/flash')
```

Expects `success` and/or `error` template variables. Renders green or red alert banners. Matches Safir Alert component styling.


## Auth pages

All extend `layouts/auth`. All use `@include('partials/flash')`.

### Routes setup

```ts
// start/routes.ts
router.get('/login', () => view('auth/login'))
router.post('/login', loginHandler)

router.get('/register', () => view('auth/register'))
router.post('/register', registerHandler)

router.get('/forgot-password', () => view('auth/forgot-password'))
router.post('/forgot-password', forgotPasswordHandler)

router.get('/reset-password', (req) => view('auth/reset-password', { token: req.query.token }))
router.post('/reset-password', resetPasswordHandler)

router.get('/verify-email', () => view('auth/verify-email'))
router.post('/email/send', resendVerificationHandler)

router.get('/email-verified', () => view('auth/email-verified'))

router.get('/two-factor', () => view('auth/two-factor'))
router.post('/two-factor/challenge', twoFactorHandler)
```

### Template variables

| Page | Variables |
|------|-----------|
| login | `error` |
| register | `error` |
| forgot-password | `success`, `error` |
| reset-password | `token`, `error` |
| verify-email | `success`, `error` |
| email-verified | (none) |
| two-factor | `error` |


## App pages

All extend `layouts/app`. All expect a `user` object.

### `app/dashboard.strav`

```ts
return view('app/dashboard', {
  user,
  stats: [
    { label: 'Total Users', value: '1,234', change: '+12% from last month' },
    { label: 'Revenue', value: '$5,678' },
    { label: 'Active Projects', value: '23' },
    { label: 'Uptime', value: '99.9%' },
  ],
  recentItems: [
    { id: 1, name: 'Project Alpha', status: 'Active', date: 'Jan 15, 2026' },
    { id: 2, name: 'Project Beta', status: 'Draft', date: 'Jan 14, 2026' },
  ],
})
```

### `app/list.strav`

```ts
return view('app/list', {
  user,
  title: 'Projects',
  items: projects,     // array of { id, name, status, createdAt }
  total: 47,
  page: 1,
  totalPages: 3,
})
```

Replace `/app/items` URLs in the template with your actual resource path.

### `app/show.strav`

```ts
return view('app/show', {
  user,
  item: { id: 1, name: 'Project Alpha', description: 'A cool project' },
  fields: [
    { label: 'Status', value: 'Active' },
    { label: 'Created', value: 'January 15, 2026' },
    { label: 'Owner', value: 'Alice Martin' },
    { label: 'Last updated', value: '2 hours ago' },
  ],
})
```

### `app/form.strav`

```ts
// Create
return view('app/form', {
  user,
  title: 'Create project',
  action: '/app/projects',
  values: {},
  errors: {},
})

// Edit (after validation failure)
return view('app/form', {
  user,
  title: 'Edit project',
  action: '/app/projects/1',
  values: { name: 'Project Alpha', description: '...' },
  errors: { name: 'Name is required' },
})
```

### `app/settings.strav`

```ts
return view('app/settings', { user, success, error })
```

Three sections: Profile (name, email), Password (current + new + confirm), Danger zone (delete account).


## Marketing pages

### `marketing/landing.strav`

Four sections: Hero, Features (3-column grid), Pricing (single card), CTA.

All content is hardcoded in the template — most MVPs don't need dynamic landing pages. Edit the HTML directly.

### `marketing/pricing.strav`

Three pricing tiers (Free, Pro, Enterprise) + FAQ section using native `<details>` elements.

Edit the prices, features, and FAQ questions directly in the template.


## Error pages

Extend `layouts/base` directly. Minimal: status code, message, "Go home" link.

```ts
// In your exception handler
return view('errors/404', { title: 'Not Found' })
return view('errors/500', { title: 'Server Error' })
return view('errors/403', { title: 'Access Denied' })
```


## Email templates

Standalone HTML with inline styles (no layout inheritance — emails need inline CSS for client compatibility).

```ts
// Sending emails
await mail.send('emails/welcome', {
  appName: 'MyApp',
  name: user.name,
  url: 'https://myapp.com/app',
})

await mail.send('emails/reset-password', {
  appName: 'MyApp',
  url: `https://myapp.com/reset-password?token=${token}`,
})

await mail.send('emails/verify-email', {
  appName: 'MyApp',
  url: `https://myapp.com/verify-email?token=${token}`,
})
```

All emails follow the same structure: brand header, body with CTA button, muted footer.


## Customization

These are stubs, not dependencies. After copying, they're your files. Common changes:

1. **Brand name** — Replace "MyApp" in layouts and emails
2. **Navigation links** — Edit `layouts/app.strav` sidebar links
3. **Colors** — Find/replace `zinc-900` with your primary color
4. **Routes** — Replace `/app/items` with your resource paths
5. **Form fields** — Add/remove fields in `app/form.strav`
6. **Landing content** — Edit headings, features, and pricing directly
