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
import { formatCurrency, formatNumber } from '@/src/lib/calculators/format';
import { calculateLayerPlan } from '@/src/lib/calculators/layer';
import { DEFAULT_LAYER_INPUT } from '@/src/lib/defaults';
import { exportRowsToCsv } from '@/src/lib/export';
import type {
  LayerFeedStage,
  LayerPeriodSchedule,
  LayerPlanInput,
  PlannerExpenseItem,
  ProductionPlan,
} from '@/src/types/domain';

export const LayerPlannerPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planIdParam = searchParams.get('planId');

  const { profile, refreshGuestCount } = useAuth();
  const { farms, plans, plannerTemplates, savePlan, deletePlan, siteSettings } = useData();
  const currency = profile?.default_currency || '₦';

  const layerTemplates = useMemo(
    () => plannerTemplates.filter((t) => t.bird_type === 'layer' && t.is_active),
    [plannerTemplates]
  );

  const layerPlans = useMemo(
    () => plans.filter((p) => p.bird_type === 'layer'),
    [plans]
  );

  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planName, setPlanName] = useState<string>('Layer Flock Budget');
  const [farmId, setFarmId] = useState<string>('');
  const [isSampleTemplate, setIsSampleTemplate] = useState<boolean>(true);
  const [input, setInput] = useState<LayerPlanInput>(DEFAULT_LAYER_INPUT);
  const [showFormulas, setShowFormulas] = useState<boolean>(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [convertingPlan, setConvertingPlan] = useState<ProductionPlan | null>(null);

  useEffect(() => {
    if (!planIdParam) return;
    const found = plans.find((p) => p.id === planIdParam && p.bird_type === 'layer');
    if (found) {
      setEditingPlanId(found.id);
      setPlanName(found.plan_name);
      setFarmId(found.farm_id || '');
      setInput(found.assumptions as unknown as LayerPlanInput);
      setIsSampleTemplate(false);
    }
  }, [planIdParam, plans]);

  const result = useMemo(() => calculateLayerPlan(input, currency), [input, currency]);

  const loadTemplate = (templateId: string) => {
    const tpl = layerTemplates.find((t) => t.id === templateId);
    if (!tpl) return;
    setEditingPlanId(null);
    setPlanName(tpl.template_name.split('(')[0].trim());
    setInput(tpl.default_assumptions as unknown as LayerPlanInput);
    setIsSampleTemplate(true);
    setSaveFeedback(null);
  };

  const handleClearToZero = () => {
    setEditingPlanId(null);
    setPlanName('Custom Layer Plan');
    setIsSampleTemplate(false);
    setInput({
      startingBirds: 0,
      entryType: 'day_old_chicks',
      purchasePricePerBird: 0,
      rearingMortalityPercent: 0,
      ageAtFirstLayWeeks: 18,
      layingDurationMonths: 12,
      eggsPerCrate: profile?.default_crate_size || 30,
      eggPricePerCrate: 0,
      spentLayerPricePerBird: 0,
      estimatedManureRevenue: 0,
      feedStages: [
        {
          id: crypto.randomUUID(),
          stageName: 'Layer Mash',
          phase: 'laying',
          durationDays: 365,
          consumptionMode: 'daily_grams',
          dailyGramsPerBird: 115,
          totalKgPerBird: 42,
          bagWeightKg: profile?.default_bag_weight_kg || 25,
          pricePerBag: 0,
        },
      ],
      layingPeriods: [
        { id: crypto.randomUUID(), periodName: 'Month 1', days: 30, layingPercent: 70, mortalityPercent: 0.4 },
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
          stageName: 'Custom Ration',
          phase: 'laying',
          durationDays: 30,
          consumptionMode: 'daily_grams',
          dailyGramsPerBird: 110,
          totalKgPerBird: 3.3,
          bagWeightKg: profile?.default_bag_weight_kg || 25,
          pricePerBag: 19000,
        },
      ],
    }));
  };

  const updateStage = (id: string, patch: Partial<LayerFeedStage>) => {
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

  const addPeriod = () => {
    setInput((prev) => ({
      ...prev,
      layingPeriods: [
        ...prev.layingPeriods,
        {
          id: crypto.randomUUID(),
          periodName: `Month ${prev.layingPeriods.length + 1}`,
          days: 30,
          layingPercent: 75,
          mortalityPercent: 0.5,
        },
      ],
    }));
  };

  const updatePeriod = (id: string, patch: Partial<LayerPeriodSchedule>) => {
    setInput((prev) => ({
      ...prev,
      layingPeriods: prev.layingPeriods.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  };

  const removePeriod = (id: string) => {
    setInput((prev) => ({
      ...prev,
      layingPeriods: prev.layingPeriods.filter((p) => p.id !== id),
    }));
  };

  const addExpense = () => {
    setInput((prev) => ({
      ...prev,
      expenseItems: [
        ...prev.expenseItems,
        {
          id: crypto.randomUUID(),
          category: 'Medication',
          description: '',
          amount: 0,
          phase: 'laying',
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
      plan_name: asDuplicate ? `${planName} (Copy)` : planName.trim() || 'Layer Plan',
      bird_type: 'layer',
      assumptions: input as unknown as Record<string, unknown>,
      feed_stages: input.feedStages,
      expense_items: input.expenseItems,
    });
    setEditingPlanId(saved.id);
    if (asDuplicate) setPlanName(saved.plan_name);
    setIsSampleTemplate(false);
    await refreshGuestCount();
    setSaveFeedback('Layer plan saved to device and queued for cloud sync.');
    return saved;
  };

  const handleConvertClick = async () => {
    const saved = await handleSavePlan(false);
    setConvertingPlan(saved);
  };

  const handleExportCsv = () => {
    exportRowsToCsv(
      `layer-plan-${planName.toLowerCase().replace(/\s+/g, '-')}`,
      ['Metric', 'Value'],
      [
        ['Plan Name', planName],
        ['Entry Type', input.entryType],
        ['Starting Birds', input.startingBirds],
        ['Hens Entering Lay', result.hensEnteringLay],
        ['Surviving Hens at Culling', result.survivingHensAtCulling],
        ['Capitalized Rearing Cost', result.capitalizedRearingCost],
        ['Monthly Amortized Rearing Cost', result.monthlyAmortizedRearingCost],
        ['Laying Period Direct Cost', result.layingPeriodDirectCost],
        ['Cumulative Total Cost', result.cumulativeCost],
        ['Total Eggs Produced', Math.round(result.totalEggs)],
        ['Total Crates', result.totalCrates.toFixed(1)],
        ['Egg Sales Revenue', result.eggRevenue],
        ['Spent Layer & Manure Revenue', result.otherRevenue],
        ['Total Revenue', result.totalRevenue],
        ['Estimated Net Profit', result.netProfit],
        ['Cost Per Crate', result.costPerCrate.toFixed(2)],
        ['Break-Even Price / Crate', result.breakEvenPricePerCrate.toFixed(2)],
        ['Feed Kg / Crate', result.feedKgPerCrate.toFixed(2)],
      ]
    );
  };

  return (
    <AppShell
      title="Layer Production Planner"
      subtitle="Rearing cost capitalization, monthly laying schedule, and crate unit economics"
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
        {/* Toolbar */}
        <div className="bg-white rounded-xl border border-[#26312D]/12 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <select
              aria-label="Load layer starter preset"
              onChange={(e) => {
                if (e.target.value) loadTemplate(e.target.value);
              }}
              defaultValue=""
              className="min-h-[42px] px-3 rounded-lg border border-[#26312D]/20 bg-[#F7F6F0] text-xs sm:text-sm font-medium"
            >
              <option value="" disabled>
                Load Starter Preset...
              </option>
              {layerTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.template_name}
                </option>
              ))}
            </select>

            {layerPlans.length > 0 && (
              <select
                aria-label="Open saved layer plan"
                value={editingPlanId || ''}
                onChange={(e) => {
                  const found = layerPlans.find((p) => p.id === e.target.value);
                  if (found) {
                    setEditingPlanId(found.id);
                    setPlanName(found.plan_name);
                    setFarmId(found.farm_id || '');
                    setInput(found.assumptions as unknown as LayerPlanInput);
                    setIsSampleTemplate(false);
                  }
                }}
                className="min-h-[42px] px-3 rounded-lg border border-[#26312D]/20 bg-white text-xs sm:text-sm font-medium"
              >
                <option value="">Saved Layer Plans ({layerPlans.length})</option>
                {layerPlans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.plan_name} ({p.status})
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={handleClearToZero}
              className="min-h-[42px] inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#26312D]/20 text-xs font-semibold hover:bg-[#F7F6F0]"
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
            {/* Flock & Revenue */}
            <div className="bg-white rounded-xl border border-[#26312D]/12 p-5 sm:p-6 space-y-4">
              <h2 className="text-base font-bold text-[#173F35] font-display">
                1. Flock Stocking &amp; Egg Revenue
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
                    Entry Stock Type
                  </label>
                  <div className="grid grid-cols-2 p-1 rounded-lg bg-[#F7F6F0] border border-[#26312D]/10">
                    <button
                      type="button"
                      onClick={() => setInput((p) => ({ ...p, entryType: 'day_old_chicks' }))}
                      className={`min-h-[38px] rounded-md text-xs font-semibold ${
                        input.entryType === 'day_old_chicks'
                          ? 'bg-[#173F35] text-white'
                          : 'text-[#26312D]'
                      }`}
                    >
                      Day-Old Chicks
                    </button>
                    <button
                      type="button"
                      onClick={() => setInput((p) => ({ ...p, entryType: 'point_of_lay' }))}
                      className={`min-h-[38px] rounded-md text-xs font-semibold ${
                        input.entryType === 'point_of_lay'
                          ? 'bg-[#173F35] text-white'
                          : 'text-[#26312D]'
                      }`}
                    >
                      Point-of-Lay
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#26312D] mb-1">
                    Starting Birds
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
                    Purchase Price / Bird ({currency})
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={input.purchasePricePerBird}
                    onChange={(e) =>
                      setInput((p) => ({
                        ...p,
                        purchasePricePerBird: Math.max(0, Number(e.target.value)),
                      }))
                    }
                    className="w-full min-h-[44px] px-3 rounded-lg border border-[#26312D]/20 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#26312D] mb-1">
                    Rearing Mortality (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={input.rearingMortalityPercent}
                    onChange={(e) =>
                      setInput((p) => ({
                        ...p,
                        rearingMortalityPercent: Math.min(100, Math.max(0, Number(e.target.value))),
                      }))
                    }
                    className="w-full min-h-[44px] px-3 rounded-lg border border-[#26312D]/20 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#26312D] mb-1">
                    Age at First Lay (Weeks)
                  </label>
                  <input
                    type="number"
                    min={12}
                    value={input.ageAtFirstLayWeeks}
                    onChange={(e) =>
                      setInput((p) => ({
                        ...p,
                        ageAtFirstLayWeeks: Math.max(1, Number(e.target.value)),
                      }))
                    }
                    className="w-full min-h-[44px] px-3 rounded-lg border border-[#26312D]/20 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#26312D] mb-1">
                    Laying Months
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={input.layingDurationMonths}
                    onChange={(e) =>
                      setInput((p) => ({
                        ...p,
                        layingDurationMonths: Math.max(1, Number(e.target.value)),
                      }))
                    }
                    className="w-full min-h-[44px] px-3 rounded-lg border border-[#26312D]/20 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#26312D] mb-1">
                    Eggs / Crate
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={input.eggsPerCrate}
                    onChange={(e) =>
                      setInput((p) => ({ ...p, eggsPerCrate: Math.max(1, Number(e.target.value)) }))
                    }
                    className="w-full min-h-[44px] px-3 rounded-lg border border-[#26312D]/20 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#26312D] mb-1">
                    Egg Price / Crate ({currency})
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={input.eggPricePerCrate}
                    onChange={(e) =>
                      setInput((p) => ({
                        ...p,
                        eggPricePerCrate: Math.max(0, Number(e.target.value)),
                      }))
                    }
                    className="w-full min-h-[44px] px-3 rounded-lg border border-[#26312D]/20 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#26312D] mb-1">
                    Spent Layer / Bird ({currency})
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={input.spentLayerPricePerBird}
                    onChange={(e) =>
                      setInput((p) => ({
                        ...p,
                        spentLayerPricePerBird: Math.max(0, Number(e.target.value)),
                      }))
                    }
                    className="w-full min-h-[44px] px-3 rounded-lg border border-[#26312D]/20 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#26312D] mb-1">
                    Manure Revenue ({currency})
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={input.estimatedManureRevenue}
                    onChange={(e) =>
                      setInput((p) => ({
                        ...p,
                        estimatedManureRevenue: Math.max(0, Number(e.target.value)),
                      }))
                    }
                    className="w-full min-h-[44px] px-3 rounded-lg border border-[#26312D]/20 text-sm tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#26312D] mb-1">
                  Assign Farm (optional)
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

            {/* Editable Feeding Stages */}
            <div className="bg-white rounded-xl border border-[#26312D]/12 p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-[#173F35] font-display">
                    2. Feeding Stages (Rearing vs. Laying)
                  </h2>
                  <p className="text-xs text-[#26312D]/70">
                    Rearing feed is capitalized and amortized across laying months.
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
                        Phase
                      </label>
                      <select
                        value={stage.phase}
                        onChange={(e) =>
                          updateStage(stage.id, { phase: e.target.value as 'rearing' | 'laying' })
                        }
                        className="w-full min-h-[40px] px-2 rounded-lg border border-[#26312D]/20 bg-white text-xs"
                      >
                        <option value="rearing">Rearing</option>
                        <option value="laying">Laying</option>
                      </select>
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
                        className="w-full min-h-[40px] px-2 rounded-lg border border-[#26312D]/20 bg-white text-xs tabular-nums"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium text-[#26312D]/75 mb-1">
                        {stage.consumptionMode === 'daily_grams' ? 'g / Bird / Day' : 'Total Kg / Bird'}
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={stage.consumptionMode === 'daily_grams' ? 5 : 0.1}
                        value={
                          stage.consumptionMode === 'daily_grams'
                            ? stage.dailyGramsPerBird
                            : stage.totalKgPerBird
                        }
                        onChange={(e) =>
                          updateStage(
                            stage.id,
                            stage.consumptionMode === 'daily_grams'
                              ? { dailyGramsPerBird: Math.max(0, Number(e.target.value)) }
                              : { totalKgPerBird: Math.max(0, Number(e.target.value)) }
                          )
                        }
                        className="w-full min-h-[40px] px-2 rounded-lg border border-[#26312D]/20 bg-white text-xs tabular-nums"
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
                        className="w-full min-h-[40px] px-2 rounded-lg border border-[#26312D]/20 bg-white text-xs tabular-nums"
                      />
                    </div>
                    <div className="sm:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeStage(stage.id)}
                        className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Period Laying Schedule */}
            <div className="bg-white rounded-xl border border-[#26312D]/12 p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-[#173F35] font-display">
                    3. Period Laying Schedule (Onset → Peak → Late Lay)
                  </h2>
                  <p className="text-xs text-[#26312D]/70">
                    Model monthly hen-day % and mortality period by period.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addPeriod}
                  className="min-h-[38px] inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#173F35]/25 text-xs font-semibold text-[#173F35] hover:bg-[#F7F6F0]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Period</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-[#26312D]/10 text-[#26312D]/70">
                      <th className="py-2 pr-2 font-semibold">Period</th>
                      <th className="py-2 px-2 font-semibold">Days</th>
                      <th className="py-2 px-2 font-semibold">Lay %</th>
                      <th className="py-2 px-2 font-semibold">Mort %</th>
                      <th className="py-2 px-2 font-semibold text-right">Crates</th>
                      <th className="py-2 pl-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#26312D]/10 tabular-nums">
                    {input.layingPeriods.map((period, idx) => {
                      const calc = result.periodBreakdown[idx];
                      return (
                        <tr key={period.id}>
                          <td className="py-1.5 pr-2">
                            <input
                              type="text"
                              value={period.periodName}
                              onChange={(e) =>
                                updatePeriod(period.id, { periodName: e.target.value })
                              }
                              className="w-32 sm:w-36 min-h-[36px] px-2 rounded border border-[#26312D]/20"
                            />
                          </td>
                          <td className="py-1.5 px-2">
                            <input
                              type="number"
                              min={1}
                              value={period.days}
                              onChange={(e) =>
                                updatePeriod(period.id, { days: Math.max(1, Number(e.target.value)) })
                              }
                              className="w-16 min-h-[36px] px-2 rounded border border-[#26312D]/20"
                            />
                          </td>
                          <td className="py-1.5 px-2">
                            <input
                              type="number"
                              min={0}
                              max={110}
                              value={period.layingPercent}
                              onChange={(e) =>
                                updatePeriod(period.id, {
                                  layingPercent: Math.min(110, Math.max(0, Number(e.target.value))),
                                })
                              }
                              className="w-16 min-h-[36px] px-2 rounded border border-[#26312D]/20"
                            />
                          </td>
                          <td className="py-1.5 px-2">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={0.1}
                              value={period.mortalityPercent}
                              onChange={(e) =>
                                updatePeriod(period.id, {
                                  mortalityPercent: Math.min(100, Math.max(0, Number(e.target.value))),
                                })
                              }
                              className="w-16 min-h-[36px] px-2 rounded border border-[#26312D]/20"
                            />
                          </td>
                          <td className="py-1.5 px-2 text-right font-semibold text-[#173F35]">
                            {formatNumber(calc?.cratesProduced ?? 0, 0)}
                          </td>
                          <td className="py-1.5 pl-2 text-right">
                            <button
                              type="button"
                              onClick={() => removePeriod(period.id)}
                              className="p-1.5 text-red-700 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Expenses */}
            <div className="bg-white rounded-xl border border-[#26312D]/12 p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#173F35] font-display">
                  4. Rearing &amp; Laying Expenses
                </h2>
                <button
                  type="button"
                  onClick={addExpense}
                  className="min-h-[38px] inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#173F35]/25 text-xs font-semibold text-[#173F35] hover:bg-[#F7F6F0]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Expense</span>
                </button>
              </div>
              <div className="space-y-3">
                {input.expenseItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-[#F7F6F0] border border-[#26312D]/10 grid grid-cols-2 sm:grid-cols-12 gap-2.5 items-end"
                  >
                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-medium text-[#26312D]/75 mb-1">
                        Category
                      </label>
                      <input
                        type="text"
                        value={item.category}
                        onChange={(e) => updateExpense(item.id, { category: e.target.value })}
                        className="w-full min-h-[38px] px-2.5 rounded-lg border border-[#26312D]/20 bg-white text-xs"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium text-[#26312D]/75 mb-1">
                        Phase
                      </label>
                      <select
                        value={item.phase || 'laying'}
                        onChange={(e) =>
                          updateExpense(item.id, { phase: e.target.value as 'rearing' | 'laying' })
                        }
                        className="w-full min-h-[38px] px-2 rounded-lg border border-[#26312D]/20 bg-white text-xs"
                      >
                        <option value="rearing">Rearing</option>
                        <option value="laying">Laying</option>
                      </select>
                    </div>
                    <div className="sm:col-span-3">
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
                        className="w-full min-h-[38px] px-2.5 rounded-lg border border-[#26312D]/20 bg-white text-xs tabular-nums"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-medium text-[#26312D]/75 mb-1">
                        Type (Amortize)
                      </label>
                      <div className="flex items-center gap-1">
                        <select
                          value={item.isCapex ? 'capex' : 'opex'}
                          onChange={(e) =>
                            updateExpense(item.id, {
                              isCapex: e.target.value === 'capex',
                              amortizationCycles:
                                e.target.value === 'capex'
                                  ? Math.max(2, item.amortizationCycles || 4)
                                  : 1,
                            })
                          }
                          className="w-full min-h-[38px] px-1.5 rounded-lg border border-[#26312D]/20 bg-white text-xs"
                        >
                          <option value="opex">OpEx</option>
                          <option value="capex">CapEx</option>
                        </select>
                        {item.isCapex && (
                          <input
                            type="number"
                            min={1}
                            value={item.amortizationCycles}
                            onChange={(e) =>
                              updateExpense(item.id, {
                                amortizationCycles: Math.max(1, Number(e.target.value)),
                              })
                            }
                            className="w-12 min-h-[38px] px-1.5 rounded-lg border border-[#26312D]/20 bg-white text-xs tabular-nums"
                          />
                        )}
                      </div>
                    </div>
                    <div className="sm:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeExpense(item.id)}
                        className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-lg text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Output Panel */}
          <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-24">
            <div className="bg-[#173F35] text-white rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/75">
                  Layer Full-Cycle Projection
                </p>
                <span className="text-xs font-semibold text-[#E6B84A] tabular-nums">
                  Margin {formatNumber(result.profitMarginPercent, 1)}%
                </span>
              </div>

              <div>
                <p className="text-xs text-white/75">Cumulative Net Profit / Loss</p>
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
                  <p className="text-white/70">Cumulative Total Cost</p>
                  <p className="text-base font-bold tabular-nums mt-0.5">
                    {formatCurrency(result.cumulativeCost, currency)}
                  </p>
                </div>
                <div>
                  <p className="text-white/70">Total Revenue</p>
                  <p className="text-base font-bold tabular-nums mt-0.5">
                    {formatCurrency(result.totalRevenue, currency)}
                  </p>
                </div>
                <div>
                  <p className="text-white/70">Total Crates</p>
                  <p className="text-sm font-semibold tabular-nums mt-0.5">
                    {formatNumber(result.totalCrates, 0)} crates ({formatNumber(result.totalEggs, 0)} eggs)
                  </p>
                </div>
                <div>
                  <p className="text-white/70">Break-Even / Crate</p>
                  <p className="text-sm font-semibold tabular-nums mt-0.5">
                    {formatCurrency(result.breakEvenPricePerCrate, currency)}
                  </p>
                </div>
              </div>
            </div>

            {/* Rearing vs Laying Cost Separation */}
            <div className="bg-white rounded-xl border border-[#26312D]/12 p-5 space-y-3">
              <h3 className="text-sm font-bold text-[#173F35] font-display">
                Rearing vs. Laying Cost Separation
              </h3>
              <dl className="divide-y divide-[#26312D]/10 text-xs sm:text-sm">
                <div className="py-2 flex justify-between">
                  <dt className="text-[#26312D]/75">Capitalized Rearing Cost</dt>
                  <dd className="font-semibold tabular-nums">
                    {formatCurrency(result.capitalizedRearingCost, currency)}
                  </dd>
                </div>
                <div className="py-2 flex justify-between">
                  <dt className="text-[#26312D]/75">Amortized Rearing / Lay Month</dt>
                  <dd className="font-semibold tabular-nums text-[#4F8A5B]">
                    {formatCurrency(result.monthlyAmortizedRearingCost, currency)} / mo
                  </dd>
                </div>
                <div className="py-2 flex justify-between">
                  <dt className="text-[#26312D]/75">Laying Period Direct Cost</dt>
                  <dd className="font-semibold tabular-nums">
                    {formatCurrency(result.layingPeriodDirectCost, currency)}
                  </dd>
                </div>
                <div className="py-2 flex justify-between">
                  <dt className="text-[#26312D]/75">Egg Sales Revenue</dt>
                  <dd className="font-semibold tabular-nums">
                    {formatCurrency(result.eggRevenue, currency)}
                  </dd>
                </div>
                <div className="py-2 flex justify-between">
                  <dt className="text-[#26312D]/75">Spent Layers + Manure Revenue</dt>
                  <dd className="font-semibold tabular-nums">
                    {formatCurrency(result.otherRevenue, currency)}
                  </dd>
                </div>
                <div className="py-2 flex justify-between">
                  <dt className="text-[#26312D]/75">Cost / Crate (All-in)</dt>
                  <dd className="font-bold text-[#173F35] tabular-nums">
                    {formatCurrency(result.costPerCrate, currency)}
                  </dd>
                </div>
                <div className="py-2 flex justify-between">
                  <dt className="text-[#26312D]/75">Feed Efficiency / Crate</dt>
                  <dd className="font-semibold tabular-nums">
                    {formatNumber(result.feedKgPerCrate, 2)} kg / crate
                  </dd>
                </div>
              </dl>
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
                  <p>{result.howCalculated.rearingAmortizationFormula}</p>
                  <p>{result.howCalculated.eggOutputFormula}</p>
                  <p>{result.howCalculated.crateBreakEvenFormula}</p>
                  <p>{result.howCalculated.feedEfficiencyFormula}</p>
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
