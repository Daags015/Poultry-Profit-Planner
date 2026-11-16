import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, RefreshCw, ShieldAlert, Trash2 } from 'lucide-react';
import { AppShell } from '@/src/components/AppShell';
import { useAuth } from '@/src/context/AuthContext';
import { useData } from '@/src/context/DataContext';
import type {
  FeatureSuggestion,
  PlannerTemplate,
  SiteFaq,
  SiteSection,
  SiteSectionType,
  SiteSettings,
} from '@/src/types/domain';

type AdminTab = 'sections' | 'faqs' | 'settings' | 'templates' | 'suggestions';

export const AdminPage: React.FC = () => {
  const { isAdmin, isSupabaseReady, user } = useAuth();
  const {
    siteSections,
    siteFaqs,
    siteSettings,
    plannerTemplates,
    featureSuggestions,
    saveSiteSection,
    deleteSiteSection,
    reorderSiteSections,
    saveSiteFaq,
    deleteSiteFaq,
    saveSiteSettings,
    savePlannerTemplate,
    updateFeatureSuggestionStatus,
    invalidateCmsCache,
  } = useData();

  const [tab, setTab] = useState<AdminTab>('sections');
  const [localPreviewBypass, setLocalPreviewBypass] = useState(false);
  const [editingSection, setEditingSection] = useState<SiteSection | null>(null);
  const [editingFaq, setEditingFaq] = useState<SiteFaq | null>(null);
  const [settingsForm, setSettingsForm] = useState<SiteSettings>(siteSettings);
  const [editingTemplate, setEditingTemplate] = useState<PlannerTemplate | null>(null);
  const [tplJson, setTplJson] = useState<string>('');
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setSettingsForm(siteSettings);
  }, [siteSettings]);

  const canAccess = isAdmin || (!isSupabaseReady && localPreviewBypass);

  if (!canAccess) {
    return (
      <AppShell title="Admin Control Center" subtitle="Protected CMS & Global Template Management">
        <div className="max-w-2xl bg-white rounded-2xl border border-[#26312D]/12 p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3 text-[#173F35]">
            <ShieldAlert className="w-6 h-6 text-[#E6B84A]" />
            <h2 className="text-lg font-bold font-display">Administrator Access Required</h2>
          </div>
          <p className="text-sm text-[#26312D]/80 leading-relaxed">
            Only accounts with <code className="bg-[#F7F6F0] px-1.5 py-0.5 rounded">profiles.role = &apos;admin&apos;</code> can edit public website sections, FAQs, global settings, and starter planner templates.
          </p>
          {isSupabaseReady ? (
            <div className="rounded-xl bg-[#F7F6F0] p-4 text-xs text-[#26312D] space-y-2">
              <p className="font-semibold">How to promote your first admin in Supabase SQL Editor:</p>
              <pre className="overflow-x-auto bg-white p-3 rounded border border-[#26312D]/10">
{`UPDATE public.profiles p
SET role = 'admin'
FROM auth.users u
WHERE p.id = u.id AND u.email = '${user?.email || 'your-admin@email.com'}';`}
              </pre>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-[#26312D]/75">
                Supabase environment variables are not connected yet. You can preview and test CMS editing locally on this device:
              </p>
              <button
                type="button"
                onClick={() => setLocalPreviewBypass(true)}
                className="min-h-[44px] px-4 py-2 rounded-lg bg-[#173F35] text-white text-sm font-semibold"
              >
                Open Local CMS Preview
              </button>
            </div>
          )}
        </div>
      </AppShell>
    );
  }

  const orderedSections = [...siteSections].sort((a, b) => a.display_order - b.display_order);

  const handleCreateCustomSection = async () => {
    const now = new Date().toISOString();
    const newSec: SiteSection = {
      id: crypto.randomUUID(),
      section_key: `custom_${Date.now()}`,
      section_type: 'custom',
      heading: 'New Custom Announcement',
      subheading: 'Farm Update',
      body_text: 'Add your custom announcement, guide, or regional pricing note here.',
      primary_cta_label: 'Open Planner',
      primary_cta_link: '/planner/broiler',
      secondary_cta_label: '',
      secondary_cta_link: '',
      items: [],
      display_order: orderedSections.length + 1,
      is_visible: true,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };
    await saveSiteSection(newSec);
    setEditingSection(newSec);
    setNotice('Created new custom section.');
  };

  const handleMoveSection = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= orderedSections.length) return;
    const ids = orderedSections.map((s) => s.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(target, 0, moved);
    await reorderSiteSections(ids);
    setNotice('Section order updated.');
  };

  const handleCreateFaq = async () => {
    const now = new Date().toISOString();
    const faq: SiteFaq = {
      id: crypto.randomUUID(),
      question: 'New Question',
      answer: 'Provide a clear, practical answer for farmers.',
      category: 'General',
      display_order: siteFaqs.length + 1,
      is_visible: true,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };
    await saveSiteFaq(faq);
    setEditingFaq(faq);
  };

  return (
    <AppShell
      title="Admin Control Center"
      subtitle="Manage 100% of public homepage sections, FAQs, site settings, and starter templates"
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              void invalidateCmsCache();
              setNotice('CMS cache refreshed.');
            }}
            className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#26312D]/20 bg-white text-xs font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Cache</span>
          </button>
          <Link
            to="/"
            className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#173F35] text-white text-xs font-semibold"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Live Preview</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Admin Tabs */}
        <div className="flex flex-wrap gap-2 bg-white p-2 rounded-xl border border-[#26312D]/12">
          {(
            [
              { id: 'sections', label: `Homepage Sections (${orderedSections.length})` },
              { id: 'faqs', label: `FAQs (${siteFaqs.length})` },
              { id: 'suggestions', label: `Feature Ideas (${featureSuggestions.length})` },
              { id: 'settings', label: 'Global Site Settings' },
              { id: 'templates', label: `Starter Templates (${plannerTemplates.length})` },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
                setNotice(null);
              }}
              className={`min-h-[40px] px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                tab === t.id ? 'bg-[#173F35] text-white' : 'text-[#26312D] hover:bg-[#F7F6F0]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {notice && (
          <div className="rounded-lg bg-[#4F8A5B]/15 border border-[#4F8A5B]/30 px-4 py-2.5 text-xs font-semibold text-[#173F35]">
            {notice}
          </div>
        )}

        {/* 1. SECTIONS MANAGER */}
        {tab === 'sections' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-5 bg-white rounded-xl border border-[#26312D]/12 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#173F35] font-display">Page Sections</h2>
                <button
                  type="button"
                  onClick={() => void handleCreateCustomSection()}
                  className="min-h-[38px] inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#173F35] text-white text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Section</span>
                </button>
              </div>

              <div className="divide-y divide-[#26312D]/10">
                {orderedSections.map((sec, idx) => (
                  <div key={sec.id} className="py-3 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingSection(sec)}
                      className="text-left min-w-0 flex-1"
                    >
                      <p className="text-xs font-semibold text-[#4F8A5B] uppercase">
                        {sec.section_type} · #{sec.display_order}
                      </p>
                      <p className="text-sm font-bold text-[#173F35] truncate">{sec.heading}</p>
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => void handleMoveSection(idx, -1)}
                        className="p-1.5 rounded hover:bg-[#F7F6F0]"
                        aria-label="Move up"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleMoveSection(idx, 1)}
                        className="p-1.5 rounded hover:bg-[#F7F6F0]"
                        aria-label="Move down"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void saveSiteSection({ ...sec, is_visible: !sec.is_visible })
                        }
                        className="p-1.5 rounded hover:bg-[#F7F6F0]"
                        aria-label="Toggle visibility"
                      >
                        {sec.is_visible ? (
                          <Eye className="w-4 h-4 text-[#4F8A5B]" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-[#26312D]/40" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void deleteSiteSection(sec.id);
                          if (editingSection?.id === sec.id) setEditingSection(null);
                        }}
                        className="p-1.5 rounded text-red-700 hover:bg-red-50"
                        aria-label="Delete section"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-7 bg-white rounded-xl border border-[#26312D]/12 p-5 sm:p-6">
              {!editingSection ? (
                <p className="text-sm text-[#26312D]/70 py-8 text-center">
                  Select a section on the left to edit its heading, subheading, body copy, CTAs, and card items.
                </p>
              ) : (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await saveSiteSection(editingSection);
                    setNotice(`Saved section "${editingSection.section_key}".`);
                  }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-[#173F35] font-display">
                      Editing: {editingSection.section_key}
                    </h3>
                    <select
                      value={editingSection.section_type}
                      onChange={(e) =>
                        setEditingSection({
                          ...editingSection,
                          section_type: e.target.value as SiteSectionType,
                        })
                      }
                      className="min-h-[38px] px-2.5 rounded-lg border border-[#26312D]/20 bg-white text-xs"
                    >
                      {[
                        'hero',
                        'value_props',
                        'how_it_works',
                        'feature_grid',
                        'testimonials',
                        'preview',
                        'cta',
                        'custom',
                      ].map(
                        (t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">Subheading / Eyebrow</label>
                    <input
                      type="text"
                      value={editingSection.subheading}
                      onChange={(e) =>
                        setEditingSection({ ...editingSection, subheading: e.target.value })
                      }
                      className="w-full min-h-[42px] px-3 rounded-lg border border-[#26312D]/20 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Heading</label>
                    <input
                      type="text"
                      value={editingSection.heading}
                      onChange={(e) =>
                        setEditingSection({ ...editingSection, heading: e.target.value })
                      }
                      className="w-full min-h-[42px] px-3 rounded-lg border border-[#26312D]/20 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Body Text</label>
                    <textarea
                      rows={3}
                      value={editingSection.body_text}
                      onChange={(e) =>
                        setEditingSection({ ...editingSection, body_text: e.target.value })
                      }
                      className="w-full p-3 rounded-lg border border-[#26312D]/20 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1">Primary CTA Label</label>
                      <input
                        type="text"
                        value={editingSection.primary_cta_label}
                        onChange={(e) =>
                          setEditingSection({
                            ...editingSection,
                            primary_cta_label: e.target.value,
                          })
                        }
                        className="w-full min-h-[40px] px-3 rounded-lg border border-[#26312D]/20 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Primary CTA Link</label>
                      <input
                        type="text"
                        value={editingSection.primary_cta_link}
                        onChange={(e) =>
                          setEditingSection({
                            ...editingSection,
                            primary_cta_link: e.target.value,
                          })
                        }
                        className="w-full min-h-[40px] px-3 rounded-lg border border-[#26312D]/20 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Secondary CTA Label</label>
                      <input
                        type="text"
                        value={editingSection.secondary_cta_label}
                        onChange={(e) =>
                          setEditingSection({
                            ...editingSection,
                            secondary_cta_label: e.target.value,
                          })
                        }
                        className="w-full min-h-[40px] px-3 rounded-lg border border-[#26312D]/20 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Secondary CTA Link</label>
                      <input
                        type="text"
                        value={editingSection.secondary_cta_link}
                        onChange={(e) =>
                          setEditingSection({
                            ...editingSection,
                            secondary_cta_link: e.target.value,
                          })
                        }
                        className="w-full min-h-[40px] px-3 rounded-lg border border-[#26312D]/20 text-xs"
                      />
                    </div>
                  </div>

                  {/* Card Items */}
                  <div className="space-y-2 pt-2 border-t border-[#26312D]/10">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#173F35]">
                        Section Cards / Bullets ({editingSection.items.length})
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setEditingSection({
                            ...editingSection,
                            items: [
                              ...editingSection.items,
                              { title: 'New Item', description: 'Describe benefit', badge: '' },
                            ],
                          })
                        }
                        className="text-xs font-semibold text-[#4F8A5B] hover:underline"
                      >
                        + Add Card Item
                      </button>
                    </div>
                    {editingSection.items.map((item, i) => (
                      <div key={i} className="p-3 rounded-lg bg-[#F7F6F0] space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => {
                              const next = [...editingSection.items];
                              next[i] = { ...next[i], title: e.target.value };
                              setEditingSection({ ...editingSection, items: next });
                            }}
                            placeholder="Card Title"
                            className="flex-1 min-h-[36px] px-2.5 rounded border border-[#26312D]/20 bg-white text-xs font-semibold"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const next = editingSection.items.filter((_, idx) => idx !== i);
                              setEditingSection({ ...editingSection, items: next });
                            }}
                            className="px-2 text-red-700 text-xs"
                          >
                            Remove
                          </button>
                        </div>
                        {editingSection.section_type === 'testimonials' && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input
                              type="text"
                              value={item.author_role || ''}
                              onChange={(e) => {
                                const next = [...editingSection.items];
                                next[i] = { ...next[i], author_role: e.target.value };
                                setEditingSection({ ...editingSection, items: next });
                              }}
                              placeholder="Role (e.g. Managing Farmer)"
                              className="min-h-[34px] px-2.5 rounded border border-[#26312D]/20 bg-white text-xs"
                            />
                            <input
                              type="text"
                              value={item.farm_name || ''}
                              onChange={(e) => {
                                const next = [...editingSection.items];
                                next[i] = { ...next[i], farm_name: e.target.value };
                                setEditingSection({ ...editingSection, items: next });
                              }}
                              placeholder="Farm & Location"
                              className="min-h-[34px] px-2.5 rounded border border-[#26312D]/20 bg-white text-xs"
                            />
                            <input
                              type="text"
                              value={item.metric || ''}
                              onChange={(e) => {
                                const next = [...editingSection.items];
                                next[i] = { ...next[i], metric: e.target.value };
                                setEditingSection({ ...editingSection, items: next });
                              }}
                              placeholder="Outcome Metric"
                              className="min-h-[34px] px-2.5 rounded border border-[#26312D]/20 bg-white text-xs"
                            />
                          </div>
                        )}
                        <textarea
                          rows={2}
                          value={item.description}
                          onChange={(e) => {
                            const next = [...editingSection.items];
                            next[i] = { ...next[i], description: e.target.value };
                            setEditingSection({ ...editingSection, items: next });
                          }}
                          className="w-full p-2 rounded border border-[#26312D]/20 bg-white text-xs"
                        />
                      </div>
                    ))}
                  </div>

                  <button
                    type="submit"
                    className="min-h-[44px] px-5 py-2 rounded-lg bg-[#173F35] text-white text-sm font-semibold"
                  >
                    Save Section Changes
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* 2. FAQS MANAGER */}
        {tab === 'faqs' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-5 bg-white rounded-xl border border-[#26312D]/12 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#173F35] font-display">FAQs</h2>
                <button
                  type="button"
                  onClick={() => void handleCreateFaq()}
                  className="min-h-[38px] inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#173F35] text-white text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add FAQ</span>
                </button>
              </div>
              <div className="divide-y divide-[#26312D]/10">
                {siteFaqs.map((faq) => (
                  <div key={faq.id} className="py-3 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingFaq(faq)}
                      className="text-left min-w-0 flex-1"
                    >
                      <p className="text-xs text-[#4F8A5B] font-semibold">{faq.category}</p>
                      <p className="text-sm font-semibold text-[#173F35] truncate">
                        {faq.question}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteSiteFaq(faq.id)}
                      className="p-2 text-red-700 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-7 bg-white rounded-xl border border-[#26312D]/12 p-5 sm:p-6">
              {!editingFaq ? (
                <p className="text-sm text-[#26312D]/70 py-8 text-center">
                  Select an FAQ on the left to edit.
                </p>
              ) : (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await saveSiteFaq(editingFaq);
                    setNotice('FAQ saved.');
                  }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1">Category</label>
                      <input
                        type="text"
                        value={editingFaq.category}
                        onChange={(e) =>
                          setEditingFaq({ ...editingFaq, category: e.target.value })
                        }
                        className="w-full min-h-[42px] px-3 rounded-lg border border-[#26312D]/20 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Display Order</label>
                      <input
                        type="number"
                        value={editingFaq.display_order}
                        onChange={(e) =>
                          setEditingFaq({
                            ...editingFaq,
                            display_order: Number(e.target.value),
                          })
                        }
                        className="w-full min-h-[42px] px-3 rounded-lg border border-[#26312D]/20 text-sm tabular-nums"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Question</label>
                    <input
                      type="text"
                      value={editingFaq.question}
                      onChange={(e) =>
                        setEditingFaq({ ...editingFaq, question: e.target.value })
                      }
                      className="w-full min-h-[42px] px-3 rounded-lg border border-[#26312D]/20 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Answer</label>
                    <textarea
                      rows={4}
                      value={editingFaq.answer}
                      onChange={(e) =>
                        setEditingFaq({ ...editingFaq, answer: e.target.value })
                      }
                      className="w-full p-3 rounded-lg border border-[#26312D]/20 text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    className="min-h-[44px] px-5 py-2 rounded-lg bg-[#173F35] text-white text-sm font-semibold"
                  >
                    Save FAQ
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* 3. GLOBAL SITE SETTINGS */}
        {tab === 'settings' && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await saveSiteSettings(settingsForm);
              setNotice('Global site settings updated.');
            }}
            className="bg-white rounded-xl border border-[#26312D]/12 p-5 sm:p-6 space-y-4 max-w-3xl"
          >
            <h2 className="text-base font-bold text-[#173F35] font-display">
              Global Site Settings
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">Site Name</label>
                <input
                  type="text"
                  value={settingsForm.site_name}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, site_name: e.target.value })
                  }
                  className="w-full min-h-[42px] px-3 rounded-lg border border-[#26312D]/20 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Tagline</label>
                <input
                  type="text"
                  value={settingsForm.tagline}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, tagline: e.target.value })
                  }
                  className="w-full min-h-[42px] px-3 rounded-lg border border-[#26312D]/20 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Contact Email</label>
                <input
                  type="email"
                  value={settingsForm.contact_email}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, contact_email: e.target.value })
                  }
                  className="w-full min-h-[42px] px-3 rounded-lg border border-[#26312D]/20 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={settingsForm.contact_phone}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, contact_phone: e.target.value })
                  }
                  className="w-full min-h-[42px] px-3 rounded-lg border border-[#26312D]/20 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Footer About Text</label>
              <textarea
                rows={2}
                value={settingsForm.footer_about}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, footer_about: e.target.value })
                }
                className="w-full p-3 rounded-lg border border-[#26312D]/20 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Assumption &amp; Financial Disclaimer Text
              </label>
              <textarea
                rows={2}
                value={settingsForm.disclaimer_text}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, disclaimer_text: e.target.value })
                }
                className="w-full p-3 rounded-lg border border-[#26312D]/20 text-sm"
              />
            </div>
            <button
              type="submit"
              className="min-h-[44px] px-5 py-2 rounded-lg bg-[#173F35] text-white text-sm font-semibold"
            >
              Save Global Settings
            </button>
          </form>
        )}

        {/* 4. PLANNER TEMPLATES */}
        {tab === 'templates' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-5 bg-white rounded-xl border border-[#26312D]/12 p-5 space-y-3">
              <h2 className="text-base font-bold text-[#173F35] font-display">
                Global Starter Templates
              </h2>
              <div className="divide-y divide-[#26312D]/10">
                {plannerTemplates.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => {
                      setEditingTemplate(tpl);
                      setTplJson(JSON.stringify(tpl.default_assumptions, null, 2));
                    }}
                    className="w-full py-3 text-left hover:bg-[#F7F6F0]/60 px-2 rounded"
                  >
                    <p className="text-xs font-semibold uppercase text-[#4F8A5B]">
                      {tpl.bird_type} · {tpl.is_active ? 'Active' : 'Inactive'}
                    </p>
                    <p className="text-sm font-bold text-[#173F35]">{tpl.template_name}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-7 bg-white rounded-xl border border-[#26312D]/12 p-5 sm:p-6">
              {!editingTemplate ? (
                <p className="text-sm text-[#26312D]/70 py-8 text-center">
                  Select a Broiler or Layer starter template to update sample chick costs, feed prices, or stage presets globally.
                </p>
              ) : (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      const parsed = JSON.parse(tplJson) as Record<string, unknown>;
                      await savePlannerTemplate({
                        ...editingTemplate,
                        default_assumptions: parsed,
                      });
                      setNotice(`Updated template "${editingTemplate.template_name}".`);
                    } catch {
                      setNotice('Invalid JSON in default_assumptions.');
                    }
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-medium mb-1">Template Name</label>
                    <input
                      type="text"
                      value={editingTemplate.template_name}
                      onChange={(e) =>
                        setEditingTemplate({ ...editingTemplate, template_name: e.target.value })
                      }
                      className="w-full min-h-[42px] px-3 rounded-lg border border-[#26312D]/20 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Description</label>
                    <input
                      type="text"
                      value={editingTemplate.description}
                      onChange={(e) =>
                        setEditingTemplate({ ...editingTemplate, description: e.target.value })
                      }
                      className="w-full min-h-[42px] px-3 rounded-lg border border-[#26312D]/20 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Default Assumptions &amp; Feed Stages (JSON)
                    </label>
                    <textarea
                      rows={12}
                      value={tplJson}
                      onChange={(e) => setTplJson(e.target.value)}
                      className="w-full p-3 rounded-lg border border-[#26312D]/20 font-mono text-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    className="min-h-[44px] px-5 py-2 rounded-lg bg-[#173F35] text-white text-sm font-semibold"
                  >
                    Save Template
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* 5. VISITOR FEATURE SUGGESTIONS */}
        {tab === 'suggestions' && (
          <div className="bg-white rounded-xl border border-[#26312D]/12 p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-[#173F35] font-display">
                  Visitor Feature Ideas &amp; Feedback
                </h2>
                <p className="text-xs text-[#26312D]/70">
                  Submitted directly from the homepage Feature Suggestion form.
                </p>
              </div>
              <span className="text-xs font-semibold text-[#4F8A5B] tabular-nums">
                {featureSuggestions.length} total
              </span>
            </div>

            {featureSuggestions.length === 0 ? (
              <p className="text-sm text-[#26312D]/70 py-8 text-center">
                No visitor feature suggestions recorded yet.
              </p>
            ) : (
              <div className="divide-y divide-[#26312D]/10">
                {featureSuggestions.map((item) => (
                  <div
                    key={item.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-bold text-[#173F35]">{item.name}</span>
                        {item.contact && (
                          <span className="text-[#26312D]/70">· {item.contact}</span>
                        )}
                        <span className="px-2 py-0.5 rounded bg-[#F7F6F0] text-[#4F8A5B] font-semibold">
                          {item.category}
                        </span>
                        <span className="text-[#26312D]/55 tabular-nums">
                          {new Date(item.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-[#26312D]/85 leading-relaxed">{item.suggestion}</p>
                    </div>
                    <div className="shrink-0">
                      <select
                        value={item.status}
                        onChange={(e) => {
                          void updateFeatureSuggestionStatus(
                            item.id,
                            e.target.value as FeatureSuggestion['status']
                          );
                          setNotice(`Marked suggestion as "${e.target.value}".`);
                        }}
                        className="min-h-[38px] px-3 rounded-lg border border-[#26312D]/20 bg-white text-xs font-semibold text-[#173F35]"
                      >
                        <option value="new">New</option>
                        <option value="planned">Planned</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
};
