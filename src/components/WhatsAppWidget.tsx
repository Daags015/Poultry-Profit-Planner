import React, { useState } from 'react';
import { Phone, X } from 'lucide-react';
import { useData } from '@/src/context/DataContext';

export function formatWhatsAppHref(phone: string, prefill?: string): string {
  const digits = phone.replace(/\D/g, '');
  const normalized =
    digits.startsWith('0') && digits.length === 11 ? `234${digits.slice(1)}` : digits;
  const msg = encodeURIComponent(
    prefill ||
      'Hello Poultry Profit Planner Admin, I would like assistance with my poultry farm plan.'
  );
  return `https://wa.me/${normalized}?text=${msg}`;
}

export const WhatsAppWidget: React.FC = () => {
  const { siteSettings } = useData();
  const phone = siteSettings.contact_phone || '08168779732';
  const [hovered, setHovered] = useState(false);
  const [calloutDismissed, setCalloutDismissed] = useState(false);

  const whatsappUrl = formatWhatsAppHref(phone);

  return (
    <div
      className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2 no-print"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Professional hover / dismissible prompt bubble */}
      {!calloutDismissed && (
        <div
          className={`flex items-center gap-2.5 rounded-xl border border-[#173F35]/15 bg-white px-3.5 py-2.5 shadow-lg transition-all duration-200 ${
            hovered
              ? 'opacity-100 translate-y-0'
              : 'hidden sm:flex opacity-95 translate-y-0'
          }`}
        >
          <div className="text-right">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-xs font-bold text-[#173F35] hover:underline whitespace-nowrap"
            >
              Chat with Admin
            </a>
            <a
              href={`tel:${phone}`}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-[#4F8A5B] hover:underline tabular-nums whitespace-nowrap"
            >
              <Phone className="w-3 h-3" />
              <span>Call {phone}</span>
            </a>
          </div>
          <button
            type="button"
            onClick={() => setCalloutDismissed(true)}
            aria-label="Hide support prompt"
            className="p-1 rounded-md text-[#26312D]/50 hover:text-[#26312D] hover:bg-[#F7F6F0]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Floating WhatsApp Action Button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with Admin on WhatsApp"
        className="group inline-flex items-center gap-2.5 min-h-[52px] min-w-[52px] px-4 rounded-full bg-[#173F35] text-white shadow-lg border border-[#E6B84A]/50 hover:bg-[#4F8A5B] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173F35]"
      >
        <svg
          className="w-6 h-6 text-[#25D366] shrink-0"
          viewBox="0 0 32 32"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M16.01 3.2c-7.07 0-12.8 5.73-12.8 12.8 0 2.26.59 4.46 1.71 6.4L3.1 28.95l6.73-1.76a12.76 12.76 0 0 0 6.18 1.59h.01c7.06 0 12.79-5.73 12.79-12.8 0-3.42-1.33-6.64-3.75-9.05A12.72 12.72 0 0 0 16.01 3.2zm7.44 18.18c-.31.88-1.81 1.68-2.52 1.78-.65.1-1.47.14-2.38-.15-.55-.18-1.26-.41-2.16-.8-3.8-1.64-6.28-5.47-6.47-5.72-.19-.26-1.55-2.06-1.55-3.93s.98-2.79 1.33-3.17c.35-.38.76-.48 1.02-.48.25 0 .51 0 .73.01.24.01.56-.09.87.66.31.76 1.07 2.63 1.16 2.82.1.19.16.41.03.67-.13.26-.19.41-.38.64-.19.22-.4.5-.57.67-.19.19-.39.4-.17.78.22.38 1 1.65 2.15 2.67 1.48 1.32 2.72 1.73 3.1 1.92.38.19.6.16.82-.1.22-.26.95-1.11 1.2-1.49.25-.38.5-.32.85-.19.35.13 2.21 1.04 2.59 1.23.38.19.63.28.73.44.09.16.09.92-.22 1.8z" />
        </svg>
        <span className="hidden sm:inline text-xs font-bold tracking-wide whitespace-nowrap">
          Chat with Admin
        </span>
      </a>
    </div>
  );
};
