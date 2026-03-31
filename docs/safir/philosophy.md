# Philosophy

Five rules that govern every decision in Safir.


## 1. Props over composition

Data goes into props. Content goes into slots. That's it.

Other libraries make you assemble components from pieces:

```html
<!-- This is what we don't do -->
<Card>
  <CardHeader>
    <CardTitle>Team Members</CardTitle>
    <CardDescription>Manage who has access.</CardDescription>
  </CardHeader>
  <CardContent>
    <ul>...</ul>
  </CardContent>
  <CardFooter>
    <Button>Invite</Button>
  </CardFooter>
</Card>
```

Five components for a card. Each one is a file you need to import, a name you need to remember, a nesting level you need to get right.

Safir:

```html
<Card title="Team Members" description="Manage who has access.">
  <ul>...</ul>
  <template #footer>
    <Button>Invite</Button>
  </template>
</Card>
```

One component. Title is a prop. Description is a prop. Content is the default slot. Footer is a named slot.


## 2. Maximum 1-3 sub-components per group

If a component group needs more than 3 files, it's too complex for Safir.

The entire library has exactly **1 sub-component**: `ToastContainer` (because toasts need a global container). Everything else — all 27 other components — is a single `.vue` file.

If you need a component with 5 sub-components, build it yourself. Safir gives you the primitives.


## 3. HTML and classes, not more components

Slots are for HTML, not for component trees.

```html
<Alert title="Unable to process" variant="destructive" show-icon>
  <p>Please verify your billing information.</p>
  <ul class="mt-2 list-inside list-disc space-y-1">
    <li>Check your card details</li>
    <li>Ensure sufficient funds</li>
  </ul>
</Alert>
```

The slot contains a `<p>` and a `<ul>`. Plain HTML. Tailwind classes for spacing. No `<AlertDescription>`, no `<AlertList>`, no `<AlertListItem>`.

You already know HTML. Use it.


## 4. Things that just work

No configuration step. No theme provider. No context wrapper. No setup function (except `ToastContainer` once in your app).

Import a component, pass props, it works:

```html
<Input v-model="email" label="Email" :error="errors.email" />
```

This renders a label, an input, and an error message. The label is wired to the input with a generated ID. The error turns the border red. You didn't configure anything.

Same with page stubs. Copy the file, pass your data from the route handler, it renders a complete page. The layout, the navigation, the flash messages, the form styling — all handled.


## 5. Simplicity over beauty

Safir uses one color palette (zinc), one font (Inter), one border radius (rounded-md), one shadow depth (shadow-sm). These are not configurable.

This is a feature.

Every decision you don't have to make is time saved. "Should the border be zinc-200 or zinc-300?" doesn't matter. Pick one, be consistent, ship the product.

If you need a polished, branded UI later, you'll replace these components. That's fine. Safir is for getting from zero to working product, not for the final product.


## How it maps to the codebase

| Rule | Implementation |
|------|---------------|
| Props over composition | Every component uses a `Props` interface, data comes in as props |
| Max 1-3 sub-components | 28 components, 1 sub-component file total |
| HTML and classes | Slots accept raw HTML, Tailwind classes for layout |
| Things that just work | No setup, no providers, no config files |
| Simplicity over beauty | Hardcoded zinc palette, Inter font, single theme |
