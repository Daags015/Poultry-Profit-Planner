import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import { useData } from '@/src/context/DataContext';

export const PublicHeader: React.FC = () => {
  const { siteSettings } = useData();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = (siteSettings.navigation_links || []).slice(0, 5);

  return (
    <header className="sticky top-0 z-40 bg-[#F7F6F0]/95 backdrop-blur-sm border-b border-[#26312D]/10 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single clean wordmark */}
        <Link
          to="/"
          className="text-lg font-extrabold tracking-tight text-[#173F35] font-display whitespace-nowrap shrink-0"
        >
          {siteSettings.site_name || 'Poultry Profit Planner'}
        </Link>

        {/* Zone 2: 4-5 concise single-line nav links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#26312D]">
          {navLinks.map((link) =>
            link.href.startsWith('/#') || link.href.startsWith('#') ? (
              <a
                key={link.href}
                href={link.href}
                className="hover:text-[#173F35] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href}
                to={link.href}
                className="hover:text-[#173F35] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
              >
                {link.label}
              </Link>
            )
          )}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="hidden md:flex items-center shrink-0">
          <Link
            to={user ? '/dashboard' : '/auth'}
            className="min-h-[40px] inline-flex items-center px-4 py-2 rounded-lg bg-[#173F35] text-white text-sm font-semibold hover:bg-[#173F35]/90 transition-colors whitespace-nowrap shrink-0"
          >
            {user ? 'Open Dashboard' : 'Sign In'}
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="md:hidden min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-[#173F35] hover:bg-[#26312D]/5"
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-[#26312D]/10 bg-white px-4 py-4 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href.replace('/#', '#')}
              onClick={() => setMobileOpen(false)}
              className="block min-h-[44px] px-3 py-2.5 rounded-lg text-sm font-medium text-[#26312D] hover:bg-[#F7F6F0]"
            >
              {link.label}
            </Link>
          ))}
          <Link
            to={user ? '/dashboard' : '/auth'}
            onClick={() => setMobileOpen(false)}
            className="block min-h-[44px] px-4 py-2.5 rounded-lg bg-[#173F35] text-white text-sm font-semibold text-center"
          >
            {user ? 'Open Dashboard' : 'Sign In'}
          </Link>
        </div>
      )}
    </header>
  );
};

export const PublicFooter: React.FC = () => {
  const { siteSettings } = useData();

  return (
    <footer className="bg-[#173F35] text-white py-12 border-t border-[#173F35] no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-5 space-y-3">
          <p className="text-lg font-extrabold font-display tracking-tight">
            {siteSettings.site_name}
          </p>
          <p className="text-sm font-medium text-[#E6B84A]">{siteSettings.tagline}</p>
          <p className="text-sm text-white/80 leading-relaxed max-w-md">
            {siteSettings.footer_about}
          </p>
        </div>

        <div className="md:col-span-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/70 mb-3">
            Planning Tools
          </p>
          {(siteSettings.footer_links || []).map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="block text-sm text-white/85 hover:text-[#E6B84A] py-1 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="md:col-span-4 space-y-2 text-sm text-white/85">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/70 mb-3">
            Support &amp; Transparency
          </p>
          {siteSettings.contact_phone && (
            <p>
              Call:{' '}
              <a
                href={`tel:${siteSettings.contact_phone}`}
                className="font-bold text-[#E6B84A] hover:underline tabular-nums"
              >
                {siteSettings.contact_phone}
              </a>
            </p>
          )}
          {siteSettings.contact_email && (
            <p>
              Email:{' '}
              <a
                href={`mailto:${siteSettings.contact_email}`}
                className="hover:text-[#E6B84A] underline underline-offset-2"
              >
                {siteSettings.contact_email}
              </a>
            </p>
          )}
          <div className="pt-1 flex flex-wrap gap-3 text-xs">
            <a
              href="/#feedback"
              className="text-white/90 hover:text-[#E6B84A] underline underline-offset-2"
            >
              Suggest a Feature
            </a>
          </div>
          <p className="pt-2 text-xs text-white/70 leading-relaxed">
            {siteSettings.disclaimer_text}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 pt-6 border-t border-white/15 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/70">
        <p>© {new Date().getFullYear()} {siteSettings.site_name}. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <Link to="/admin" className="hover:text-white transition-colors">
            Admin CMS
          </Link>
          <Link to="/settings" className="hover:text-white transition-colors">
            Offline Storage &amp; Settings
          </Link>
        </div>
      </div>
    </footer>
  );
};
