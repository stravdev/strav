# Components

28 Vue 3 components organized in 5 groups. All use `<script setup lang="ts">`, CVA for variants, and `cn()` for class merging.


## Foundation

### Button

```html
<Button>Default</Button>
<Button variant="destructive" size="sm">Delete</Button>
<Button variant="outline" :loading="saving">Save</Button>
<Button variant="ghost" size="icon">X</Button>
```

| Prop | Type | Default |
|------|------|---------|
| variant | `default` \| `destructive` \| `outline` \| `secondary` \| `ghost` \| `link` | `default` |
| size | `default` \| `sm` \| `lg` \| `icon` | `default` |
| type | `button` \| `submit` \| `reset` | `button` |
| disabled | boolean | `false` |
| loading | boolean | `false` |

When `loading` is true, a Spinner appears and the button is disabled.

### Badge

```html
<Badge>Default</Badge>
<Badge variant="secondary">Draft</Badge>
<Badge variant="destructive">Error</Badge>
```

| Prop | Type | Default |
|------|------|---------|
| variant | `default` \| `secondary` \| `destructive` \| `outline` | `default` |

### Input

```html
<Input v-model="email" label="Email" type="email" placeholder="you@example.com" />
<Input v-model="search" :icon="MagnifyingGlassIcon" placeholder="Search..." />
<Input v-model="name" label="Name" :error="errors.name" />
```

| Prop | Type | Default |
|------|------|---------|
| modelValue | string | — |
| label | string | — |
| error | string | — |
| icon | Component | — |
| type | string | `text` |
| placeholder | string | — |
| disabled | boolean | `false` |

When `label` is set, renders a `<label>` wired to the input. When `error` is set, renders a red error message below and changes the border color.

### Textarea

```html
<Textarea v-model="bio" label="Bio" :rows="4" placeholder="Tell us about yourself" />
```

Same props as Input (minus `icon` and `type`), plus `rows` (default: 3).

### Label

```html
<Label for="name" required>Full Name</Label>
```

| Prop | Type | Default |
|------|------|---------|
| for | string | — |
| required | boolean | `false` |

When `required` is true, shows a red asterisk.

### Card

```html
<Card title="Team" description="Manage members.">
  <p>Card content here.</p>
  <template #footer>
    <Button variant="outline">Invite</Button>
  </template>
</Card>
```

| Prop | Type | Default |
|------|------|---------|
| title | string | — |
| description | string | — |

Slots: `default` (body), `footer`. Header and footer sections only render when content is provided.

### Spinner

```html
<Spinner />
<Spinner size="lg" />
```

| Prop | Type | Default |
|------|------|---------|
| size | `sm` \| `default` \| `lg` | `default` |

### Divider

```html
<Divider />
<Divider label="or continue with" />
```

| Prop | Type | Default |
|------|------|---------|
| label | string | — |

Without label: renders `<hr>`. With label: renders a centered text on a line.

### Kbd

```html
<Kbd>Ctrl+K</Kbd>
```

No props. Slot only.


## Form Controls

### Checkbox

```html
<Checkbox v-model="agree" label="I agree to the terms" description="You must accept." />
```

| Prop | Type | Default |
|------|------|---------|
| modelValue | boolean | — |
| label | string | — |
| description | string | — |
| disabled | boolean | `false` |

### Radio

```html
<Radio
  v-model="plan"
  label="Select plan"
  :options="[
    { value: 'free', label: 'Free', description: '10 projects' },
    { value: 'pro', label: 'Pro', description: 'Unlimited' }
  ]"
/>
```

| Prop | Type | Default |
|------|------|---------|
| modelValue | string | — |
| options | `{ value, label, description? }[]` | required |
| label | string | — |
| disabled | boolean | `false` |

### Switch

```html
<Switch v-model="notifications" label="Email notifications" description="Receive updates" />
```

| Prop | Type | Default |
|------|------|---------|
| modelValue | boolean | — |
| label | string | — |
| description | string | — |
| disabled | boolean | `false` |

### Select

```html
<Select v-model="country" label="Country" :options="['France', 'Madagascar', 'Japan']" />
<Select v-model="role" :options="[{ value: 'admin', label: 'Admin' }, { value: 'user', label: 'User' }]" />
```

| Prop | Type | Default |
|------|------|---------|
| modelValue | string | — |
| options | `string[]` \| `{ value, label }[]` | required |
| label | string | — |
| error | string | — |
| placeholder | string | — |
| disabled | boolean | `false` |

Uses native `<select>` with custom styling. Accepts both string arrays and object arrays.

### Progress

```html
<Progress :value="72" label="Upload" show-value />
<Progress :value="30" color="warning" size="sm" />
```

| Prop | Type | Default |
|------|------|---------|
| value | number (0-100) | required |
| size | `sm` \| `default` \| `lg` | `default` |
| color | `default` \| `success` \| `warning` \| `destructive` | `default` |
| label | string | — |
| showValue | boolean | `false` |


## Display & Feedback

### Alert

```html
<Alert title="Payment failed" variant="destructive" show-icon dismissible @dismiss="clear">
  <p>Please check your billing information.</p>
</Alert>
```

| Prop | Type | Default |
|------|------|---------|
| title | string | — |
| variant | `default` \| `info` \| `success` \| `warning` \| `destructive` | `default` |
| showIcon | boolean | `false` |
| icon | Component | auto per variant |
| dismissible | boolean | `false` |

When `showIcon` is true, an appropriate Heroicon is shown per variant. Override with `icon` prop.

### Avatar

```html
<Avatar src="/avatar.jpg" name="Alice Martin" size="lg" />
```

| Prop | Type | Default |
|------|------|---------|
| src | string | — |
| alt | string | — |
| name | string | — |
| size | `sm` \| `default` \| `lg` | `default` |

Falls back to initials from `name` when image fails to load.

### Skeleton

```html
<Skeleton width="200px" height="20px" />
<Skeleton width="40px" height="40px" rounded="full" />
```

| Prop | Type | Default |
|------|------|---------|
| width | string | — |
| height | string | — |
| rounded | `none` \| `sm` \| `default` \| `full` | `default` |

### EmptyState

```html
<EmptyState title="No projects" description="Create your first project." :icon="FolderPlusIcon">
  <Button>Create Project</Button>
</EmptyState>
```

| Prop | Type | Default |
|------|------|---------|
| title | string | required |
| description | string | — |
| icon | Component | — |

Slot: `default` for action buttons.

### Toast

Programmatic toast system. Two parts:

```ts
// In your component
import { useToast } from '@strav/safir'

const { toast } = useToast()
toast({ title: 'Saved', variant: 'success' })
toast({ title: 'Error', description: 'Something failed.', variant: 'destructive' })
```

```html
<!-- Once in your app root or layout island -->
<ToastContainer />
```

Toast options:

| Option | Type | Default |
|--------|------|---------|
| title | string | required |
| description | string | — |
| variant | `default` \| `success` \| `destructive` | `default` |
| duration | number (ms) | `5000` |

### Tooltip

```html
<Tooltip content="Copy to clipboard" side="top">
  <Button variant="ghost" size="icon">...</Button>
</Tooltip>
```

| Prop | Type | Default |
|------|------|---------|
| content | string | required |
| side | `top` \| `bottom` \| `left` \| `right` | `top` |

Appears on hover and focus. CSS-only positioning, no JavaScript library.


## Overlays & Navigation

### Dialog

```html
<Dialog v-model="open" title="Delete project?" description="This cannot be undone.">
  <p>All data will be removed.</p>
  <template #footer>
    <Button variant="outline" @click="open = false">Cancel</Button>
    <Button variant="destructive" @click="remove">Delete</Button>
  </template>
</Dialog>
```

| Prop | Type | Default |
|------|------|---------|
| modelValue | boolean | required |
| title | string | — |
| description | string | — |

Slots: `default` (body), `footer` (action buttons). Closes on Escape key and backdrop click. Locks body scroll.

### Drawer

```html
<Drawer v-model="showFilters" title="Filters" side="right">
  <div class="space-y-4">...</div>
  <template #footer>
    <Button @click="apply">Apply</Button>
  </template>
</Drawer>
```

| Prop | Type | Default |
|------|------|---------|
| modelValue | boolean | required |
| title | string | — |
| description | string | — |
| side | `left` \| `right` | `right` |

Same API shape as Dialog. Slides in from the edge.

### Dropdown

```html
<Dropdown
  :items="[
    { label: 'Edit', icon: PencilIcon, action: 'edit' },
    { separator: true },
    { label: 'Delete', icon: TrashIcon, action: 'delete' }
  ]"
  @select="handleAction"
>
  <Button variant="ghost" size="icon">...</Button>
</Dropdown>
```

| Prop | Type | Default |
|------|------|---------|
| items | `{ label?, icon?, action?, disabled?, separator? }[]` | required |
| align | `left` \| `right` | `left` |

Emits `select` with the clicked item. Closes on click outside.

### Tabs

```html
<Tabs v-model="tab" :tabs="[{ key: 'general', label: 'General' }, { key: 'security', label: 'Security' }]">
  <template #tab-general>...</template>
  <template #tab-security>...</template>
</Tabs>
```

| Prop | Type | Default |
|------|------|---------|
| modelValue | string | required |
| tabs | `{ key, label, icon?, disabled? }[]` | required |

Content for each tab goes in a `#tab-{key}` named slot.

### Breadcrumb

```html
<Breadcrumb :items="[{ label: 'Home', href: '/' }, { label: 'Projects', href: '/projects' }, { label: 'Safir' }]" />
```

| Prop | Type | Default |
|------|------|---------|
| items | `{ label, href?, icon? }[]` | required |
| separator | string | chevron icon |

Last item renders as plain text (current page), others as links.

### Pagination

```html
<Pagination v-model="page" :total="243" :per-page="20" />
```

| Prop | Type | Default |
|------|------|---------|
| modelValue | number | required |
| total | number | required |
| perPage | number | required |

Shows first/last page with ellipsis for large ranges.


## Data Display

### Table

```html
<Table
  :columns="[
    { key: 'name', label: 'Name', sortable: true },
    { key: 'role', label: 'Role' },
    { key: 'actions', label: '', width: '80px' }
  ]"
  :rows="users"
  :sort-by="sortBy"
  :sort-dir="sortDir"
  striped
  @sort="handleSort"
>
  <template #cell-role="{ row }">
    <Badge>{{ row.role }}</Badge>
  </template>
  <template #cell-actions="{ row }">
    <Button variant="ghost" size="sm">Edit</Button>
  </template>
  <template #empty>No users found.</template>
</Table>
```

| Prop | Type | Default |
|------|------|---------|
| columns | `{ key, label, sortable?, align?, width? }[]` | required |
| rows | `Record<string, any>[]` | required |
| sortBy | string | — |
| sortDir | `asc` \| `desc` | — |
| striped | boolean | `false` |
| hoverable | boolean | `true` |

Slots: `#cell-{key}` for custom cell rendering, `#empty` for empty state. Emits `sort` with column key.

### Collapse

```html
<Collapse v-model="open" title="What is Stravigor?">
  <p>A full-stack TypeScript framework built on Bun.</p>
</Collapse>
```

| Prop | Type | Default |
|------|------|---------|
| modelValue | boolean | — |
| title | string | required |
| icon | Component | — |

Use multiple Collapse components in sequence for an accordion pattern.
