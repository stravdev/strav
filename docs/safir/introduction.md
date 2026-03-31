# Introduction

Safir is the UI layer of the Stravigor ecosystem. It gives backend developers everything they need to build web applications without making design decisions.

Two parts:

1. **Vue components** (`src/`) — 28 props-first components for interactive UI
2. **Page stubs** (`stubs/`) — 25 ready-to-copy `.strav` templates for complete pages


## The problem

Building an MVP as a backend developer means:

- Spending hours choosing between sidebar vs topbar layouts
- Rebuilding login/register/forgot-password pages for the hundredth time
- Wrestling with component libraries that require 7 nested sub-components for a modal
- Googling "how to style a select dropdown" instead of shipping features
- Making 50 small design decisions that don't matter but still drain your energy

This is decision fatigue. Every hour spent on UI is an hour not spent on business logic.


## The solution

Safir eliminates these decisions:

**Need a login page?** Copy `stubs/auth/login.strav`. Form fields already match Bastion endpoints. Done.

**Need a dashboard?** Copy `stubs/app/dashboard.strav`. Pass your stats array. Done.

**Need a modal?** One component, three props:

```html
<Dialog v-model="open" title="Delete?" description="This cannot be undone.">
  <template #footer>
    <Button variant="outline" @click="open = false">Cancel</Button>
    <Button variant="destructive" @click="remove">Delete</Button>
  </template>
</Dialog>
```

No `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`. Just a Dialog.


## Who is this for

Backend developers building web applications with Stravigor. People who:

- Know what they want to build but don't want to design it
- Want to go from zero to working UI in minutes, not days
- Prefer writing server code over fiddling with CSS
- Need something that looks professional without being precious about it


## What Safir is not

- Not a design system for design teams. There are no Figma files, no design tokens, no color science.
- Not a comprehensive component library. If you need a date picker, calendar, or rich text editor, use a dedicated library.
- Not beautiful. It's clean and functional. Zinc palette, Inter font, consistent spacing. That's it.
