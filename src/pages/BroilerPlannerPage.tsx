import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Calculator,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Play,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react';
import { AppShell } from '@/src/components/AppShell';
import { ConvertCycleModal } from '@/src/components/ConvertCycleModal';
import { useAuth } from '@/src/context/AuthContext';
import { useData } from '@/src/context/DataContext';
import { calculateBroilerPlan } from '@/src/lib/calculators/broiler';
import { formatCurrency, formatNumber } from '@/src/lib/calculators/format';
import { DEFAULT_BROILER_INPUT } from '@/src/lib/defaults';
import { exportRowsToCsv } from '@/src/lib/export';
import type {
  BroilerFeedStage,
  BroilerPlanInput,
  PlannerExpenseItem,
  ProductionPlan,
} from '@/src/types/domain';

export const BroilerPlannerPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planIdParam = searchParams.get('planId');

  const { profile, refreshGuestCount } = useAuth();
  const { farms, plans, plannerTemplates, savePlan, deletePlan, siteSettings } = useData();
  const currency = profile?.default_currency || '₦';

  const broilerTemplates = useMemo(
    () => plannerTemplates.filter((t) => t.bird_type === 'broiler' && t.is_active),
    [plannerTemplates]
  );

  const broilerPlans = useMemo(
    () => plans.filter((p) => p.bird_type === 'broiler'),
    [plans]
  );

  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planName, setPlanName] = useState<string>('Broiler Batch Budget');
  const [farmId, setFarmId] = useState<string>('');
  const [isSampleTemplate, setIsSampleTemplate] = useState<boolean>(true);
  const [input, setInput] = useState<BroilerPlanInput>(DEFAULT_BROILER_INPUT);
  const [showFormulas, setShowFormulas] = useState<boolean>(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [convertingPlan, setConvertingPlan] = useState<ProductionPlan | null>(null);

  // Load plan from URL if provided
  useEffect(() => {
    if (!planIdParam) return;
    const found = plans.find((p) => p.id === planIdParam && p.bird_type === 'broiler');
    if (found) {
      setEditingPlanId(found.id);
      setPlanName(found.plan_name);
      setFarmId(found.farm_id || '');
      setInput(found.assumptions as unknown as BroilerPlanInput);
      setIsSampleTemplate(false);
    }
  }, [planIdParam, plans]);

  const result = useMemo(() => calculateBroilerPlan(input, currency), [input, currency]);

  const loadTemplate = (templateId: string) => {
    const tpl = broilerTemplates.find((t) => t.id === templateId);
    if (!tpl) return;
    setEditingPlanId(null);
    setPlanName(tpl.template_name.split('(')[0].trim());
    setInput(tpl.default_assumptions as unknown as BroilerPlanInput);
    setIsSampleTemplate(true);
    setSaveFeedback(null);
  };

  const handleClearToZero = () => {
    setEditingPlanId(null);
    setPlanName('Custom Broiler Plan');
    setIsSampleTemplate(false);
    setInput({
      startingBirds: 0,
      pricePerChick: 0,
      durationDays: 42,
      mortalityRatePercent: 0,
      targetAvgWeightKg: 2.0,
      sellingMethod: 'per_bird',
      sellingPricePerBird: 0,
      sellingPricePerKg: 0,
      feedStages: [
        {
          id: crypto.randomUUID(),
          stageName: 'Starter',
          durationDays: 14,
          feedPerBirdKg: 0,
          bagWeightKg: profile?.default_bag_weight_kg || 25,
          pricePerBag: 0,
        },
      ],
      expenseItems: [],
    });
  };

  const addFeedStage = () => {
    setInput((prev) => ({
      ...prev,
      feedStages: [
        ...prev.feedStages,
        {
          id: crypto.randomUUID(),
          stageName: `Stage ${prev.feedStages.length + 1}`,
          durationDays: 14,
          feedPerBirdKg: 1.0,
          bagWeightKg: profile?.default_bag_weight_kg || 25,
          pricePerBag: 20000,
        },
      ],
    }));
  };

  const updateStage = (id: string, patch: Partial<BroilerFeedStage>) => {
    setInput((prev) => ({
      ...prev,
      feedStages: prev.feedStages.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  };

  const removeStage = (id: string) => {
    setInput((prev) => ({
      ...prev,
      feedStages: prev.feedStages.filter((s) => s.id !== id),
    }));
  };

  const addExpenseItem = () => {
    setInput((prev) => ({
      ...prev,
      expenseItems: [
        ...prev.expenseItems,
        {
          id: crypto.randomUUID(),
          category: 'Medication',
          description: '',
          amount: 0,
          isCapex: false,
          amortizationCycles: 1,
        },
      ],
    }));
  };

  const updateExpense = (id: string, patch: Partial<PlannerExpenseItem>) => {
    setInput((prev) => ({
      ...prev,
      expenseItems: prev.expenseItems.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
  };

  const removeExpense = (id: string) => {
    setInput((prev) => ({
      ...prev,
      expenseItems: prev.expenseItems.filter((e) => e.id !== id),
    }));
  };

  const handleSavePlan = async (asDuplicate = false): Promise<ProductionPlan> => {
    const saved = await savePlan({
      id: asDuplicate ? undefined : editingPlanId || undefined,
      farm_id: farmId || null,
      plan_name: asDuplicate ? `${planName} (Copy)` : planName.trim() || 'Broiler Plan',
      bird_type: 'broiler',
      assumptions: input as unknown as Record<string, unknown>,
      feed_stages: input.feedStages,
      expense_items: input.expenseItems,
    });
    setEditingPlanId(saved.id);
    if (asDuplicate) setPlanName(saved.plan_name);
    setIsSampleTemplate(false);
    await refreshGuestCount();
    setSaveFeedback('Plan saved to device and queued for cloud sync.');
    return saved;
  };

  const handleConvertClick = async () => {
    const saved = await handleSavePlan(false);
    setConvertingPlan(saved);
  };

  const handleExportCsv = () => {
    exportRowsToCsv(
      `broiler-plan-${planName.toLowerCase().replace(/\s+/g, '-')}`,
      ['Metric', 'Value'],
      [
        ['Plan Name', planName],
        ['Starting Birds', input.startingBirds],
        ['Expected Surviving Birds', result.survivingBirds],
        ['Chick Cost', result.chickCost],
        ['Total Feed Required (kg)', result.totalFeedKg.toFixed(1)],
        ['Total Whole Feed Bags', result.totalWholeBags],
        ['Total Feed Cost', result.totalFeedCost],
        ['Recurring OpEx', result.recurringOpex],
        ['Amortized CapEx', result.amortizedCapex],
        ['Total Production Cost', result.totalProductionCost],
        ['Projected Revenue', result.projectedRevenue],
        ['Estimated Net Profit', result.netProfit],
        ['Profit Margin (%)', result.profitMarginPercent.toFixed(1)],
        ['Break-Even Price / Bird', result.breakEvenPricePerBird.toFixed(2)],
        ['Break-Even Price / Kg', result.breakEvenPricePerKg.toFixed(2)],
        ['Projected FCR', result.projectedFcr.toFixed(2)],
      ]
    );
  };

  return (
    <AppShell
      title="Broiler Production Planner"
      subtitle="Stage-adjusted feed calculation, mortality distribution, and break-even modeling"
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleSavePlan(false)}
            className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#173F35] text-white text-xs font-semibold hover:bg-[#173F35]/90 whitespace-nowrap"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Plan</span>
          </button>
          <button
            type="button"
            onClick={() => void handleConvertClick()}
            className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#E6B84A] text-[#173F35] text-xs font-bold hover:bg-[#E6B84A]/90 whitespace-nowrap"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Convert to Active Cycle</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Template & Saved Plan Toolbar */}
        <div className="bg-white rounded-xl border border-[#26312D]/12 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <select
              aria-label="Load starter template"
              onChange={(e) => {
                if (e.target.value) loadTemplate(e.target.value);
              }}
              defaultValue=""
              className="min-h-[42px] px-3 rounded-lg border border-[#26312D]/20 bg-[#F7F6F0] text-xs sm:text-sm font-medium"
            >
              <option value="" disabled>
                Load Starter Preset...
              </option>
              {broilerTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.template_name}
                </option>
              ))}
            </select>

            {broilerPlans.length > 0 && (
              <select
                aria-label="Open saved plan"
                value={editingPlanId || ''}
                onChange={(e) => {
                  const found = broilerPlans.find((p) => p.id === e.target.value);
                  if (found) {
                    setEditingPlanId(found.id);
                    setPlanName(found.plan_name);
                    setFarmId(found.farm_id || '');
                    setInput(found.assumptions as unknown as BroilerPlanInput);
                    setIsSampleTemplate(false);
                  }
                }}
                className="min-h-[42px] px-3 rounded-lg border border-[#26312D]/20 bg-white text-xs sm:text-sm font-medium"
              >
                <option value="">Saved Broiler Plans ({broilerPlans.length})</option>
                {broilerPlans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.plan_name} ({p.status})
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={handleClearToZero}
              className="min-h-[42px] inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#26312D]/20 text-xs font-semibold text-[#26312D] hover:bg-[#F7F6F0]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear to Zero</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isSampleTemplate && (
              <span className="text-xs font-medium text-[#4F8A5B]">
                Sample Estimate — Adjust to your farm prices
              </span>
            )}
            <button
              type="button"
              onClick={() => void handleSavePlan(true)}
              className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#26312D]/20 text-xs font-semibold hover:bg-[#F7F6F0]"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Duplicate</span>
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#26312D]/20 text-xs font-semibold hover:bg-[#F7F6F0]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            {editingPlanId && (
              <button
                type="button"
                onClick={async () => {
                  await deletePlan(editingPlanId);
                  handleClearToZero();
                }}
                className="min-h-[40px] inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-xs font-semibold text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>

        {saveFeedback && (
          <div className="rounded-lg bg-[#4F8A5B]/15 border border-[#4F8A5B]/30 px-4 py-2.5 text-xs font-semibold text-[#173F35]">
            {saveFeedback}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Inputs */}
          <div className="lg:col-span-7 space-y-6">
            {/* Flock & Pricing Card */}
            <div className="bg-white rounded-xl border border-[#26312D]/12 p-5 sm:p-6 space-y-4">
              <h2 className="text-base font-bold text-[#173F35] font-display">
                1. Flock Assumptions &amp; Selling Mode
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#26312D] mb-1">
                    Plan Name
                  </label>
                  <input
                    type="text"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 rounded-lg border border-[#26312D]/20 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#26312D] mb-1">
                    Farm (optional)
                  </label>
                  <select
                    value={farmId}
                    onChange={(e) => setFarmId(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-lg border border-[#26312D]/20 bg-white text-sm"
                  >
                    <option value="">No specific farm</option>
                    {farms.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.farm_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#26312D] mb-1">
                    Starting Chicks
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={input.startingBirds}
                    onChange={(e) =>
                      setInput((p) => ({ ...p, startingBirds: Math.max(0, Number(e.target.value)) }))
                    }
                    className="w-full min-h-[44px] px-3 rounded-lg border border-[#26312D]/20 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#26312D] mb-1">
                    Price / Chick ({currency})
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={input.pricePerChick}
                    onChange={(e) =>
                      setInput((p) => ({ ...p, pricePerChick: Math.max(0, Number(e.target.value)) }))
                    }
                    className="w-full min-h-[44px] px-3 rounded-lg border border-[#26312D]/20 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#26312D] mb-1">
                    Duration (Days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={input.durationDays}
                    onChange={(e) =>
                      setInput((p) => ({ ...p, durationDays: Math.max(1, Number(e.target.value)) }))
                    }
                    className="w-full min-h-[44px] px-3 rounded-lg border border-[#26312D]/20 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#26312D] mb-1">
                    Expected Mortality (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={input.mortalityRatePercent}
                    onChange={(e) =>
                      setInput((p) => ({
                        ...p,
                        mortalityRatePercent: Math.min(100, Math.max(0, Number(e.target.value))),
                      }))
                    }
                    className="w-full min-h-[44px] px-3 rounded-lg border border-[#26312D]/20 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#26312D] mb-1">
                    Target Weight ({profile?.weight_unit || 'kg'})
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={input.targetAvgWeightKg}
                    onChange={(e) =>
                      setInput((p) => ({
                        ...p,
                        targetAvgWeightKg: Math.max(0, Number(e.target.value)),
                      }))
                    }
                    className="w-full min-h-[44px] px-3 rounded-lg border border-[#26312D]/20 text-sm tabular-nums"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-[#26312D]/10 grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                <div>
                  <label className="block text-xs font-medium text-[#26312D] mb-1">
                    Primary Selling Method (Prevents Double-Counting)
                  </label>
                  <div className="grid grid-cols-2 p-1 rounded-lg bg-[#F7F6F0] border border-[#26312D]/10">
                    <button
                      type="button"
                      onClick={() => setInput((p) => ({ ...p, sellingMethod: 'per_bird' }))}
                      className={`min-h-[38px] rounded-md text-xs font-semibold ${
                        input.sellingMethod === 'per_bird'
                          ? 'bg-[#173F35] text-white'
                          : 'text-[#26312D]'
                      }`}
                    >
                      Sell Per Bird
                    </button>
                    <button
                      type="button"
                      onClick={() => setInput((p) => ({ ...p, sellingMethod: 'per_kg' }))}
                      className={`min-h-[38px] rounded-md text-xs font-semibold ${
                        input.sellingMethod === 'per_kg'
                          ? 'bg-[#173F35] text-white'
                          : 'text-[#26312D]'
                      }`}
                    >
                      Sell Per Kg
                    </button>
                  </div>
                </div>

                <div>
                  {input.sellingMethod === 'per_bird' ? (
                    <>
                      <label className="block text-xs font-medium text-[#26312D] mb-1">
                        Selling Price / Bird ({currency})
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={input.sellingPricePerBird}
                        onChange={(e) =>
                          setInput((p) => ({
                            ...p,
                            sellingPricePerBird: Math.max(0, Number(e.target.value)),
                          }))
                        }
                        className="w-full min-h-[44px] px-3 rounded-lg border border-[#26312D]/20 text-sm tabular-nums"
                      />
                    </>
                  ) : (
                    <>
                      <label className="block text-xs font-medium text-[#26312D] mb-1">
                        Selling Price / Kg ({currency})
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={input.sellingPricePerKg}
                        onChange={(e) =>
                          setInput((p) => ({
                            ...p,
                            sellingPricePerKg: Math.max(0, Number(e.target.value)),
                          }))
                        }
                        className="w-full min-h-[44px] px-3 rounded-lg border border-[#26312D]/20 text-sm tabular-nums"
                      />
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Editable Feed Stages */}
            <div className="bg-white rounded-xl border border-[#26312D]/12 p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-[#173F35] font-display">
                    2. Editable Feed Stages
                  </h2>
                  <p className="text-xs text-[#26312D]/70">
                    Rename stages, adjust days, kg/bird, bag weight, and bag price.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addFeedStage}
                  className="min-h-[38px] inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#173F35]/25 text-xs font-semibold text-[#173F35] hover:bg-[#F7F6F0]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Stage</span>
                </button>
              </div>

              <div className="space-y-3">
                {input.feedStages.map((stage) => (
                  <div
                    key={stage.id}
                    className="p-3.5 rounded-xl bg-[#F7F6F0] border border-[#26312D]/10 grid grid-cols-2 sm:grid-cols-12 gap-3 items-end"
                  >
                    <div className="col-span-2 sm:col-span-3">
                      <label className="block text-[11px] font-medium text-[#26312D]/75 mb-1">
                        Stage Name
                      </label>
                      <input
                        type="text"
                        value={stage.stageName}
                        onChange={(e) => updateStage(stage.id, { stageName: e.target.value })}
                        className="w-full min-h-[40px] px-2.5 rounded-lg border border-[#26312D]/20 bg-white text-xs sm:text-sm"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium text-[#26312D]/75 mb-1">
                        Days
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={stage.durationDays}
                        onChange={(e) =>
                          updateStage(stage.id, { durationDays: Math.max(1, Number(e.target.value)) })
                        }
                        className="w-full min-h-[40px] px-2.5 rounded-lg border border-[#26312D]/20 bg-white text-xs sm:text-sm tabular-nums"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium text-[#26312D]/75 mb-1">
                        Kg / Bird
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={0.05}
                        value={stage.feedPerBirdKg}
                        onChange={(e) =>
                          updateStage(stage.id, { feedPerBirdKg: Math.max(0, Number(e.target.value)) })
                        }
                        className="w-full min-h-[40px] px-2.5 rounded-lg border border-[#26312D]/20 bg-white text-xs sm:text-sm tabular-nums"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium text-[#26312D]/75 mb-1">
                        Bag (kg)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={stage.bagWeightKg}
                        onChange={(e) =>
                          updateStage(stage.id, { bagWeightKg: Math.max(1, Number(e.target.value)) })
                        }
                        className="w-full min-h-[40px] px-2.5 rounded-lg border border-[#26312D]/20 bg-white text-xs sm:text-sm tabular-nums"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium text-[#26312D]/75 mb-1">
                        Price/Bag ({currency})
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={stage.pricePerBag}
                        onChange={(e) =>
                          updateStage(stage.id, { pricePerBag: Math.max(0, Number(e.target.value)) })
                        }
                        className="w-full min-h-[40px] px-2.5 rounded-lg border border-[#26312D]/20 bg-white text-xs sm:text-sm tabular-nums"
                      />
                    </div>
                    <div className="sm:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeStage(stage.id)}
                        aria-label="Remove feed stage"
                        className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Itemized Other Expenses (OpEx vs CapEx) */}
            <div className="bg-white rounded-xl border border-[#26312D]/12 p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-[#173F35] font-display">
                    3. Other Expenses (OpEx &amp; Amortized CapEx)
                  </h2>
                  <p className="text-xs text-[#26312D]/70">
                    Mark durable equipment as CapEx to spread its cost across multiple cycles.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addExpenseItem}
                  className="min-h-[38px] inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#173F35]/25 text-xs font-semibold text-[#173F35] hover:bg-[#F7F6F0]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Expense</span>
                </button>
              </div>

              {input.expenseItems.length === 0 ? (
                <p className="text-xs text-[#26312D]/65 py-2">No other expenses added.</p>
              ) : (
                <div className="space-y-3">
                  {input.expenseItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl bg-[#F7F6F0] border border-[#26312D]/10 grid grid-cols-2 sm:grid-cols-12 gap-3 items-end"
                    >
                      <div className="col-span-2 sm:col-span-3">
                        <label className="block text-[11px] font-medium text-[#26312D]/75 mb-1">
                          Category
                        </label>
                        <input
                          type="text"
                          value={item.category}
                          onChange={(e) => updateExpense(item.id, { category: e.target.value })}
                          className="w-full min-h-[40px] px-2.5 rounded-lg border border-[#26312D]/20 bg-white text-xs sm:text-sm"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-3">
                        <label className="block text-[11px] font-medium text-[#26312D]/75 mb-1">
                          Description
                        </label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateExpense(item.id, { description: e.target.value })}
                          className="w-full min-h-[40px] px-2.5 rounded-lg border border-[#26312D]/20 bg-white text-xs sm:text-sm"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-medium text-[#26312D]/75 mb-1">
                          Amount ({currency})
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={item.amount}
                          onChange={(e) =>
                            updateExpense(item.id, { amount: Math.max(0, Number(e.target.value)) })
                          }
                          className="w-full min-h-[40px] px-2.5 rounded-lg border border-[#26312D]/20 bg-white text-xs sm:text-sm tabular-nums"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-medium text-[#26312D]/75 mb-1">
                          Cost Type
                        </label>
                        <select
                          value={item.isCapex ? 'capex' : 'opex'}
                          onChange={(e) =>
                            updateExpense(item.id, {
                              isCapex: e.target.value === 'capex',
                              amortizationCycles:
                                e.target.value === 'capex' ? Math.max(2, item.amortizationCycles || 4) : 1,
                            })
                          }
                          className="w-full min-h-[40px] px-2 rounded-lg border border-[#26312D]/20 bg-white text-xs"
                        >
                          <option value="opex">OpEx (100%)</option>
                          <option value="capex">CapEx (Amort.)</option>
                        </select>
                      </div>
                      <div className="sm:col-span-1">
                        {item.isCapex && (
                          <>
                            <label className="block text-[11px] font-medium text-[#26312D]/75 mb-1">
                              Cycles
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={item.amortizationCycles}
                              onChange={(e) =>
                                updateExpense(item.id, {
                                  amortizationCycles: Math.max(1, Number(e.target.value)),
                                })
                              }
                              className="w-full min-h-[40px] px-2 rounded-lg border border-[#26312D]/20 bg-white text-xs tabular-nums"
                            />
                          </>
                        )}
                      </div>
                      <div className="sm:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => removeExpense(item.id)}
                          aria-label="Remove expense"
                          className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Sticky Output Panel */}
          <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-24">
            <div className="bg-[#173F35] text-white rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/75">
                  Broiler Financial Projection
                </p>
                <span className="text-xs font-semibold text-[#E6B84A] tabular-nums">
                  Margin {formatNumber(result.profitMarginPercent, 1)}%
                </span>
              </div>

              <div>
                <p className="text-xs text-white/75">Estimated Net Profit / Loss</p>
                <p
                  className={`text-3xl font-extrabold font-display tabular-nums mt-0.5 ${
                    result.netProfit >= 0 ? 'text-[#E6B84A]' : 'text-red-300'
                  }`}
                >
                  {formatCurrency(result.netProfit, currency)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/15 text-xs">
                <div>
                  <p className="text-white/70">Total Production Cost</p>
                  <p className="text-base font-bold tabular-nums mt-0.5">
                    {formatCurrency(result.totalProductionCost, currency)}
                  </p>
                </div>
                <div>
                  <p className="text-white/70">Projected Revenue</p>
                  <p className="text-base font-bold tabular-nums mt-0.5">
                    {formatCurrency(result.projectedRevenue, currency)}
                  </p>
                </div>
                <div>
                  <p className="text-white/70">Surviving Birds</p>
                  <p className="text-sm font-semibold tabular-nums mt-0.5">
                    {formatNumber(result.survivingBirds)} / {formatNumber(result.startingBirds)}
                  </p>
                </div>
                <div>
                  <p className="text-white/70">Projected FCR</p>
                  <p className="text-sm font-semibold tabular-nums mt-0.5">
                    {formatNumber(result.projectedFcr, 2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Unit Economics & Cost Breakdown */}
            <div className="bg-white rounded-xl border border-[#26312D]/12 p-5 space-y-3">
              <h3 className="text-sm font-bold text-[#173F35] font-display">
                Cost &amp; Break-Even Breakdown
              </h3>
              <dl className="divide-y divide-[#26312D]/10 text-xs sm:text-sm">
                <div className="py-2 flex justify-between">
                  <dt className="text-[#26312D]/75">Day-Old Chicks</dt>
                  <dd className="font-semibold tabular-nums">{formatCurrency(result.chickCost, currency)}</dd>
                </div>
                <div className="py-2 flex justify-between">
                  <dt className="text-[#26312D]/75">
                    Total Feed ({formatNumber(result.totalWholeBags)} bags · {formatNumber(result.totalFeedKg, 1)} kg)
                  </dt>
                  <dd className="font-semibold tabular-nums">{formatCurrency(result.totalFeedCost, currency)}</dd>
                </div>
                <div className="py-2 flex justify-between">
                  <dt className="text-[#26312D]/75">Recurring OpEx</dt>
                  <dd className="font-semibold tabular-nums">{formatCurrency(result.recurringOpex, currency)}</dd>
                </div>
                <div className="py-2 flex justify-between">
                  <dt className="text-[#26312D]/75">Amortized CapEx (this cycle)</dt>
                  <dd className="font-semibold tabular-nums">{formatCurrency(result.amortizedCapex, currency)}</dd>
                </div>
                <div className="py-2 flex justify-between">
                  <dt className="text-[#26312D]/75">Break-Even Price / Bird</dt>
                  <dd className="font-bold text-[#173F35] tabular-nums">
                    {formatCurrency(result.breakEvenPricePerBird, currency)}
                  </dd>
                </div>
                <div className="py-2 flex justify-between">
                  <dt className="text-[#26312D]/75">Break-Even Price / Kg</dt>
                  <dd className="font-bold text-[#173F35] tabular-nums">
                    {formatCurrency(result.breakEvenPricePerKg, currency)}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Stage-by-Stage Whole Bags Table */}
            <div className="bg-white rounded-xl border border-[#26312D]/12 p-5 space-y-3 overflow-x-auto">
              <h3 className="text-sm font-bold text-[#173F35] font-display">
                Stage-Adjusted Feed Requirements
              </h3>
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#26312D]/10 text-[#26312D]/65">
                    <th className="py-2 pr-2 font-semibold">Stage</th>
                    <th className="py-2 px-2 font-semibold text-right">Eff. Birds</th>
                    <th className="py-2 px-2 font-semibold text-right">Exact Kg</th>
                    <th className="py-2 px-2 font-semibold text-right">Whole Bags</th>
                    <th className="py-2 pl-2 font-semibold text-right">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#26312D]/10 tabular-nums">
                  {result.stageBreakdown.map((st) => (
                    <tr key={st.id}>
                      <td className="py-2 pr-2 font-medium text-[#173F35]">{st.stageName}</td>
                      <td className="py-2 px-2 text-right">{formatNumber(st.effectiveBirds, 0)}</td>
                      <td className="py-2 px-2 text-right">{formatNumber(st.exactKgRequired, 1)}</td>
                      <td className="py-2 px-2 text-right font-bold">{formatNumber(st.wholeBagsToPurchase)}</td>
                      <td className="py-2 pl-2 text-right">{formatCurrency(st.stageFeedCost, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Formula Drawer */}
            <div className="bg-white rounded-xl border border-[#26312D]/12 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowFormulas((v) => !v)}
                className="w-full min-h-[44px] px-4 py-3 flex items-center justify-between text-xs font-semibold text-[#173F35]"
              >
                <span className="inline-flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-[#4F8A5B]" />
                  How this was calculated
                </span>
                {showFormulas ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showFormulas && (
                <div className="px-4 pb-4 pt-2 border-t border-[#26312D]/10 text-xs text-[#26312D]/80 space-y-2 bg-[#F7F6F0]/40">
                  <p>{result.howCalculated.mortalityFormula}</p>
                  <p>{result.howCalculated.feedFormula}</p>
                  <p>{result.howCalculated.revenueFormula}</p>
                  <p>{result.howCalculated.breakEvenFormula}</p>
                  <p>{result.howCalculated.fcrFormula}</p>
                </div>
              )}
            </div>

            <p className="text-xs text-[#26312D]/65 leading-relaxed">
              {siteSettings.disclaimer_text}
            </p>
          </div>
        </div>
      </div>

      {convertingPlan && (
        <ConvertCycleModal
          plan={convertingPlan}
          onClose={() => setConvertingPlan(null)}
          onConverted={(cycleId) => {
            setConvertingPlan(null);
            navigate(`/cycles/${cycleId}`);
          }}
        />
      )}
    </AppShell>
  );
};
