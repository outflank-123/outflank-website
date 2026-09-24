import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { FileText, Shield, Truck, CreditCard, RotateCcw, AlertCircle, MapPin, Mail, Phone } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Terms of Service | Outflank Corporate Gifting',
  description: 'Terms and conditions governing purchases, customized orders, payment, shipping, and returns on outflank.in.',
}

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-[#f5f5f7] pt-24 pb-20 text-[#1d1d1f] font-sans antialiased">
      {/* Hero Header */}
      <div className="bg-white border-b border-slate-200/80 py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-5 md:px-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200 mb-4">
            <FileText size={14} className="text-[#e3231c]" />
            <span>Commercial Terms & User Agreement</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">
            Terms of Service
          </h1>
          <p className="text-slate-600 text-sm md:text-base leading-relaxed">
            Effective Date: January 1, 2026 • Last Updated: September 24, 2026
          </p>
          <p className="text-slate-500 text-xs mt-2">
            These Terms of Service govern your use of the website outflank.in and all purchases made through Outflank Trading Pvt Ltd.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-5 md:px-8 py-10 space-y-10">
        {/* Section 1: Acceptance */}
        <section className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <span className="text-[#e3231c]">1.</span> Acceptance of Terms
          </h2>
          <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
            <p>
              By accessing, browsing, submitting inquiries, or purchasing products on <Link href="/" className="text-[#e3231c] underline font-medium">outflank.in</Link> (the &quot;Site&quot;), you acknowledge that you have read, understood, and agree to be legally bound by these Terms of Service and our Privacy Policy.
            </p>
            <p>
              If you are placing an order on behalf of a corporate entity, organization, or institution, you represent and warrant that you have full legal authority to bind such entity to these Terms.
            </p>
          </div>
        </section>

        {/* Section 2: Product Specifications & Customization */}
        <section className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <span className="text-[#e3231c]">2.</span> Customization & Artwork Approvals
          </h2>
          <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
            <p>
              Outflank specializes in institutional and bespoke merchandise, corporate joining kits, precision drinkware, and premium customized apparel.
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-700">
              <li>
                <strong>Client Artwork & Trademarks:</strong> By uploading or submitting logos, typography, or trademark assets for customization, the client warrants that they hold legitimate intellectual property rights to utilize such marks.
              </li>
              <li>
                <strong>Digital Proofs:</strong> Prior to bulk manufacturing or embroidery/printing, Outflank provides digital mockups or virtual proofs. Once approved by the client in writing or via electronic sign-off, production commences based on the approved specifications.
              </li>
              <li>
                <strong>Color Variations:</strong> Minor variations in substrate shade, pantone translation on textiles, or metallic finishes may occur due to industrial production processes.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 3: Pricing, Taxation & Payments */}
        <section className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <span className="text-[#e3231c]">3.</span> Pricing, Billing & Payment Processing
          </h2>
          <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
            <p>
              All prices listed on the site are in Indian Rupees (₹ INR). Goods and Services Tax (GST) is calculated and itemized during checkout in full compliance with Indian tax law.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                <CreditCard className="text-emerald-600 shrink-0 mt-0.5" size={18} />
                <span className="text-xs text-slate-700">Online payments are securely processed via Razorpay. We do not store credit/debit card numbers.</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                <FileText className="text-blue-600 shrink-0 mt-0.5" size={18} />
                <span className="text-xs text-slate-700">B2B clients can provide their GSTIN during checkout to receive official tax input credit invoices.</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Shipping & Fulfillment */}
        <section className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <span className="text-[#e3231c]">4.</span> Shipping & Delivery Timelines
          </h2>
          <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
            <p>
              We partner with national premier logistics providers, including <strong>Shadowfax Technologies</strong>, to provide scheduled PAN-India dispatch.
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-700">
              <li>
                <strong>Dispatch Timelines:</strong> Standard retail orders are dispatched within 24–48 business hours. Customized corporate orders follow agreed production schedules (typically 3–7 business days).
              </li>
              <li>
                <strong>Tracking:</strong> Upon dispatch, an official Airway Bill (AWB) number and live tracking link are issued and delivered via WhatsApp and email.
              </li>
              <li>
                <strong>Delivery Attempts:</strong> Couriers make up to three delivery attempts. Clients are responsible for ensuring accurate address details and contact numbers.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 5: Cancellations, Returns & Replacements */}
        <section className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <span className="text-[#e3231c]">5.</span> Returns, Replacements & Cancellations
          </h2>
          <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/60">
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-1">Customized & Personalized Goods</h4>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Due to the individualized nature of customized products bearing client logos or custom branding, orders cannot be cancelled or returned once physical production has commenced, except in the event of documented manufacturing defects or damage sustained in transit.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">Transit Damage & Defect Claims</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Any claim regarding broken or defective merchandise must be reported to <a href="mailto:info@outflank.in" className="text-[#e3231c] underline font-semibold">info@outflank.in</a> within <strong>48 hours of delivery</strong> accompanied by photos/video proof. Outflank will immediately initiate a replacement at zero additional cost.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 6: Limitation of Liability & Governing Law */}
        <section className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <span className="text-[#e3231c]">6.</span> Governing Law & Jurisdiction
          </h2>
          <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
            <p>
              These Terms and any separate agreements whereby we provide you services shall be governed by and construed in accordance with the laws of the <strong>Republic of India</strong>.
            </p>
            <p>
              Any disputes, controversies, or claims arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction of the competent courts in <strong>New Delhi, India</strong>.
            </p>
          </div>
        </section>

        {/* Section 7: Company Details */}
        <section className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <span className="text-[#e3231c]">7.</span> Contact & Corporate Office
          </h2>
          <div className="text-sm text-slate-600 space-y-2 leading-relaxed">
            <p className="font-bold text-slate-900">Outflank Trading Pvt Ltd</p>
            <p className="flex items-center gap-2 text-xs text-slate-700"><MapPin size={14} className="text-[#e3231c]" /> New Delhi, India</p>
            <p className="flex items-center gap-2 text-xs text-slate-700"><Mail size={14} className="text-[#e3231c]" /> <a href="mailto:info@outflank.in" className="text-[#e3231c] underline font-medium">info@outflank.in</a></p>
            <p className="flex items-center gap-2 text-xs text-slate-700"><Phone size={14} className="text-[#e3231c]" /> +91 99999 26273</p>
          </div>
        </section>
      </div>
    </main>
  )
}
