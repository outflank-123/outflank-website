import Projects from '@/components/Projects';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Work | Aluxa',
  description: 'Selected real products, websites and systems I have built.',
};

export default function WorkPage() {
  return (
    <main className="flex min-h-screen flex-col pt-12 bg-slate-50">
      <Projects />
      
      {/* Bottom CTA */}
      <section className="py-24 relative border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
            Have a project in mind?
          </h2>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 text-white px-8 py-4 font-semibold hover:bg-slate-800 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
          >
            Let's Talk
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </main>
  );
}
