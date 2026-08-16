import Image from 'next/image';
import Link from 'next/link';
import { siteConfig } from '@/lib/site-config';
import { GitBranch, Briefcase, Mail, MessageCircle } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-slate-50 py-12 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-200/30 blur-[100px] rounded-full pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          
          <div className="lg:col-span-2">
            <Link 
              href="/" 
              className="flex items-center gap-2 mb-4"
            >
              <Image src="/logo/logo_only.png" alt="Aluxa Logo" width={32} height={32} className="w-8 h-8 object-contain" />
              <span className="text-2xl font-bold tracking-tight text-slate-900">Aluxa</span>
            </Link>
            <p className="text-slate-600 mb-6 max-w-sm">
              Designing and building high-performance, production-ready digital products and websites.
            </p>
            <div className="flex gap-4">
              <a href={`mailto:${siteConfig.email}`} className="text-slate-500 hover:text-indigo-600 transition-colors p-2 -ml-2 rounded-lg hover:bg-slate-200/50">
                <Mail size={20} />
                <span className="sr-only">Email</span>
              </a>

              <a href={siteConfig.github} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-indigo-600 transition-colors p-2 rounded-lg hover:bg-slate-200/50">
                <GitBranch size={20} />
                <span className="sr-only">GitHub</span>
              </a>
              <a href={siteConfig.whatsapp} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-indigo-600 transition-colors p-2 rounded-lg hover:bg-slate-200/50">
                <MessageCircle size={20} />
                <span className="sr-only">WhatsApp</span>
              </a>
            </div>
          </div>

        </div>

        <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-slate-200">
          <p className="text-slate-500 text-sm mb-4 md:mb-0">
            © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Built with</span>
            <div className="flex gap-2 items-center text-slate-900 font-medium">
              <span className="px-2 py-1 rounded bg-slate-200">Next.js 16</span>
              <span className="px-2 py-1 rounded bg-slate-200">Tailwind</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
