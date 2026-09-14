'use client';

import { Printer } from 'lucide-react';
import { useEffect } from 'react';

export default function PrintInvoiceButton() {
  // Optionally auto-print when the page loads
  useEffect(() => {
    // Only auto-print if they specifically came here to download
    const isAutoPrint = new URLSearchParams(window.location.search).get('print');
    if (isAutoPrint === 'true') {
      setTimeout(() => window.print(), 500);
    }
  }, []);

  return (
    <button 
      onClick={() => window.print()}
      className="flex items-center gap-2 bg-[#1d1d1f] text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-black transition-colors"
    >
      <Printer size={16} />
      Save as PDF
    </button>
  );
}
