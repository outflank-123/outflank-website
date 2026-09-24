import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldCheck, Lock, Trash2, Mail, Phone, MapPin, Eye, FileText, CheckCircle2 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Privacy Policy | Outflank Corporate Gifting',
  description: 'Learn how Outflank collects, protects, uses, and deletes personal information across our website and WhatsApp Business services.',
}

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#f5f5f7] pt-24 pb-20 text-[#1d1d1f] font-sans antialiased">
      {/* Hero Header */}
      <div className="bg-white border-b border-slate-200/80 py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-5 md:px-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-[#e3231c] border border-red-200/60 mb-4">
            <ShieldCheck size={14} />
            <span>Official Privacy & Data Protection Policy</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">
            Privacy Policy
          </h1>
          <p className="text-slate-600 text-sm md:text-base leading-relaxed">
            Effective Date: January 1, 2026 • Last Updated: September 24, 2026
          </p>
          <p className="text-slate-500 text-xs mt-2">
            Outflank Trading Pvt Ltd (&quot;Outflank&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is committed to protecting your privacy and ensuring transparency in how your data is handled.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-5 md:px-8 py-10 space-y-12">
        {/* Quick Summary Card */}
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Lock className="text-[#e3231c]" size={20} />
            Summary of Our Data Commitments
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xs font-semibold text-slate-900 mb-1">No Third-Party Selling</p>
              <p className="text-xs text-slate-500">We never sell, rent, or monetize your contact or business information to third parties.</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xs font-semibold text-slate-900 mb-1">WhatsApp Verified</p>
              <p className="text-xs text-slate-500">WhatsApp notifications and OTPs are routed strictly via official Meta Cloud API with end-to-end security.</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xs font-semibold text-slate-900 mb-1">User Control</p>
              <p className="text-xs text-slate-500">You can opt out of messages or request permanent deletion of your customer records anytime.</p>
            </div>
          </div>
        </div>

        {/* Section 1: Information We Collect */}
        <section className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <span className="text-[#e3231c]">1.</span> Information We Collect
          </h2>
          <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
            <p>
              When you browse our storefront (<Link href="/" className="text-[#e3231c] underline font-medium">outflank.in</Link>), submit a corporate gifting requisition, customize products, or place an order, we may collect the following categories of information:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-700">
              <li>
                <strong>Contact Information:</strong> Full name, corporate email address, business mobile number, company name, GSTIN (optional for business tax invoices), and job title.
              </li>
              <li>
                <strong>Shipping & Delivery Details:</strong> Physical delivery address, pincode, city, state, recipient contact name, and delivery notes.
              </li>
              <li>
                <strong>Order & Customization Data:</strong> Products selected, customization preferences, uploaded company logo assets, order notes, and transaction identifiers.
              </li>
              <li>
                <strong>Authentication & Profile:</strong> Firebase UID, phone authentication records, and session data for registered accounts.
              </li>
              <li>
                <strong>Technical & Usage Data:</strong> IP address, device type, browser information, and referral sources to optimize storefront loading speed and ensure platform security.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 2: How We Use Your Information */}
        <section className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <span className="text-[#e3231c]">2.</span> How We Use Your Information
          </h2>
          <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
            <p>We process your data exclusively for legitimate operational purposes:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <span>Processing orders, billing, and generating tax-compliant GST invoices.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <span>Coordinating order fulfillment, packaging, and logistics dispatch via Shadowfax.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <span>Sending automated order confirmations, AWB tracking links, and delivery notifications via WhatsApp.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <span>Responding to corporate gifting quotations, mockup requests, and sample inquiries.</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: WhatsApp Business API & Meta Cloud Messaging */}
        <section className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <span className="text-[#e3231c]">3.</span> WhatsApp Messaging & Meta Cloud API Policy
          </h2>
          <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
            <p>
              Outflank utilizes the official <strong>Meta WhatsApp Cloud API</strong> (operated by Meta Platforms, Inc.) to deliver verified transactional messages, one-time passwords (OTP), dispatch tracking, and occasional corporate catalog announcements.
            </p>
            <p>
              <strong>Customer Opt-Out & Controls:</strong> You may opt out of receiving non-transactional marketing announcements at any time by replying &quot;STOP&quot; to our WhatsApp message or emailing us at <a href="mailto:info@outflank.in" className="text-[#e3231c] underline font-medium">info@outflank.in</a>. Transactional alerts (e.g. OTPs and payment receipts) are sent strictly to fulfill customer orders.
            </p>
          </div>
        </section>

        {/* Section 4: Data Sharing & Third-Party Service Providers */}
        <section className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <span className="text-[#e3231c]">4.</span> Trusted Third-Party Service Providers
          </h2>
          <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
            <p>We share minimal required data with trusted technical partners to deliver our services:</p>
            <ul className="list-disc pl-5 space-y-2 text-slate-700">
              <li><strong>Meta Platforms, Inc.:</strong> For routing WhatsApp notifications via the Cloud API.</li>
              <li><strong>Shadowfax Technologies:</strong> For scheduled courier pickup, shipping label generation, and PAN-India parcel delivery.</li>
              <li><strong>Razorpay:</strong> For processing online payments (UPI, credit/debit cards, net banking). We never store your card numbers or CVV.</li>
              <li><strong>Supabase & Google Cloud:</strong> For encrypted database hosting and image storage.</li>
            </ul>
          </div>
        </section>

        {/* Section 5: USER DATA DELETION INSTRUCTIONS (Anchored) */}
        <section id="data-deletion" className="bg-white p-6 md:p-8 rounded-2xl border-2 border-red-200/80 shadow-sm space-y-5 scroll-mt-28">
          <div className="flex items-center gap-3 border-b border-red-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-[#e3231c] shrink-0">
              <Trash2 size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                5. User Data Deletion Instructions
              </h2>
              <p className="text-xs text-slate-500">
                In compliance with Meta Platform Policies and Indian Information Technology regulations.
              </p>
            </div>
          </div>

          <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
            <p>
              Under global data privacy standards and Meta&apos;s Developer Data Deletion guidelines, users have the right to request the permanent deletion of their personal information, authentication identifiers, uploaded logos, and associated records held by Outflank.
            </p>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">How to Request Immediate Data Deletion:</p>
              <ol className="list-decimal pl-5 space-y-1.5 text-xs text-slate-600">
                <li>
                  Send an email to our dedicated data privacy desk at{' '}
                  <a href="mailto:info@outflank.in?subject=User%20Data%20Deletion%20Request" className="text-[#e3231c] font-semibold underline">
                    info@outflank.in
                  </a>{' '}
                  with the subject line: <strong>&quot;User Data Deletion Request&quot;</strong>.
                </li>
                <li>
                  Include your <strong>registered phone number</strong> or <strong>email address</strong> used during checkout or login.
                </li>
                <li>
                  Our Data Protection Officer will verify your request, purge your account records, phone number, and uploaded custom brand assets from our active databases within <strong>48 hours</strong>, and send you written confirmation.
                </li>
              </ol>
            </div>

            <p className="text-xs text-slate-500">
              <em>Note: Basic financial transaction records (such as completed GST tax invoices) are retained strictly as required by Indian taxation and company law for mandatory statutory audit periods.</em>
            </p>
          </div>
        </section>

        {/* Section 6: Security & Retention */}
        <section className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <span className="text-[#e3231c]">6.</span> Data Security & Storage
          </h2>
          <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
            <p>
              All communication between your browser and our servers is encrypted using 256-bit SSL/TLS protocol. Administrative access to customer details is protected by strict role-based access controls and multi-factor authentication.
            </p>
          </div>
        </section>

        {/* Section 7: Contact Us */}
        <section className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <span className="text-[#e3231c]">7.</span> Grievance Officer & Contact Information
          </h2>
          <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
            <p>For any questions, concerns, or privacy grievances, please contact our Data Governance Officer:</p>
            <div className="mt-3 p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs text-slate-700">
              <p className="font-bold text-slate-900">Outflank Trading Pvt Ltd</p>
              <p className="flex items-center gap-2"><MapPin size={14} className="text-[#e3231c]" /> New Delhi, India</p>
              <p className="flex items-center gap-2"><Mail size={14} className="text-[#e3231c]" /> <a href="mailto:info@outflank.in" className="text-[#e3231c] underline font-medium">info@outflank.in</a></p>
              <p className="flex items-center gap-2"><Phone size={14} className="text-[#e3231c]" /> +91 99999 26273</p>
              <p className="flex items-center gap-2"><FileText size={14} className="text-[#e3231c]" /> CIN / Trade Registry Available upon request</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
