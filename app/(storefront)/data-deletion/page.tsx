import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Trash2, ShieldCheck, Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'User Data Deletion Instructions | Outflank',
  description: 'Instructions on how to request the permanent deletion of your personal data and account records from Outflank.',
}

export default function DataDeletionPage() {
  return (
    <main className="min-h-screen bg-[#f5f5f7] pt-24 pb-20 text-[#1d1d1f] font-sans antialiased">
      <div className="max-w-3xl mx-auto px-5 md:px-8 py-10 space-y-8">
        <Link
          href="/privacy-policy"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Privacy Policy
        </Link>

        <div className="bg-white p-6 md:p-10 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-[#e3231c]">
              <Trash2 size={24} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
                User Data Deletion Instructions
              </h1>
              <p className="text-xs text-slate-500">
                Compliant with Meta Developer Policies and Indian IT Rules
              </p>
            </div>
          </div>

          <div className="text-sm text-slate-600 space-y-4 leading-relaxed border-t border-slate-100 pt-5">
            <p>
              Outflank values your privacy. If you have registered an account, authenticated via WhatsApp OTP, Google, or Apple, or placed orders with us and wish to permanently erase your personal data from our servers, please follow the steps outlined below.
            </p>

            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200/80 space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Step-by-Step Data Removal Request:
              </h3>
              <ol className="list-decimal pl-5 space-y-2 text-xs text-slate-700">
                <li>
                  Compose an email from your registered email account to{' '}
                  <a
                    href="mailto:info@outflank.in?subject=Permanent%20User%20Data%20Deletion%20Request"
                    className="text-[#e3231c] font-bold underline"
                  >
                    info@outflank.in
                  </a>
                  .
                </li>
                <li>
                  Subject line:{' '}
                  <code className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-900 font-mono">
                    User Data Deletion Request
                  </code>
                </li>
                <li>
                  In the body of your message, state your <strong>full name</strong> and <strong>registered mobile number</strong> (used for WhatsApp notifications or checkout).
                </li>
                <li>
                  Our technical data governance team will confirm identity verification and purge your customer profile, authentication records, saved addresses, and uploaded brand assets within <strong>48 hours</strong>.
                </li>
              </ol>
            </div>

            <div className="flex items-start gap-2.5 p-4 rounded-xl bg-emerald-50 border border-emerald-200/80 text-xs text-emerald-900">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              <span>
                You will receive a formal confirmation email along with a reference tracking ID once your data has been permanently deleted from our active databases.
              </span>
            </div>

            <p className="text-xs text-slate-500">
              <em>
                Statutory Note: In accordance with Indian Goods and Services Tax (GST) and accounting regulations, historical tax invoices for fulfilled orders are archived securely for statutory legal audits and cannot be altered retrospectively.
              </em>
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-4 items-center justify-between">
            <a
              href="mailto:info@outflank.in?subject=Permanent%20User%20Data%20Deletion%20Request"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#e3231c] hover:bg-[#c91d17] text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Mail size={14} />
              Email Data Deletion Request
            </a>

            <div className="text-xs text-slate-500">
              Support Desk: <span className="font-semibold text-slate-900">+91 99999 26273</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
