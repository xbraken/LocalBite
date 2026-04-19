import Stripe from 'stripe'

declare global {
  // eslint-disable-next-line no-var
  var _stripe: Stripe | undefined
}

export const stripe = global._stripe ?? (global._stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY ?? '',
  { apiVersion: '2024-06-20' }
))
