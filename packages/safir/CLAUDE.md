# Safir

Lightweight Vue 3 UI component library + page stubs for the Stravigor framework.

## Project structure

```
safir/
  src/                          # npm package (@stravigor/safir)
    index.ts                    # Barrel export for all components + composables
    utils/cn.ts                 # clsx + tailwind-merge utility
    composables/useToast.ts     # Programmatic toast API
    components/                 # 28 Vue SFC files
  stubs/                        # Ready-to-copy .strav page templates (not part of npm package)
    layouts/                    # base, auth, app, marketing
    partials/                   # flash messages
    auth/                       # login, register, forgot-password, reset-password, verify-email, email-verified, two-factor
    app/                        # dashboard, list, show, form, settings
    marketing/                  # landing, pricing
    errors/                     # 404, 500, 403
    emails/                     # welcome, reset-password, verify-email
  docs/                         # Documentation (introduction, philosophy, components, stubs)
```

## Stack

- Vue 3 with `<script setup lang="ts">`
- Tailwind CSS — hardcoded zinc palette, single theme, no CSS variables
- CVA (class-variance-authority) for component variant systems
- clsx + tailwind-merge via `cn()` utility
- Heroicons (`@heroicons/vue`) as peer dependency
- No build step — ships raw .vue/.ts source, compiled by Bun at bundle time

## Design rules

1. **Props over composition** — data goes into props, not sub-component trees
2. **Max 1-3 sub-components per group** — only 1 exists in the whole library (ToastContainer)
3. **HTML and Tailwind classes in slots** — no wrapper components for content
4. **No configuration** — no theme providers, no setup functions, no config files
5. **Single visual language** — zinc palette, Inter font, rounded-md, shadow-sm everywhere

## Component conventions

Every component follows this pattern:

- `<script setup lang="ts">` with a `Props` interface
- CVA for variants (when component has variants), plain `cn()` otherwise
- `class` prop (type `HTMLAttributes['class']`) on every component for overrides
- Computed `classes` binding: `const classes = computed(() => cn(variants(...), props.class))`
- Heroicons imported from `@heroicons/vue/20/solid`
- Imports use `.ts` extension: `import { cn } from '../utils/cn.ts'`

## Stubs conventions

- All Tailwind, no custom CSS — every style is a utility class
- Form inputs use the same classes as Safir's Input.vue component
- Buttons use the same classes as Safir's Button.vue component
- All auth form field names match Bastion endpoint expectations
- Use `@include('partials/flash')` for error/success messages
- Layout chain: page → layout (auth/app/marketing) → base

## Key files

- `src/index.ts` — barrel export, update when adding/removing components
- `src/utils/cn.ts` — foundation utility used by every component
- `src/composables/useToast.ts` — the only composable, shared toast state
- `src/components/Button.vue` — reference pattern for all component conventions
- `stubs/layouts/base.strav` — root HTML layout all stubs inherit from
- `stubs/partials/flash.strav` — shared flash message partial

## When adding a new component

1. Create `src/components/Name.vue` following the Button.vue pattern
2. Export it from `src/index.ts`
3. Add documentation to `docs/components.md`
4. Keep props minimal — prefer fewer props over more
5. Never introduce more than 1 sub-component for a feature

## When adding a new stub

1. Create the `.strav` file in the appropriate `stubs/` subdirectory
2. Extend the correct layout (`layouts/auth`, `layouts/app`, or `layouts/marketing`)
3. Use `@include('partials/flash')` if the page needs error/success messages
4. Use Tailwind classes that match Safir component styling
5. Document template variables in `docs/stubs.md`
