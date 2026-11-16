import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Download, Printer } from 'lucide-react';
import { AppShell } from '@/src/components/AppShell';
import { useAuth } from '@/src/context/AuthContext';
import { useData } from '@/src/context/DataContext';
import { calculateBroilerPlan } from '@/src/lib/calculators/broiler';
import { formatCurrency, formatNumber, safeDiv } from '@/src/lib/calculators/format';
import { calculateLayerPlan } from '@/src/lib/calculators/layer';
import { exportRowsToCsv } from '@/src/lib/export';
import type { BroilerPlanInput, LayerPlanInput } from '@/src/types/domain';

export const ReportsPage: React.FC = () => {
  const { profile } = useAuth();
  const {
    farms,
    cycles,
    flockRecords,
    feedRecords,
    eggRecords,
    financialRecords,
    selectedFarmId,
    setSelectedFarmId,
  } = useData();
  const currency = profile?.default_currency || '₦';
  const [selectedCycleId, setSelectedCycleId] = useState<string>('all');

  const farmCycles = useMemo(
    () =>
      selectedFarmId === 'all'
        ? cycles
        : cycles.filter((c) => c.farm_id === selectedFarmId),
    [cycles, selectedFarmId]
  );

  const activeCycles = useMemo(
    () =>
      selectedCycleId === 'all'
        ? farmCycles
        : farmCycles.filter((c) => c.id === selectedCycleId),
    [farmCycles, selectedCycleId]
  );

  const cycleIds = useMemo(() => new Set(activeCycles.map((c) => c.id)), [activeCycles]);

  const fin = useMemo(
    () => financialRecords.filter((f) => cycleIds.has(f.cycle_id)),
    [financialRecords, cycleIds]
  );
  const flock = useMemo(
    () => flockRecords.filter((f) => cycleIds.has(f.cycle_id)),
    [flockRecords, cycleIds]
  );
  const feed = useMemo(
    () => feedRecords.filter((f) => cycleIds.has(f.cycle_id)),
    [feedRecords, cycleIds]
  );
  const eggs = useMemo(
    () => eggRecords.filter((e) => cycleIds.has(e.cycle_id)),
    [eggRecords, cycleIds]
  );

  const reportSummary = useMemo(() => {
    let projectedCost = 0;
    let projectedRevenue = 0;

    activeCycles.forEach((c) => {
      if (c.bird_type === 'broiler') {
        const res = calculateBroilerPlan(c.assumptions as unknown as BroilerPlanInput, currency);
        projectedCost += res.totalProductionCost;
        projectedRevenue += res.projectedRevenue;
      } else {
        const res = calculateLayerPlan(c.assumptions as unknown as LayerPlanInput, currency);
        projectedCost += res.cumulativeCost;
        projectedRevenue += res.totalRevenue;
      }
    });

    const actualExpense = fin
      .filter((f) => f.record_type === 'expense')
      .reduce(
        (s, f) =>
          s + (f.is_capex ? safeDiv(f.total_amount, Math.max(1, f.amortization_cycles)) : f.total_amount),
        0
      );
    const actualRevenue = fin
      .filter((f) => f.record_type === 'sale')
      .reduce((s, f) => s + f.total_amount, 0);

    // Actual Feed Efficiency
    const totalFeedKgConsumed = feed
      .filter((f) => f.transaction_type === 'consumption' || f.transaction_type === 'purchase')
      .reduce((s, f) => s + f.bags_count * f.bag_weight_kg, 0);

    const totalInitialBirds = activeCycles.reduce((s, c) => s + c.initial_birds, 0);
    const totalLosses = flock
      .filter((f) => f.event_type === 'mortality' || f.event_type === 'culling')
      .reduce((s, f) => s + f.bird_count, 0);
    const survivingBirds = Math.max(0, totalInitialBirds - totalLosses);

    const weightSamples = flock.filter((f) => f.event_type === 'weight_sample' && f.average_weight_kg);
    const latestAvgWeight =
      weightSamples.length > 0
        ? weightSamples[weightSamples.length - 1].average_weight_kg || 2.0
        : 2.0;
    const actualFcr = safeDiv(totalFeedKgConsumed, survivingBirds * latestAvgWeight);

    const totalCrates = eggs.reduce(
      (s, e) => s + e.crates_collected + safeDiv(e.loose_eggs, e.eggs_per_crate || 30),
      0
    );
    const actualFeedPerCrate = safeDiv(totalFeedKgConsumed, totalCrates);

    return {
      projectedCost,
      projectedRevenue,
      projectedProfit: projectedRevenue - projectedCost,
      actualExpense,
      actualRevenue,
      actualProfit: actualRevenue - actualExpense,
      totalInitialBirds,
      totalLosses,
      mortalityPct: safeDiv(totalLosses, totalInitialBirds) * 100,
      actualFcr,
      actualFeedPerCrate,
      totalCrates,
    };
  }, [activeCycles, fin, feed, flock, eggs, currency]);

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    fin
      .filter((f) => f.record_type === 'expense')
      .forEach((f) => {
        map.set(f.category, (map.get(f.category) || 0) + f.total_amount);
      });
    return Array.from(map.entries())
      .map(([category, amount]) => ({ category, amount: Math.round(amount) }))
      .sort((a, b) => b.amount - a.amount);
  }, [fin]);

  const mortalityCurve = useMemo(() => {
    const byDate = new Map<string, number>();
    flock
      .filter((f) => f.event_type === 'mortality' || f.event_type === 'culling')
      .forEach((f) => {
        byDate.set(f.record_date, (byDate.get(f.record_date) || 0) + f.bird_count);
      });
    let cumulative = 0;
    return Array.from(byDate.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, daily]) => {
        cumulative += daily;
        return { date, daily, cumulative };
      });
  }, [flock]);

  const handleExportReport = () => {
    exportRowsToCsv(
      `poultry-profit-report-${new Date().toISOString().slice(0, 10)}`,
      ['Date', 'Cycle', 'Type', 'Category', 'Description', 'Status', 'Amount'],
      fin.map((f) => {
        const cyc = cycles.find((c) => c.id === f.cycle_id);
        return [
          f.record_date,
          cyc?.cycle_name || '',
          f.record_type,
          f.category,
          f.description,
          f.payment_status,
          f.total_amount,
        ];
      })
    );
  };

  return (
    <AppShell
      title="Reports & Analytics"
      subtitle="Projected vs. actual P&L, mortality curve, feed efficiency, and printable exports"
      actions={
        <div className="flex items-center gap-2 no-print">
          <button
            type="button"
            onClick={handleExportReport}
            className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#26312D]/20 bg-white text-xs font-semibold text-[#173F35]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel / CSV</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#173F35] text-white text-xs font-semibold"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-[#26312D]/12 p-4 flex flex-wrap items-center gap-3 no-print">
          <select
            value={selectedFarmId}
            onChange={(e) => {
              setSelectedFarmId(e.target.value);
              setSelectedCycleId('all');
            }}
            className="min-h-[40px] px-3 rounded-lg border border-[#26312D]/20 bg-[#F7F6F0] text-xs sm:text-sm font-medium"
          >
            <option value="all">All Farms</option>
            {farms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.farm_name}
              </option>
            ))}
          </select>

          <select
            value={selectedCycleId}
            onChange={(e) => setSelectedCycleId(e.target.value)}
            className="min-h-[40px] px-3 rounded-lg border border-[#26312D]/20 bg-[#F7F6F0] text-xs sm:text-sm font-medium"
          >
            <option value="all">All Cycles ({farmCycles.length})</option>
            {farmCycles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.cycle_name}
              </option>
            ))}
          </select>
        </div>

        {/* Projected vs Actual P&L Table */}
        <div className="bg-white rounded-xl border border-[#26312D]/12 p-5 print-break-avoid">
          <h2 className="text-base font-bold text-[#173F35] font-display mb-3">
            Projected vs. Actual P&amp;L Summary
          </h2>
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-[#26312D]/10 text-xs text-[#26312D]/65">
                <th className="py-2 pr-4 font-semibold">Line Item</th>
                <th className="py-2 px-4 font-semibold text-right">Planned Budget</th>
                <th className="py-2 px-4 font-semibold text-right">Actual Recorded</th>
                <th className="py-2 pl-4 font-semibold text-right">Variance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#26312D]/10 tabular-nums">
              <tr>
                <td className="py-3 pr-4 font-medium">Total Expenditure</td>
                <td className="py-3 px-4 text-right">
                  {formatCurrency(reportSummary.projectedCost, currency)}
                </td>
                <td className="py-3 px-4 text-right">
                  {formatCurrency(reportSummary.actualExpense, currency)}
                </td>
                <td className="py-3 pl-4 text-right">
                  {formatCurrency(reportSummary.actualExpense - reportSummary.projectedCost, currency)}
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-medium">Total Revenue / Sales</td>
                <td className="py-3 px-4 text-right">
                  {formatCurrency(reportSummary.projectedRevenue, currency)}
                </td>
                <td className="py-3 px-4 text-right">
                  {formatCurrency(reportSummary.actualRevenue, currency)}
                </td>
                <td className="py-3 pl-4 text-right">
                  {formatCurrency(
                    reportSummary.actualRevenue - reportSummary.projectedRevenue,
                    currency
                  )}
                </td>
              </tr>
              <tr className="font-bold bg-[#F7F6F0]/60">
                <td className="py-3 pr-4 text-[#173F35]">Net Profit / Loss</td>
                <td className="py-3 px-4 text-right">
                  {formatCurrency(reportSummary.projectedProfit, currency)}
                </td>
                <td className="py-3 px-4 text-right">
                  {formatCurrency(reportSummary.actualProfit, currency)}
                </td>
                <td className="py-3 pl-4 text-right">
                  {formatCurrency(
                    reportSummary.actualProfit - reportSummary.projectedProfit,
                    currency
                  )}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-4 border-t border-[#26312D]/10 text-xs">
            <div>
              <p className="text-[#26312D]/70">Mortality Rate</p>
              <p className="text-base font-bold text-[#173F35] tabular-nums">
                {formatNumber(reportSummary.mortalityPct, 1)}% ({formatNumber(reportSummary.totalLosses)} birds)
              </p>
            </div>
            <div>
              <p className="text-[#26312D]/70">Actual FCR (Est.)</p>
              <p className="text-base font-bold text-[#173F35] tabular-nums">
                {formatNumber(reportSummary.actualFcr, 2)}
              </p>
            </div>
            <div>
              <p className="text-[#26312D]/70">Total Egg Crates</p>
              <p className="text-base font-bold text-[#173F35] tabular-nums">
                {formatNumber(reportSummary.totalCrates, 1)}
              </p>
            </div>
            <div>
              <p className="text-[#26312D]/70">Feed / Crate (kg)</p>
              <p className="text-base font-bold text-[#173F35] tabular-nums">
                {formatNumber(reportSummary.actualFeedPerCrate, 2)} kg
              </p>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print-break-avoid">
          <div className="bg-white rounded-xl border border-[#26312D]/12 p-5">
            <h3 className="text-base font-bold text-[#173F35] font-display mb-4">
              Expense Category Breakdown
            </h3>
            {categoryBreakdown.length === 0 ? (
              <p className="text-xs text-[#26312D]/65 py-12 text-center">
                No expenses recorded yet.
              </p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryBreakdown} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E4DC" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="category" type="category" width={110} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="amount" fill="#173F35" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-[#26312D]/12 p-5">
            <h3 className="text-base font-bold text-[#173F35] font-display mb-4">
              Cumulative Flock Mortality Curve
            </h3>
            {mortalityCurve.length === 0 ? (
              <p className="text-xs text-[#26312D]/65 py-12 text-center">
                No mortality events logged.
              </p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mortalityCurve}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E4DC" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="cumulative"
                      name="Cumulative Losses"
                      stroke="#B91C1C"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
};
