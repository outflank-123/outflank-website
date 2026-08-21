import Services from '@/components/Services';
import TechStack from '@/components/TechStack';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Services & Tech | Aluxa',
  description: 'What I can build and the modern technologies I use.',
};

export default function ServicesPage() {
  return (
    <main className="flex min-h-screen flex-col pt-24 bg-slate-50">
      <Services />
      <TechStack />
    </main>
  );
}
