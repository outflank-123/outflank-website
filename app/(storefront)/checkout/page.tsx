import { Metadata } from 'next'
import CheckoutClient from './CheckoutClient'

export const metadata: Metadata = {
  title: 'Checkout | Outflank',
  description: 'Complete your purchase securely.',
}

export default function CheckoutPage() {
  return <CheckoutClient />
}
