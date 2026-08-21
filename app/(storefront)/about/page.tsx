import About from '@/components/About';
import Process from '@/components/Process';
import WhyWorkWithMe from '@/components/WhyWorkWithMe';
import ClientFit from '@/components/ClientFit';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About | Aluxa',
  description: 'Developer, builder, problem solver. Learn about my process and who I work with.',
};

export default function AboutPage() {
  return (
    <main className="flex min-h-screen flex-col pt-24 bg-slate-50">
      <About />
      <Process />
      <WhyWorkWithMe />
      <ClientFit />
    </main>
  );
}
