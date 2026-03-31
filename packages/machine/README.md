# @strav/machine

State machine for the [Strav](https://www.npmjs.com/package/@strav/core) framework. Declarative state definitions with transitions, guards, side effects, and event emission.

## Install

```bash
bun add @strav/machine
```

Requires `@strav/core` as a peer dependency.

## Usage

### Define a Machine

```ts
import { defineMachine } from '@strav/machine'

const orderMachine = defineMachine({
  field: 'status',
  initial: 'pending',
  states: ['pending', 'processing', 'shipped', 'delivered', 'canceled'],
  transitions: {
    process: { from: 'pending', to: 'processing' },
    ship:    { from: 'processing', to: 'shipped' },
    deliver: { from: 'shipped', to: 'delivered' },
    cancel:  { from: ['pending', 'processing'], to: 'canceled' },
  },
  guards: {
    cancel: (order) => !order.locked,
  },
  effects: {
    ship: async (order) => {
      await sendShippingNotification(order)
    },
  },
  events: {
    ship:    'order:shipped',
    deliver: 'order:delivered',
    cancel:  'order:canceled',
  },
})
```

### Standalone (Any Object)

```ts
const order = { status: 'pending', id: 1, locked: false }

orderMachine.state(order)                 // 'pending'
orderMachine.is(order, 'pending')         // true
orderMachine.can(order, 'process')        // true
orderMachine.can(order, 'ship')           // false
orderMachine.availableTransitions(order)  // ['process', 'cancel']

await orderMachine.apply(order, 'process')
// order.status === 'processing'
```

### ORM Mixin

```ts
import { BaseModel } from '@strav/core/orm'
import { stateful } from '@strav/machine'

class Order extends stateful(BaseModel, orderMachine) {
  declare id: number
  declare status: string
}

const order = await Order.find(1)
order.is('pending')               // true
order.can('ship')                 // false
order.availableTransitions()      // ['process', 'cancel']

await order.transition('process')
// validates → mutates → saves → emits event

// Query helpers
const shipped = await Order.inState('shipped').get()
const active = await Order.inState(['processing', 'shipped']).get()
```

## Features

- **Guards** — sync or async functions that must return `true` for a transition to proceed
- **Effects** — side effects that run after the state is mutated (before persistence in the mixin)
- **Events** — automatic `Emitter.emit()` after transitions complete
- **Composable** — works with `compose()` alongside other mixins like `searchable()`

## Documentation

See the full [Machine guide](../../guides/machine.md).

## License

MIT
