import type { Metadata } from 'next'
import BrandingPreviewClient from './BrandingPreviewClient'

export const metadata: Metadata = {
  title: 'Branding Preview | Outflank Corporate Gifting',
  description: 'See your brand name and logo on our corporate gift products before you order. Live interactive preview tool.',
}

export default function BrandingPreviewPage() {
  return <BrandingPreviewClient />
}
