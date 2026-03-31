# @strav/workflow

Workflow orchestration for the [Strav](https://www.npmjs.com/package/@strav/core) framework. Build multi-step processes with sequential, parallel, conditional, and looping steps — plus saga-style compensation on failure.

## Install

```bash
bun add @strav/workflow
```

Requires `@strav/core` as a peer dependency.

## Usage

```ts
import { workflow } from '@strav/workflow'

const result = await workflow('order-process')
  .step('validate', async (ctx) => {
    return validateOrder(ctx.input.orderId)
  })
  .step('charge', async (ctx) => {
    return await chargeCard(ctx.results.validate.total)
  })
  .step('notify', async (ctx) => {
    return await sendConfirmation(ctx.results.charge.id)
  })
  .run({ orderId: 123 })

result.results.charge  // { id: 'ch_123', amount: 99.99 }
result.duration        // 342 (ms)
```

## Step Types

### Sequential

Steps run in order. Each step's return value is stored in `ctx.results[name]`.

```ts
workflow('pipeline')
  .step('fetch', async (ctx) => fetchData(ctx.input.url))
  .step('transform', async (ctx) => transform(ctx.results.fetch))
  .step('save', async (ctx) => save(ctx.results.transform))
  .run({ url: 'https://...' })
```

### Parallel

Run multiple handlers concurrently. Each result is stored under its name.

```ts
workflow('notify')
  .parallel('send', [
    { name: 'email', handler: async (ctx) => sendEmail(ctx) },
    { name: 'sms', handler: async (ctx) => sendSMS(ctx) },
    { name: 'push', handler: async (ctx) => sendPush(ctx) },
  ])
  .run({ userId: 1 })
```

### Route

Conditionally dispatch to a branch based on a resolver function.

```ts
workflow('support')
  .step('classify', async (ctx) => classifyTicket(ctx.input.text))
  .route(
    'handle',
    (ctx) => ctx.results.classify.category,
    {
      billing: async (ctx) => handleBilling(ctx),
      shipping: async (ctx) => handleShipping(ctx),
      technical: async (ctx) => handleTechnical(ctx),
    }
  )
  .run({ text: 'My payment failed' })
```

### Loop

Repeat a handler until a condition is met or max iterations reached.

```ts
workflow('refine')
  .loop('improve', async (input, ctx) => {
    return await improveQuality(input)
  }, {
    maxIterations: 5,
    until: (result) => result.score >= 0.95,
    feedback: (result) => result.data,
    mapInput: (ctx) => ctx.input.rawData,
  })
  .run({ rawData: '...' })
```

## Compensation (Saga Pattern)

Define rollback functions for steps. If a downstream step fails, compensation runs in reverse order.

```ts
workflow('order-saga')
  .step('reserve', async (ctx) => reserveInventory(ctx.input), {
    compensate: async (ctx) => releaseInventory(ctx.results.reserve),
  })
  .step('charge', async (ctx) => chargePayment(ctx.input), {
    compensate: async (ctx) => refundPayment(ctx.results.charge),
  })
  .step('ship', async (ctx) => scheduleShipping(ctx.input))
  .run({ orderId: 123 })

// If 'ship' fails → refundPayment → releaseInventory
```

## Documentation

See the full [Workflow guide](../../guides/workflow.md).

## License

MIT
