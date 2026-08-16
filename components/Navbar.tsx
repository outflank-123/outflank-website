"use client";
// Force Turbopack cache invalidation
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Briefcase, Layers, User, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';

const navLinks = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Work', href: '/work', icon: Briefcase },
  { name: 'Services', href: '/services', icon: Layers },
  { name: 'About', href: '/about', icon: User },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* Top Navigation (Desktop + Mobile Logo) */}
      <div className="fixed top-2 md:top-6 inset-x-0 z-50 flex justify-center px-2 md:px-4 pointer-events-none">
        <nav 
          className={`pointer-events-auto transition-all duration-500 rounded-full flex items-center justify-between px-3 md:px-4 py-2 md:py-3 ${
            isScrolled 
              ? 'w-full md:max-w-5xl bg-white/20 backdrop-blur-[40px] border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.08)]' 
              : 'w-full md:max-w-7xl bg-white/10 backdrop-blur-2xl border border-white/40 shadow-sm'
          }`}
        >
          {/* Logo */}
          <Link 
            href="/" 
            className="flex items-center gap-2 pl-1 md:pl-2"
          >
            <Image src="/logo/logo_only.png" alt="Aluxa Logo" width={32} height={32} className="w-7 h-7 md:w-8 md:h-8 object-contain" />
            <span className="text-lg md:text-2xl font-bold tracking-tight text-slate-900">Aluxa</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1 bg-white/40 p-1 rounded-full border border-white/40 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)]">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`text-sm font-semibold transition-all px-5 py-2 rounded-full ${
                    isActive 
                      ? 'bg-white text-indigo-600 shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>
          
          {/* Desktop Call to Action */}
          <div className="hidden md:block">
            <Link
              href="/contact"
              className="px-6 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-full hover:bg-slate-800 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 inline-block"
            >
              Contact Us
            </Link>
          </div>

          {/* Mobile Contact Button (Top Right) */}
          <Link
            href="/contact"
            className="md:hidden px-3 py-1.5 bg-slate-900 text-white text-[10px] sm:text-xs font-semibold rounded-full shadow-md"
          >
            Contact Us
          </Link>
        </nav>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-4 inset-x-3 z-50">
        <nav className="bg-white/20 backdrop-blur-[40px] border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.1)] rounded-full px-1.5 py-1.5 flex items-center justify-between pointer-events-auto max-w-[400px] mx-auto">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
            const Icon = link.icon;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`relative flex flex-col items-center justify-center w-[20%] h-12 rounded-[1.25rem] transition-colors ${
                  isActive ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {isActive && (
                  <motion.div 
                    layoutId="mobile-nav-indicator"
                    className="absolute inset-0 bg-white/60 border border-white/60 shadow-sm rounded-[1.25rem] -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <Icon size={18} className="mb-0.5" strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[9px] font-semibold tracking-wide">{link.name}</span>
              </Link>
            );
          })}
          
          {/* Mobile Contact Nav Item */}
          <Link
            href="/contact"
            className={`relative flex flex-col items-center justify-center w-[20%] h-12 rounded-[1.25rem] transition-colors ${
              pathname === '/contact' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {pathname === '/contact' && (
              <motion.div 
                layoutId="mobile-nav-indicator"
                className="absolute inset-0 bg-white/60 border border-white/60 shadow-sm rounded-[1.25rem] -z-10"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <MessageSquare size={18} className="mb-0.5" strokeWidth={pathname === '/contact' ? 2.5 : 2} />
            <span className="text-[9px] font-semibold tracking-wide">Contact</span>
          </Link>
        </nav>
      </div>
    </>
  );
}
