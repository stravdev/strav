# @strav/stripe

Stripe billing for the [Strav](https://www.npmjs.com/package/@strav/core) framework. Subscriptions, one-time charges, checkout sessions, invoices, payment methods, and webhooks.

## Install

```bash
bun add @strav/stripe
bun strav install stripe
```

Requires `@strav/core` as a peer dependency.

## Setup

```ts
import { StripeProvider } from '@strav/stripe'

app.use(new StripeProvider())
```

## Usage

```ts
import { stripe } from '@strav/stripe'

// Create a customer
const customer = await stripe.createOrGetCustomer(user)

// Start a subscription
const subscription = await stripe
  .newSubscription('default', 'price_xxx')
  .create(user)

// Checkout session
const checkout = await stripe
  .newCheckout()
  .item('price_xxx')
  .successUrl('/success')
  .cancelUrl('/cancel')
  .create(user)
```

## Billable Mixin

```ts
import { billable } from '@strav/stripe'

class User extends billable(BaseModel) {
  // adds subscription, invoice, and payment helpers
}
```

## Webhooks

```ts
import { stripeWebhook, onWebhookEvent } from '@strav/stripe'

onWebhookEvent('customer.subscription.updated', async (event) => {
  // handle subscription changes
})

router.post('/stripe/webhook', stripeWebhook())
```

## Documentation

See the full [Stripe billing guide](../../guides/stripe.md).

## License

MIT
