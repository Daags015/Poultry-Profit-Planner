import React, { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Save, Trash2 } from 'lucide-react';
import { AppShell } from '@/src/components/AppShell';
import { useAuth } from '@/src/context/AuthContext';
import { useData } from '@/src/context/DataContext';
import { calculateBroilerPlan } from '@/src/lib/calculators/broiler';
import { formatCurrency, formatNumber } from '@/src/lib/calculators/format';
import { calculateLayerPlan } from '@/src/lib/calculators/layer';
import { DEFAULT_BROILER_INPUT, DEFAULT_LAYER_INPUT } from '@/src/lib/defaults';
import type { BirdType, BroilerPlanInput, LayerPlanInput } from '@/src/types/domain';

interface ScenarioModifiers {
  name: string;
  feedPriceDeltaPct: number;
  birdPriceDeltaPct: number;
  mortalityDeltaPts: number;
  sellingPriceDeltaPct: number;
  flockSizeDeltaPct: number;
  durationOrLayDeltaPct: number;
}

function applyBroilerModifiers(base: BroilerPlanInput, mod: ScenarioModifiers): BroilerPlanInput {
  return {
    ...base,
    startingBirds: Math.max(0, Math.round(base.startingBirds * (1 + mod.flockSizeDeltaPct / 100))),
    pricePerChick: Math.max(0, base.pricePerChick * (1 + mod.birdPriceDeltaPct / 100)),
    mortalityRatePercent: Math.min(100, Math.max(0, base.mortalityRatePercent + mod.mortalityDeltaPts)),
    durationDays: Math.max(1, Math.round(base.durationDays * (1 + mod.durationOrLayDeltaPct / 100))),
    sellingPricePerBird: Math.max(0, base.sellingPricePerBird * (1 + mod.sellingPriceDeltaPct / 100)),
    sellingPricePerKg: Math.max(0, base.sellingPricePerKg * (1 + mod.sellingPriceDeltaPct / 100)),
    feedStages: base.feedStages.map((s) => ({
      ...s,
      pricePerBag: Math.max(0, s.pricePerBag * (1 + mod.feedPriceDeltaPct / 100)),
    })),
  };
}

function applyLayerModifiers(base: LayerPlanInput, mod: ScenarioModifiers): LayerPlanInput {
  return {
    ...base,
    startingBirds: Math.max(0, Math.round(base.startingBirds * (1 + mod.flockSizeDeltaPct / 100))),
    purchasePricePerBird: Math.max(
      0,
      base.purchasePricePerBird * (1 + mod.birdPriceDeltaPct / 100)
    ),
    rearingMortalityPercent: Math.min(
      100,
      Math.max(0, base.rearingMortalityPercent + mod.mortalityDeltaPts)
    ),
    eggPricePerCrate: Math.max(0, base.eggPricePerCrate * (1 + mod.sellingPriceDeltaPct / 100)),
    feedStages: base.feedStages.map((s) => ({
      ...s,
      pricePerBag: Math.max(0, s.pricePerBag * (1 + mod.feedPriceDeltaPct / 100)),
    })),
    layingPeriods: base.layingPeriods.map((p) => ({
      ...p,
      layingPercent: Math.min(100, Math.max(0, p.layingPercent * (1 + mod.durationOrLayDeltaPct / 100))),
    })),
  };
}

export const ScenariosPage: React.FC = () => {
  const { profile } = useAuth();
  const { plans, scenarios, saveScenario, deleteScenario } = useData();
  const currency = profile?.default_currency || '₦';

  const [selectedPlanId, setSelectedPlanId] = useState<string>('default-broiler');
  const [scenarioA, setScenarioA] = useState<ScenarioModifiers>({
    name: 'Scenario A: Feed Spike +15%',
    feedPriceDeltaPct: 15,
    birdPriceDeltaPct: 0,
    mortalityDeltaPts: 2,
    sellingPriceDeltaPct: 0,
    flockSizeDeltaPct: 0,
    durationOrLayDeltaPct: 0,
  });
  const [scenarioB, setScenarioB] = useState<ScenarioModifiers>({
    name: 'Scenario B: Scale +50% & Better Price',
    feedPriceDeltaPct: 5,
    birdPriceDeltaPct: 0,
    mortalityDeltaPts: -1,
    sellingPriceDeltaPct: 10,
    flockSizeDeltaPct: 50,
    durationOrLayDeltaPct: 0,
  });
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) ?? null,
    [plans, selectedPlanId]
  );

  const birdType: BirdType = selectedPlan
    ? selectedPlan.bird_type
    : selectedPlanId === 'default-layer'
    ? 'layer'
    : 'broiler';

  const summary = useMemo(() => {
    if (birdType === 'broiler') {
      const baseInput = (selectedPlan?.assumptions as unknown as BroilerPlanInput) ?? DEFAULT_BROILER_INPUT;
      const baseRes = calculateBroilerPlan(baseInput, currency);
      const aRes = calculateBroilerPlan(applyBroilerModifiers(baseInput, scenarioA), currency);
      const bRes = calculateBroilerPlan(applyBroilerModifiers(baseInput, scenarioB), currency);

      return {
        base: {
          cost: baseRes.totalProductionCost,
          bags: baseRes.totalWholeBags,
          revenue: baseRes.projectedRevenue,
          breakEven: baseRes.breakEvenPricePerBird,
          breakEvenLabel: 'Break-Even / Bird',
          profit: baseRes.netProfit,
        },
        a: {
          cost: aRes.totalProductionCost,
          bags: aRes.totalWholeBags,
          revenue: aRes.projectedRevenue,
          breakEven: aRes.breakEvenPricePerBird,
          profit: aRes.netProfit,
        },
        b: {
          cost: bRes.totalProductionCost,
          bags: bRes.totalWholeBags,
          revenue: bRes.projectedRevenue,
          breakEven: bRes.breakEvenPricePerBird,
          profit: bRes.netProfit,
        },
      };
    }

    const baseInput = (selectedPlan?.assumptions as unknown as LayerPlanInput) ?? DEFAULT_LAYER_INPUT;
    const baseRes = calculateLayerPlan(baseInput, currency);
    const aRes = calculateLayerPlan(applyLayerModifiers(baseInput, scenarioA), currency);
    const bRes = calculateLayerPlan(applyLayerModifiers(baseInput, scenarioB), currency);

    return {
      base: {
        cost: baseRes.cumulativeCost,
        bags: baseRes.totalWholeBags,
        revenue: baseRes.totalRevenue,
        breakEven: baseRes.breakEvenPricePerCrate,
        breakEvenLabel: 'Break-Even / Crate',
        profit: baseRes.netProfit,
      },
      a: {
        cost: aRes.cumulativeCost,
        bags: aRes.totalWholeBags,
        revenue: aRes.totalRevenue,
        breakEven: aRes.breakEvenPricePerCrate,
        profit: aRes.netProfit,
      },
      b: {
        cost: bRes.cumulativeCost,
        bags: bRes.totalWholeBags,
        revenue: bRes.totalRevenue,
        breakEven: bRes.breakEvenPricePerCrate,
        profit: bRes.netProfit,
      },
    };
  }, [birdType, selectedPlan, scenarioA, scenarioB, currency]);

  const chartData = [
    {
      label: 'Base Plan',
      Cost: Math.round(summary.base.cost),
      Revenue: Math.round(summary.base.revenue),
      Profit: Math.round(summary.base.profit),
    },
    {
      label: 'Scenario A',
      Cost: Math.round(summary.a.cost),
      Revenue: Math.round(summary.a.revenue),
      Profit: Math.round(summary.a.profit),
    },
    {
      label: 'Scenario B',
      Cost: Math.round(summary.b.cost),
      Revenue: Math.round(summary.b.revenue),
      Profit: Math.round(summary.b.profit),
    },
  ];

  const handleSave = async (mod: ScenarioModifiers, calc: { cost: number; revenue: number; profit: number; bags: number }) => {
    await saveScenario({
      base_plan_id: selectedPlan?.id ?? null,
      scenario_name: mod.name,
      bird_type: birdType,
      modified_assumptions: mod as unknown as Record<string, unknown>,
      calculated_summary: calc as unknown as Record<string, unknown>,
    });
    setSavedNotice(`Saved "${mod.name}" to your device and sync queue.`);
  };

  const renderControls = (
    mod: ScenarioModifiers,
    setMod: React.Dispatch<React.SetStateAction<ScenarioModifiers>>,
    calc: { cost: number; revenue: number; profit: number; bags: number }
  ) => (
    <div className="bg-white rounded-xl border border-[#26312D]/12 p-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <input
          type="text"
          value={mod.name}
          onChange={(e) => setMod((p) => ({ ...p, name: e.target.value }))}
          className="flex-1 min-h-[40px] px-3 rounded-lg border border-[#26312D]/20 text-sm font-bold text-[#173F35]"
        />
        <button
          type="button"
          onClick={() => void handleSave(mod, calc)}
          className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#173F35] text-white text-xs font-semibold shrink-0"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save</span>
        </button>
      </div>

      {[
        {
          label: `Feed Bag Price (${mod.feedPriceDeltaPct >= 0 ? '+' : ''}${mod.feedPriceDeltaPct}%)`,
          value: mod.feedPriceDeltaPct,
          min: -40,
          max: 80,
          step: 5,
          key: 'feedPriceDeltaPct' as const,
        },
        {
          label: `Chick / Bird Price (${mod.birdPriceDeltaPct >= 0 ? '+' : ''}${mod.birdPriceDeltaPct}%)`,
          value: mod.birdPriceDeltaPct,
          min: -40,
          max: 80,
          step: 5,
          key: 'birdPriceDeltaPct' as const,
        },
        {
          label: `Mortality Shift (${mod.mortalityDeltaPts >= 0 ? '+' : ''}${mod.mortalityDeltaPts} pts)`,
          value: mod.mortalityDeltaPts,
          min: -5,
          max: 25,
          step: 0.5,
          key: 'mortalityDeltaPts' as const,
        },
        {
          label: `Selling Price (${mod.sellingPriceDeltaPct >= 0 ? '+' : ''}${mod.sellingPriceDeltaPct}%)`,
          value: mod.sellingPriceDeltaPct,
          min: -40,
          max: 80,
          step: 5,
          key: 'sellingPriceDeltaPct' as const,
        },
        {
          label: `Flock Size (${mod.flockSizeDeltaPct >= 0 ? '+' : ''}${mod.flockSizeDeltaPct}%)`,
          value: mod.flockSizeDeltaPct,
          min: -50,
          max: 150,
          step: 10,
          key: 'flockSizeDeltaPct' as const,
        },
        {
          label: `${birdType === 'broiler' ? 'Duration' : 'Laying %'} (${mod.durationOrLayDeltaPct >= 0 ? '+' : ''}${mod.durationOrLayDeltaPct}%)`,
          value: mod.durationOrLayDeltaPct,
          min: -30,
          max: 30,
          step: 5,
          key: 'durationOrLayDeltaPct' as const,
        },
      ].map((slider) => (
        <div key={slider.key} className="space-y-1">
          <div className="flex justify-between text-xs font-medium text-[#26312D]">
            <span>{slider.label}</span>
          </div>
          <input
            type="range"
            min={slider.min}
            max={slider.max}
            step={slider.step}
            value={slider.value}
            onChange={(e) => setMod((p) => ({ ...p, [slider.key]: Number(e.target.value) }))}
            className="w-full accent-[#173F35]"
          />
        </div>
      ))}
    </div>
  );

  return (
    <AppShell
      title="What-If Scenario Comparator"
      subtitle="Stress-test feed inflation, mortality spikes, and flock scaling side by side"
    >
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-[#26312D]/12 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-[#173F35]">Base Plan:</label>
            <select
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              className="min-h-[42px] px-3 rounded-lg border border-[#26312D]/20 bg-[#F7F6F0] text-sm font-medium"
            >
              <option value="default-broiler">Sample 500-Bird Broiler Plan</option>
              <option value="default-layer">Sample 500-Bird Layer Plan</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.plan_name} ({p.bird_type})
                </option>
              ))}
            </select>
          </div>
          {savedNotice && <p className="text-xs font-semibold text-[#4F8A5B]">{savedNotice}</p>}
        </div>

        {/* Comparison Table */}
        <div className="bg-white rounded-xl border border-[#26312D]/12 p-5 overflow-x-auto">
          <h2 className="text-base font-bold text-[#173F35] font-display mb-3">
            Side-by-Side Financial Impact
          </h2>
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-[#26312D]/10 text-xs text-[#26312D]/70">
                <th className="py-2.5 pr-4 font-semibold">Metric</th>
                <th className="py-2.5 px-4 font-semibold text-right">Base Plan</th>
                <th className="py-2.5 px-4 font-semibold text-right">{scenarioA.name}</th>
                <th className="py-2.5 pl-4 font-semibold text-right">{scenarioB.name}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#26312D]/10 tabular-nums">
              <tr>
                <td className="py-3 pr-4 font-medium">Total Cost</td>
                <td className="py-3 px-4 text-right">{formatCurrency(summary.base.cost, currency)}</td>
                <td className="py-3 px-4 text-right">{formatCurrency(summary.a.cost, currency)}</td>
                <td className="py-3 pl-4 text-right">{formatCurrency(summary.b.cost, currency)}</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-medium">Whole Feed Bags</td>
                <td className="py-3 px-4 text-right">{formatNumber(summary.base.bags)}</td>
                <td className="py-3 px-4 text-right">{formatNumber(summary.a.bags)}</td>
                <td className="py-3 pl-4 text-right">{formatNumber(summary.b.bags)}</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-medium">Projected Revenue</td>
                <td className="py-3 px-4 text-right">{formatCurrency(summary.base.revenue, currency)}</td>
                <td className="py-3 px-4 text-right">{formatCurrency(summary.a.revenue, currency)}</td>
                <td className="py-3 pl-4 text-right">{formatCurrency(summary.b.revenue, currency)}</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-medium">{summary.base.breakEvenLabel}</td>
                <td className="py-3 px-4 text-right">{formatCurrency(summary.base.breakEven, currency)}</td>
                <td className="py-3 px-4 text-right">{formatCurrency(summary.a.breakEven, currency)}</td>
                <td className="py-3 pl-4 text-right">{formatCurrency(summary.b.breakEven, currency)}</td>
              </tr>
              <tr className="bg-[#F7F6F0]/60 font-bold">
                <td className="py-3 pr-4 text-[#173F35]">Net Profit / Loss</td>
                <td className="py-3 px-4 text-right text-[#173F35]">
                  {formatCurrency(summary.base.profit, currency)}
                </td>
                <td
                  className={`py-3 px-4 text-right ${
                    summary.a.profit >= summary.base.profit ? 'text-[#4F8A5B]' : 'text-red-700'
                  }`}
                >
                  {formatCurrency(summary.a.profit, currency)}
                </td>
                <td
                  className={`py-3 pl-4 text-right ${
                    summary.b.profit >= summary.base.profit ? 'text-[#4F8A5B]' : 'text-red-700'
                  }`}
                >
                  {formatCurrency(summary.b.profit, currency)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Sliders */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {renderControls(scenarioA, setScenarioA, summary.a)}
          {renderControls(scenarioB, setScenarioB, summary.b)}
        </div>

        {/* Chart & Saved Scenarios */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white rounded-xl border border-[#26312D]/12 p-5">
            <h3 className="text-base font-bold text-[#173F35] font-display mb-4">
              Scenario Comparison Chart
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E4DC" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="Cost" fill="#173F35" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Revenue" fill="#4F8A5B" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Profit" fill="#E6B84A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white rounded-xl border border-[#26312D]/12 p-5 space-y-3">
            <h3 className="text-base font-bold text-[#173F35] font-display">
              Saved Scenarios ({scenarios.length})
            </h3>
            {scenarios.length === 0 ? (
              <p className="text-xs text-[#26312D]/70 py-4">
                Adjust sliders above and click &ldquo;Save&rdquo; to store scenarios for future reference.
              </p>
            ) : (
              <div className="divide-y divide-[#26312D]/10">
                {scenarios.map((sc) => {
                  const sum = sc.calculated_summary as { profit?: number; cost?: number };
                  return (
                    <div key={sc.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#173F35] truncate">
                          {sc.scenario_name}
                        </p>
                        <p className="text-xs text-[#26312D]/70 capitalize tabular-nums">
                          {sc.bird_type} · Profit {formatCurrency(Number(sum.profit ?? 0), currency)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void deleteScenario(sc.id)}
                        className="p-2 text-red-700 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
};
