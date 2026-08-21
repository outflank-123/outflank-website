import Contact from '@/components/Contact';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact | Aluxa',
  description: 'Get in touch to start building your next digital product.',
};

export default function ContactPage() {
  return (
    <main className="flex min-h-screen flex-col pt-24 bg-slate-50">
      <Contact />
    </main>
  );
}
