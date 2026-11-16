import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Calculator,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Layers,
  Lightbulb,
  Mail,
  MessageCircle,
  Package,
  Phone,
  Quote,
  Scale,
  Shield,
  TrendingUp,
} from 'lucide-react';
import heroFarmImg from '@/src/assets/images/hero_poultry_house_1794786588166.jpg';
import eggRoomImg from '@/src/assets/images/layer_egg_collection_1794786588913.jpg';
import feedStoreImg from '@/src/assets/images/feed_ration_bags_1794786588794.jpg';
import { PublicFooter, PublicHeader } from '@/src/components/PublicHeader';
import { QuickEstimator } from '@/src/components/QuickEstimator';
import { formatWhatsAppHref } from '@/src/components/WhatsAppWidget';
import { useData } from '@/src/context/DataContext';
import type { FeatureSuggestion, SiteSection } from '@/src/types/domain';

function renderSectionIcon(icon?: string) {
  switch (icon) {
    case 'scale':
      return <Scale className="w-5 h-5 text-[#4F8A5B]" />;
    case 'shield':
      return <Shield className="w-5 h-5 text-[#4F8A5B]" />;
    case 'calendar':
      return <Calendar className="w-5 h-5 text-[#4F8A5B]" />;
    case 'layers':
      return <Layers className="w-5 h-5 text-[#4F8A5B]" />;
    case 'package':
      return <Package className="w-5 h-5 text-[#4F8A5B]" />;
    case 'trending':
      return <TrendingUp className="w-5 h-5 text-[#4F8A5B]" />;
    default:
      return <Calculator className="w-5 h-5 text-[#4F8A5B]" />;
  }
}

export const HomePage: React.FC = () => {
  const { siteSections, siteFaqs, siteSettings, submitFeatureSuggestion } = useData();
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState<Record<string, boolean>>({});

  const [sugName, setSugName] = useState('');
  const [sugContact, setSugContact] = useState('');
  const [sugCategory, setSugCategory] = useState('Planner Feature');
  const [sugText, setSugText] = useState('');
  const [submittingSug, setSubmittingSug] = useState(false);
  const [sugError, setSugError] = useState<string | null>(null);
  const [sugSuccess, setSugSuccess] = useState<FeatureSuggestion | null>(null);

  const contactPhone = siteSettings.contact_phone || '08168779732';
  const contactEmail = siteSettings.contact_email || 'daagsdigitalconcept@gmail.com';

  const visibleSections = [...siteSections]
    .filter((s) => s.is_visible && !s.deleted_at)
    .sort((a, b) => a.display_order - b.display_order);

  const visibleFaqs = [...siteFaqs]
    .filter((f) => f.is_visible && !f.deleted_at)
    .sort((a, b) => a.display_order - b.display_order);

  const handleSuggestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSugError(null);
    if (!sugName.trim()) {
      setSugError('Please enter your name or farm name.');
      return;
    }
    if (sugText.trim().length < 8) {
      setSugError('Please describe your feature idea in at least a few words.');
      return;
    }
    setSubmittingSug(true);
    try {
      const saved = await submitFeatureSuggestion({
        name: sugName.trim(),
        contact: sugContact.trim(),
        category: sugCategory,
        suggestion: sugText.trim(),
      });
      setSugSuccess(saved);
      setSugName('');
      setSugContact('');
      setSugText('');
    } catch {
      setSugError('Could not save your suggestion locally. Please try again.');
    } finally {
      setSubmittingSug(false);
    }
  };

  const renderSection = (section: SiteSection) => {
    if (section.section_type === 'hero') {
      return (
        <section key={section.id} className="pt-10 pb-14 lg:pt-14 lg:pb-20 bg-[#F7F6F0]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
              <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
                {section.subheading && (
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#4F8A5B]">
                    {section.subheading}
                  </p>
                )}
                <h1
                  className="text-3xl sm:text-4xl lg:text-[46px] font-extrabold text-[#173F35] leading-[1.12] tracking-tight font-display"
                  style={{ textWrap: 'balance' }}
                >
                  {section.heading}
                </h1>
                <p className="text-base text-[#26312D]/85 leading-relaxed max-w-xl">
                  {section.body_text}
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {section.primary_cta_label && (
                    <Link
                      to={section.primary_cta_link || '/planner/broiler'}
                      className="min-h-[46px] inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#173F35] text-white text-sm font-semibold hover:bg-[#173F35]/90 transition-colors whitespace-nowrap shrink-0"
                    >
                      <span>{section.primary_cta_label}</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  )}
                  {section.secondary_cta_label && (
                    <a
                      href={section.secondary_cta_link || '#estimator'}
                      className="min-h-[46px] inline-flex items-center px-5 py-3 rounded-lg border border-[#173F35]/25 bg-white text-sm font-semibold text-[#173F35] hover:bg-white/70 transition-colors whitespace-nowrap shrink-0"
                    >
                      {section.secondary_cta_label}
                    </a>
                  )}
                </div>

                {/* Strategic Direct Call & Support Bar */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2 border-t border-[#26312D]/10 text-sm">
                  <a
                    href={`tel:${contactPhone}`}
                    className="min-h-[40px] inline-flex items-center gap-2 font-bold text-[#173F35] hover:text-[#4F8A5B] transition-colors tabular-nums"
                  >
                    <span className="w-8 h-8 rounded-lg bg-[#173F35] text-[#E6B84A] inline-flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4" />
                    </span>
                    <span>Call Support: {contactPhone}</span>
                  </a>
                  <a
                    href={formatWhatsAppHref(contactPhone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[40px] inline-flex items-center gap-1.5 font-semibold text-[#4F8A5B] hover:text-[#173F35] transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Chat with Admin</span>
                  </a>
                  <a
                    href={`mailto:${contactEmail}`}
                    className="min-h-[40px] inline-flex items-center gap-1.5 text-xs font-medium text-[#26312D]/75 hover:text-[#173F35] transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>{contactEmail}</span>
                  </a>
                </div>

                <p className="text-xs text-[#26312D]/65">
                  {siteSettings.tagline} · Works offline on mobile &amp; desktop
                </p>
              </div>

              <div className="lg:col-span-6">
                <div className="h-full min-h-[300px] lg:min-h-[420px] rounded-2xl overflow-hidden border border-[#26312D]/12 bg-[#173F35]/10">
                  {!imgFailed.hero ? (
                    <img
                      src={heroFarmImg}
                      alt="Modern sunlit commercial broiler house with birds on clean litter"
                      referrerPolicy="no-referrer"
                      onError={() => setImgFailed((p) => ({ ...p, hero: true }))}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-[#173F35] text-white">
                      <Layers className="w-10 h-10 text-[#E6B84A] mb-3" />
                      <p className="font-display font-bold text-lg">{siteSettings.site_name}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {section.items && section.items.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-10 pt-8 border-t border-[#26312D]/10">
                {section.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-xl border border-[#26312D]/12 p-5 space-y-1.5"
                  >
                    {item.badge && (
                      <p className="text-xs font-semibold text-[#4F8A5B]">{item.badge}</p>
                    )}
                    <h2 className="text-base font-bold text-[#173F35] font-display">
                      {item.title}
                    </h2>
                    <p className="text-sm text-[#26312D]/80 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      );
    }

    if (section.section_type === 'value_props') {
      return (
        <section key={section.id} className="py-16 lg:py-20 bg-[#F7F6F0]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-5 space-y-4">
                {section.subheading && (
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#4F8A5B]">
                    {section.subheading}
                  </p>
                )}
                <h2
                  className="text-2xl sm:text-3xl font-bold text-[#173F35] tracking-tight font-display"
                  style={{ textWrap: 'balance' }}
                >
                  {section.heading}
                </h2>
                <p className="text-sm sm:text-base text-[#26312D]/80 leading-relaxed">
                  {section.body_text}
                </p>

                <div className="rounded-xl overflow-hidden border border-[#26312D]/12 aspect-[4/3] bg-white">
                  {!imgFailed.feed ? (
                    <img
                      src={feedStoreImg}
                      alt="Stacked poultry feed sacks on wooden pallets in dry farm storehouse"
                      referrerPolicy="no-referrer"
                      onError={() => setImgFailed((p) => ({ ...p, feed: true }))}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#F7F6F0]">
                      <Package className="w-10 h-10 text-[#173F35]" />
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-7 space-y-4">
                {section.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-xl border border-[#26312D]/12 p-6 flex items-start gap-4"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[#F7F6F0] flex items-center justify-center shrink-0">
                      {renderSectionIcon(item.icon)}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#173F35] font-display">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-sm text-[#26312D]/80 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}

                {section.primary_cta_label && (
                  <div className="pt-2">
                    <Link
                      to={section.primary_cta_link || '/scenarios'}
                      className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#173F35] text-white text-sm font-semibold hover:bg-[#173F35]/90 transition-colors"
                    >
                      <span>{section.primary_cta_label}</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      );
    }

    if (section.section_type === 'how_it_works') {
      return (
        <section key={section.id} className="py-16 lg:py-20 bg-white border-y border-[#26312D]/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end mb-10">
              <div className="lg:col-span-7 space-y-2">
                {section.subheading && (
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#4F8A5B]">
                    {section.subheading}
                  </p>
                )}
                <h2 className="text-2xl sm:text-3xl font-bold text-[#173F35] font-display tracking-tight">
                  {section.heading}
                </h2>
                <p className="text-sm text-[#26312D]/80 max-w-2xl">{section.body_text}</p>
              </div>
              {section.primary_cta_label && (
                <div className="lg:col-span-5 lg:text-right">
                  <Link
                    to={section.primary_cta_link || '/planner/layer'}
                    className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[#173F35] text-[#173F35] text-sm font-semibold hover:bg-[#173F35] hover:text-white transition-colors"
                  >
                    <span>{section.primary_cta_label}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {section.items.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-[#F7F6F0] rounded-xl border border-[#26312D]/12 p-5 space-y-2"
                >
                  {item.badge && (
                    <p className="text-xs font-bold text-[#4F8A5B]">{item.badge}</p>
                  )}
                  <h3 className="text-base font-bold text-[#173F35] font-display">
                    {item.title}
                  </h3>
                  <p className="text-sm text-[#26312D]/80 leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    }

    if (section.section_type === 'feature_grid') {
      return (
        <section key={section.id} className="py-16 lg:py-20 bg-[#F7F6F0]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="space-y-2">
                {section.subheading && (
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#4F8A5B]">
                    {section.subheading}
                  </p>
                )}
                <h2 className="text-2xl sm:text-3xl font-bold text-[#173F35] font-display tracking-tight">
                  {section.heading}
                </h2>
                <p className="text-sm text-[#26312D]/80">{section.body_text}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {section.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-xl border border-[#26312D]/12 p-5 space-y-2"
                  >
                    <div className="w-9 h-9 rounded-lg bg-[#F7F6F0] flex items-center justify-center">
                      {renderSectionIcon(item.icon)}
                    </div>
                    <h3 className="text-sm font-bold text-[#173F35] font-display">
                      {item.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#26312D]/80 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-2xl overflow-hidden border border-[#26312D]/12 aspect-[4/3] bg-white">
                {!imgFailed.eggs ? (
                  <img
                    src={eggRoomImg}
                    alt="Fresh brown eggs graded in pulp trays inside poultry egg collection room"
                    referrerPolicy="no-referrer"
                    onError={() => setImgFailed((p) => ({ ...p, eggs: true }))}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#F7F6F0]">
                    <TrendingUp className="w-10 h-10 text-[#173F35]" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      );
    }

    if (section.section_type === 'testimonials') {
      return (
        <section key={section.id} className="py-16 lg:py-20 bg-white border-y border-[#26312D]/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl space-y-2 mb-10">
              {section.subheading && (
                <p className="text-xs font-semibold uppercase tracking-wider text-[#4F8A5B]">
                  {section.subheading}
                </p>
              )}
              <h2
                className="text-2xl sm:text-3xl font-bold text-[#173F35] font-display tracking-tight"
                style={{ textWrap: 'balance' }}
              >
                {section.heading}
              </h2>
              {section.body_text && (
                <p className="text-sm sm:text-base text-[#26312D]/80 leading-relaxed">
                  {section.body_text}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {section.items.map((item, idx) => (
                <article
                  key={idx}
                  className="bg-[#F7F6F0] rounded-xl border border-[#26312D]/12 p-6 flex flex-col justify-between gap-5"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <Quote className="w-5 h-5 text-[#4F8A5B] shrink-0 mt-0.5" />
                      {item.metric && (
                        <p className="text-xs font-bold text-[#173F35] bg-[#E6B84A]/25 px-2.5 py-1 rounded-md text-right">
                          {item.metric}
                        </p>
                      )}
                    </div>
                    <p className="text-sm text-[#26312D]/90 leading-relaxed">
                      &ldquo;{item.description}&rdquo;
                    </p>
                  </div>

                  <div className="pt-4 border-t border-[#26312D]/10">
                    <p className="text-sm font-bold text-[#173F35] font-display">{item.title}</p>
                    {(item.author_role || item.farm_name) && (
                      <p className="text-xs text-[#26312D]/70 mt-0.5">
                        {[item.author_role, item.farm_name].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      );
    }

    if (section.section_type === 'cta') {
      return (
        <section key={section.id} className="py-16 bg-[#173F35] text-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-5">
            {section.subheading && (
              <p className="text-xs font-semibold uppercase tracking-wider text-[#E6B84A]">
                {section.subheading}
              </p>
            )}
            <h2
              className="text-2xl sm:text-3xl lg:text-4xl font-bold font-display tracking-tight"
              style={{ textWrap: 'balance' }}
            >
              {section.heading}
            </h2>
            <p className="text-sm sm:text-base text-white/80 max-w-2xl mx-auto">
              {section.body_text}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {section.primary_cta_label && (
                <Link
                  to={section.primary_cta_link || '/planner/broiler'}
                  className="min-h-[46px] inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#E6B84A] text-[#173F35] text-sm font-bold hover:bg-[#E6B84A]/90 transition-colors"
                >
                  <span>{section.primary_cta_label}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
              {section.secondary_cta_label && (
                <Link
                  to={section.secondary_cta_link || '/planner/layer'}
                  className="min-h-[46px] inline-flex items-center px-6 py-3 rounded-lg border border-white/30 text-white text-sm font-semibold hover:bg-white/10 transition-colors"
                >
                  {section.secondary_cta_label}
                </Link>
              )}
            </div>
          </div>
        </section>
      );
    }

    // Custom / Preview section
    return (
      <section key={section.id} className="py-14 bg-white border-y border-[#26312D]/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="max-w-3xl space-y-2">
            {section.subheading && (
              <p className="text-xs font-semibold uppercase tracking-wider text-[#4F8A5B]">
                {section.subheading}
              </p>
            )}
            <h2 className="text-2xl sm:text-3xl font-bold text-[#173F35] font-display">
              {section.heading}
            </h2>
            {section.body_text && (
              <p className="text-sm sm:text-base text-[#26312D]/80 leading-relaxed">
                {section.body_text}
              </p>
            )}
          </div>
          {section.items && section.items.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {section.items.map((item, idx) => (
                <div key={idx} className="p-5 rounded-xl bg-[#F7F6F0] border border-[#26312D]/12">
                  <h3 className="font-bold text-[#173F35] font-display">{item.title}</h3>
                  <p className="mt-1 text-sm text-[#26312D]/80">{item.description}</p>
                </div>
              ))}
            </div>
          )}
          {section.primary_cta_label && (
            <Link
              to={section.primary_cta_link || '/planner/broiler'}
              className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#173F35] text-white text-sm font-semibold"
            >
              <span>{section.primary_cta_label}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </section>
    );
  };

  // Render hero first, then QuickEstimator, then remaining CMS sections, then FAQs
  const heroSection = visibleSections.find((s) => s.section_type === 'hero');
  const otherSections = visibleSections.filter((s) => s.section_type !== 'hero');

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F6F0]">
      <PublicHeader />

      <main className="flex-1">
        {heroSection && renderSection(heroSection)}

        <QuickEstimator disclaimerText={siteSettings.disclaimer_text} />

        {otherSections.map((section) => renderSection(section))}

        {/* Direct Support & Suggest a Feature Section */}
        <section id="feedback" className="py-16 lg:py-20 bg-[#F7F6F0]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Direct Contact Card */}
            <div className="lg:col-span-5 space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#4F8A5B] mb-1">
                  Direct Farmer Support
                </p>
                <h2
                  className="text-2xl sm:text-3xl font-bold text-[#173F35] font-display tracking-tight"
                  style={{ textWrap: 'balance' }}
                >
                  Need help setting up your flock budget? Call or chat admin.
                </h2>
                <p className="mt-2 text-sm text-[#26312D]/80 leading-relaxed">
                  Reach our team directly for feed stage setup guidance, migrating existing farm records, or reporting any calculation question.
                </p>
              </div>

              <div className="space-y-3">
                <a
                  href={`tel:${contactPhone}`}
                  className="min-h-[60px] w-full flex items-center justify-between gap-4 rounded-xl bg-white border border-[#26312D]/12 px-5 py-3.5 hover:border-[#173F35]/40 transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="w-10 h-10 rounded-lg bg-[#173F35] text-[#E6B84A] flex items-center justify-center shrink-0">
                      <Phone className="w-5 h-5" />
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-[#4F8A5B]">Call Farm Support</p>
                      <p className="text-base font-extrabold text-[#173F35] font-display tabular-nums">
                        {contactPhone}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-[#173F35] shrink-0">Tap to call</span>
                </a>

                <a
                  href={formatWhatsAppHref(contactPhone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[60px] w-full flex items-center justify-between gap-4 rounded-xl bg-white border border-[#26312D]/12 px-5 py-3.5 hover:border-[#4F8A5B]/50 transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="w-10 h-10 rounded-lg bg-[#4F8A5B]/15 text-[#173F35] flex items-center justify-center shrink-0">
                      <MessageCircle className="w-5 h-5 text-[#4F8A5B]" />
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-[#4F8A5B]">WhatsApp Admin</p>
                      <p className="text-sm font-bold text-[#173F35]">
                        Chat with Admin ({contactPhone})
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#173F35] shrink-0" />
                </a>

                <a
                  href={`mailto:${contactEmail}`}
                  className="min-h-[60px] w-full flex items-center justify-between gap-4 rounded-xl bg-white border border-[#26312D]/12 px-5 py-3.5 hover:border-[#173F35]/40 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="w-10 h-10 rounded-lg bg-[#F7F6F0] text-[#173F35] flex items-center justify-center shrink-0">
                      <Mail className="w-5 h-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#4F8A5B]">Email Support</p>
                      <p className="text-sm font-bold text-[#173F35] truncate">{contactEmail}</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-[#173F35] shrink-0">Send email</span>
                </a>
              </div>
            </div>

            {/* Suggest a Feature or Idea Form */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-[#26312D]/12 p-6 sm:p-8">
              <div className="flex items-start gap-3 mb-5">
                <span className="w-10 h-10 rounded-lg bg-[#E6B84A]/25 text-[#173F35] flex items-center justify-center shrink-0">
                  <Lightbulb className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-xl font-bold text-[#173F35] font-display">
                    Suggest a Feature or Idea
                  </h3>
                  <p className="text-sm text-[#26312D]/75 mt-0.5">
                    Tell us what calculator, flock metric, feed mill helper, or report you want added next.
                  </p>
                </div>
              </div>

              {sugSuccess && (
                <div className="mb-5 rounded-xl bg-[#4F8A5B]/12 border border-[#4F8A5B]/30 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#173F35]">
                    <CheckCircle2 className="w-4 h-4 text-[#4F8A5B] shrink-0" />
                    <span>Thank you, {sugSuccess.name}. Your idea has been saved!</span>
                  </div>
                  <p className="text-xs text-[#26312D]/80">
                    Want to notify admin immediately too? Send it directly via WhatsApp or email:
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <a
                      href={formatWhatsAppHref(
                        contactPhone,
                        `Feature Idea (${sugSuccess.category}) from ${sugSuccess.name}: ${sugSuccess.suggestion}`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#173F35] text-white text-xs font-semibold"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Send via WhatsApp</span>
                    </a>
                    <a
                      href={`mailto:${contactEmail}?subject=${encodeURIComponent(
                        `Poultry Profit Planner Feature Idea: ${sugSuccess.category}`
                      )}&body=${encodeURIComponent(
                        `From: ${sugSuccess.name} (${sugSuccess.contact || 'No contact provided'})\n\nIdea:\n${sugSuccess.suggestion}`
                      )}`}
                      className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#173F35]/25 text-[#173F35] text-xs font-semibold"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Email {contactEmail}</span>
                    </a>
                  </div>
                </div>
              )}

              {sugError && (
                <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs font-semibold text-red-800">
                  {sugError}
                </div>
              )}

              <form onSubmit={handleSuggestionSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="sug-name"
                      className="block text-xs font-semibold text-[#173F35] mb-1.5"
                    >
                      Your Name / Farm Name *
                    </label>
                    <input
                      id="sug-name"
                      type="text"
                      required
                      value={sugName}
                      onChange={(e) => setSugName(e.target.value)}
                      placeholder="e.g. Musa Ibrahim / Sunrise Farms"
                      className="w-full min-h-[44px] px-3.5 rounded-lg border border-[#26312D]/20 bg-[#F7F6F0]/40 text-sm text-[#26312D] focus:outline-none focus:border-[#173F35]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="sug-contact"
                      className="block text-xs font-semibold text-[#173F35] mb-1.5"
                    >
                      Phone or Email (optional)
                    </label>
                    <input
                      id="sug-contact"
                      type="text"
                      value={sugContact}
                      onChange={(e) => setSugContact(e.target.value)}
                      placeholder="e.g. 0803... or email"
                      className="w-full min-h-[44px] px-3.5 rounded-lg border border-[#26312D]/20 bg-[#F7F6F0]/40 text-sm text-[#26312D] focus:outline-none focus:border-[#173F35]"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="sug-category"
                    className="block text-xs font-semibold text-[#173F35] mb-1.5"
                  >
                    Feature Area
                  </label>
                  <select
                    id="sug-category"
                    value={sugCategory}
                    onChange={(e) => setSugCategory(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 rounded-lg border border-[#26312D]/20 bg-[#F7F6F0]/40 text-sm text-[#26312D] focus:outline-none focus:border-[#173F35]"
                  >
                    <option value="Planner Feature">Broiler / Layer Planner Feature</option>
                    <option value="Feed & Egg Calculations">Feed Formulation &amp; Egg Calculations</option>
                    <option value="Offline & Sync">Offline Logging &amp; Multi-Staff Sync</option>
                    <option value="Reports & Exports">PDF / Excel Reports &amp; Invoices</option>
                    <option value="General Idea">General Idea or Improvement</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="sug-text"
                    className="block text-xs font-semibold text-[#173F35] mb-1.5"
                  >
                    Expected Feature or Idea *
                  </label>
                  <textarea
                    id="sug-text"
                    rows={3}
                    required
                    value={sugText}
                    onChange={(e) => setSugText(e.target.value)}
                    placeholder="Describe the feature you'd like to see or how it would help your poultry business..."
                    className="w-full p-3.5 rounded-lg border border-[#26312D]/20 bg-[#F7F6F0]/40 text-sm text-[#26312D] focus:outline-none focus:border-[#173F35]"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <p className="text-xs text-[#26312D]/65">
                    Works offline — saved locally and queued for admin review.
                  </p>
                  <button
                    type="submit"
                    disabled={submittingSug}
                    className="min-h-[44px] inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#173F35] text-white text-sm font-semibold hover:bg-[#173F35]/90 disabled:opacity-60 transition-colors"
                  >
                    <Lightbulb className="w-4 h-4 text-[#E6B84A]" />
                    <span>{submittingSug ? 'Submitting...' : 'Submit Idea'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>

        {/* FAQs Section */}
        {visibleFaqs.length > 0 && (
          <section className="py-16 lg:py-20 bg-white border-t border-[#26312D]/10">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="mb-8">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#4F8A5B] mb-1">
                  Questions &amp; Answers
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#173F35] font-display">
                  Frequently asked questions
                </h2>
              </div>

              <div className="divide-y divide-[#26312D]/10 border border-[#26312D]/12 rounded-xl bg-[#F7F6F0]/40 overflow-hidden">
                {visibleFaqs.map((faq) => {
                  const isOpen = openFaqId === faq.id;
                  return (
                    <div key={faq.id} className="bg-white">
                      <button
                        type="button"
                        onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                        className="w-full min-h-[52px] px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-[#F7F6F0]/50 transition-colors"
                      >
                        <div>
                          <span className="text-xs text-[#4F8A5B] font-medium block">
                            {faq.category}
                          </span>
                          <span className="text-sm sm:text-base font-semibold text-[#173F35]">
                            {faq.question}
                          </span>
                        </div>
                        {isOpen ? (
                          <ChevronUp className="w-4 h-4 text-[#173F35] shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-[#173F35] shrink-0" />
                        )}
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-5 text-sm text-[#26312D]/80 leading-relaxed">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </main>

      <PublicFooter />
    </div>
  );
};
