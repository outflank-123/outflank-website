"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MessageCircle, Send, CheckCircle2, AlertCircle, MapPin } from 'lucide-react';
import { siteConfig } from '@/lib/site-config';

export default function Contact() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData.entries());
    
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setStatus('success');
        (e.target as HTMLFormElement).reset();
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }

    setTimeout(() => setStatus('idle'), 4000);
  };

  const contactMethods = [
    { icon: Mail, label: "Sales & Inquiries", value: siteConfig.email, href: `mailto:${siteConfig.email}` },
    { icon: Phone, label: "Direct Phone", value: siteConfig.phone, href: `tel:${siteConfig.phone}` },
    { icon: MessageCircle, label: "WhatsApp Support", value: siteConfig.phone, href: siteConfig.whatsapp },
    { icon: MapPin, label: "Head Office", value: "New Delhi, India", href: "#" },
  ];

  return (
    <section id="contact" className="pt-20 pb-16 md:py-24 relative overflow-hidden bg-[#fafafa]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <p className="text-xs font-bold uppercase tracking-widest text-[#e3231c] mb-3">Get in Touch</p>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-[#1d1d1f] tracking-tight mb-4"
          >
            Start Your Corporate <br className="hidden sm:block" />
            <span className="text-[#e3231c]">Gifting Project</span>
          </motion.h1>
          <p className="text-base md:text-lg text-[#6e6e73] max-w-xl mx-auto">
            Looking for customized joining kits, team apparel, or executive client hampers? Our corporate gifting specialists are here to help.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          
          {/* Contact Info Sidebar */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="order-2 lg:order-1 lg:col-span-4 flex flex-col gap-4"
          >
            {contactMethods.map((method, index) => {
              const Icon = method.icon;
              return (
                <a 
                  key={index}
                  href={method.href}
                  target={method.href.startsWith("http") ? "_blank" : undefined}
                  rel={method.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="group flex items-center gap-4 p-5 rounded-2xl bg-white border border-black/5 hover:border-[#e3231c]/20 transition-all shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(227,35,28,0.08)] hover:-translate-y-0.5"
                >
                  <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-[#e3231c] group-hover:bg-[#e3231c] group-hover:text-white transition-all duration-300">
                    <Icon size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-[#86868b] uppercase tracking-wider">{method.label}</h4>
                    <p className="text-sm md:text-base font-bold text-[#1d1d1f] group-hover:text-[#e3231c] transition-colors">
                      {method.value}
                    </p>
                  </div>
                </a>
              );
            })}
          </motion.div>

          {/* Contact Form */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="order-1 lg:order-2 lg:col-span-8 bg-white border border-black/8 rounded-3xl p-8 sm:p-10 shadow-sm relative"
          >
            <h3 className="text-2xl font-bold text-[#1d1d1f] mb-2">Request a Corporate Quote</h3>
            <p className="text-sm text-[#6e6e73] mb-6">Fill in the details below and our team will get back to you within 2-4 business hours.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Your Name *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-4 py-3 rounded-xl border border-black/10 text-sm focus:outline-none focus:border-[#e3231c] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Company / Organization *</label>
                  <input
                    type="text"
                    name="company"
                    required
                    placeholder="e.g. Acme Technologies"
                    className="w-full px-4 py-3 rounded-xl border border-black/10 text-sm focus:outline-none focus:border-[#e3231c] transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Work Email *</label>
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="rahul@company.com"
                    className="w-full px-4 py-3 rounded-xl border border-black/10 text-sm focus:outline-none focus:border-[#e3231c] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Phone / WhatsApp *</label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    placeholder="+91 98765 43210"
                    className="w-full px-4 py-3 rounded-xl border border-black/10 text-sm focus:outline-none focus:border-[#e3231c] transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Product Category</label>
                  <select
                    name="category"
                    className="w-full px-4 py-3 rounded-xl border border-black/10 text-sm focus:outline-none focus:border-[#e3231c] bg-white transition-colors"
                  >
                    <option value="Apparel & T-Shirts">Apparel & T-Shirts</option>
                    <option value="Joining Kits & Gift Sets">Joining Kits & Gift Sets</option>
                    <option value="Drinkware & Bottles">Drinkware & Bottles</option>
                    <option value="Tech & Mobile Accessories">Tech & Mobile Accessories</option>
                    <option value="Audio & Desk Lighting">Audio & Desk Lighting</option>
                    <option value="Eco-Friendly & Sustainable">Eco-Friendly & Sustainable</option>
                    <option value="Office & Desk Essentials">Office & Desk Essentials</option>
                    <option value="Multiple / Custom Project">Multiple / Custom Project</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Estimated Quantity</label>
                  <input
                    type="number"
                    name="quantity"
                    min="20"
                    defaultValue="50"
                    className="w-full px-4 py-3 rounded-xl border border-black/10 text-sm focus:outline-none focus:border-[#e3231c] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Project Details / Customization Requirements</label>
                <textarea
                  name="message"
                  rows={3}
                  placeholder="Mention any specific logo requirements, delivery timeline, or packaging preferences..."
                  className="w-full px-4 py-3 rounded-xl border border-black/10 text-sm focus:outline-none focus:border-[#e3231c] transition-colors"
                />
              </div>

              {/* Honeypot */}
              <input type="text" name="_gotcha" className="hidden" tabIndex={-1} autoComplete="off" />

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#e3231c] text-white px-8 py-3 text-sm font-bold shadow-[0_4px_14px_rgba(227,35,28,0.3)] hover:bg-[#c91d17] hover:shadow-[0_6px_20px_rgba(227,35,28,0.4)] transition-all duration-200 disabled:opacity-50"
              >
                {status === 'loading' ? (
                  <>Sending Inquiry...</>
                ) : status === 'success' ? (
                  <>
                    <CheckCircle2 size={16} /> Inquiry Submitted!
                  </>
                ) : status === 'error' ? (
                  <>
                    <AlertCircle size={16} /> Something went wrong. Try again.
                  </>
                ) : (
                  <>
                    <Send size={16} /> Submit Corporate Inquiry
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
