import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import { ArrowRight, Bird, CalendarDays, Egg, Plus } from 'lucide-react';
import { AppShell } from '@/src/components/AppShell';
import { useAuth } from '@/src/context/AuthContext';
import { useData } from '@/src/context/DataContext';
import { calculateBroilerPlan } from '@/src/lib/calculators/broiler';
import { formatCurrency, formatNumber, safeDiv } from '@/src/lib/calculators/format';
import { calculateLayerPlan } from '@/src/lib/calculators/layer';
import { addDaysIso } from '@/src/lib/defaults';
import type { BroilerPlanInput, LayerPlanInput } from '@/src/types/domain';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const {
    farms,
    plans,
    cycles,
    flockRecords,
    feedRecords,
    eggRecords,
    financialRecords,
    calendarActivities,
    selectedFarmId,
    setSelectedFarmId,
    loadingData,
  } = useData();

  const currency = profile?.default_currency || '₦';

  const filteredCycles = useMemo(
    () =>
      selectedFarmId === 'all'
        ? cycles
        : cycles.filter((c) => c.farm_id === selectedFarmId),
    [cycles, selectedFarmId]
  );

  const cycleIds = useMemo(() => new Set(filteredCycles.map((c) => c.id)), [filteredCycles]);

  const filteredPlans = useMemo(
    () =>
      selectedFarmId === 'all'
        ? plans
        : plans.filter((p) => p.farm_id === selectedFarmId),
    [plans, selectedFarmId]
  );

  const filteredFlock = useMemo(
    () => flockRecords.filter((r) => cycleIds.has(r.cycle_id)),
    [flockRecords, cycleIds]
  );
  const filteredFeed = useMemo(
    () => feedRecords.filter((r) => cycleIds.has(r.cycle_id)),
    [feedRecords, cycleIds]
  );
  const filteredEggs = useMemo(
    () => eggRecords.filter((r) => cycleIds.has(r.cycle_id)),
    [eggRecords, cycleIds]
  );
  const filteredFinancial = useMemo(
    () => financialRecords.filter((r) => cycleIds.has(r.cycle_id)),
    [financialRecords, cycleIds]
  );

  const activeCycles = filteredCycles.filter((c) => c.status === 'active');

  // KPIs calculation
  const kpis = useMemo(() => {
    let totalPlannedInvestment = 0;
    let totalProjectedRevenue = 0;

    filteredCycles.forEach((c) => {
      if (c.bird_type === 'broiler') {
        const res = calculateBroilerPlan(c.assumptions as unknown as BroilerPlanInput, currency);
        totalPlannedInvestment += res.totalProductionCost;
        totalProjectedRevenue += res.projectedRevenue;
      } else {
        const res = calculateLayerPlan(c.assumptions as unknown as LayerPlanInput, currency);
        totalPlannedInvestment += res.cumulativeCost;
        totalProjectedRevenue += res.totalRevenue;
      }
    });

    // Include draft plans not yet converted if no active cycles exist or in total planned
    filteredPlans
      .filter((p) => p.status === 'draft')
      .forEach((p) => {
        if (p.bird_type === 'broiler') {
          const res = calculateBroilerPlan(p.assumptions as unknown as BroilerPlanInput, currency);
          totalPlannedInvestment += res.totalProductionCost;
          totalProjectedRevenue += res.projectedRevenue;
        } else {
          const res = calculateLayerPlan(p.assumptions as unknown as LayerPlanInput, currency);
          totalPlannedInvestment += res.cumulativeCost;
          totalProjectedRevenue += res.totalRevenue;
        }
      });

    let actualPaidExpense = 0;
    let actualOutstandingExpense = 0;
    let actualRevenue = 0;

    filteredFinancial.forEach((f) => {
      const effectiveAmount =
        f.record_type === 'expense' && f.is_capex
          ? safeDiv(f.total_amount, Math.max(1, f.amortization_cycles))
          : f.total_amount;

      if (f.record_type === 'expense') {
        if (f.payment_status === 'paid') actualPaidExpense += effectiveAmount;
        else actualOutstandingExpense += effectiveAmount;
      } else {
        actualRevenue += f.total_amount;
      }
    });

    const totalActualExpense = actualPaidExpense + actualOutstandingExpense;
    const netActualProfit = actualRevenue - totalActualExpense;

    const initialBirdsTotal = activeCycles.reduce((sum, c) => sum + c.initial_birds, 0);
    const activeCycleIds = new Set(activeCycles.map((c) => c.id));
    const lossesInActive = filteredFlock
      .filter((f) => activeCycleIds.has(f.cycle_id) && (f.event_type === 'mortality' || f.event_type === 'culling'))
      .reduce((sum, f) => sum + f.bird_count, 0);
    const liveFlockCount = Math.max(0, initialBirdsTotal - lossesInActive);
    const mortalityRate = safeDiv(lossesInActive, initialBirdsTotal) * 100;

    // Feed bag inventory balance across bag_inventory cycles
    const bagInventoryCycleIds = new Set(
      activeCycles.filter((c) => c.tracking_mode === 'bag_inventory').map((c) => c.id)
    );
    let feedBagsBalance = 0;
    filteredFeed
      .filter((f) => bagInventoryCycleIds.has(f.cycle_id))
      .forEach((f) => {
        if (f.transaction_type === 'purchase') feedBagsBalance += f.bags_count;
        else if (f.transaction_type === 'consumption') feedBagsBalance -= f.bags_count;
        else feedBagsBalance += f.bags_count;
      });

    return {
      totalPlannedInvestment,
      totalProjectedRevenue,
      actualPaidExpense,
      actualOutstandingExpense,
      totalActualExpense,
      actualRevenue,
      netActualProfit,
      liveFlockCount,
      mortalityRate,
      feedBagsBalance,
      hasBagInventory: bagInventoryCycleIds.size > 0,
    };
  }, [filteredCycles, filteredPlans, filteredFinancial, activeCycles, filteredFlock, filteredFeed, currency]);

  // Upcoming 7-day activities
  const todayIso = new Date().toISOString().slice(0, 10);
  const weekAheadIso = addDaysIso(todayIso, 7);
  const upcomingActivities = useMemo(
    () =>
      calendarActivities.filter(
        (a) =>
          !a.is_completed &&
          (!a.cycle_id || cycleIds.has(a.cycle_id) || selectedFarmId === 'all') &&
          a.scheduled_date <= weekAheadIso
      ),
    [calendarActivities, cycleIds, selectedFarmId, weekAheadIso]
  );

  // Chart data: Planned vs Actual by Cycle
  const cycleChartData = useMemo(() => {
    return filteredCycles.slice(0, 6).map((c) => {
      const plannedCost =
        c.bird_type === 'broiler'
          ? calculateBroilerPlan(c.assumptions as unknown as BroilerPlanInput, currency).totalProductionCost
          : calculateLayerPlan(c.assumptions as unknown as LayerPlanInput, currency).cumulativeCost;
      const actualCost = filteredFinancial
        .filter((f) => f.cycle_id === c.id && f.record_type === 'expense')
        .reduce((s, f) => s + f.total_amount, 0);
      const actualSales = filteredFinancial
        .filter((f) => f.cycle_id === c.id && f.record_type === 'sale')
        .reduce((s, f) => s + f.total_amount, 0);
      return {
        name: c.cycle_name.length > 14 ? `${c.cycle_name.slice(0, 14)}…` : c.cycle_name,
        Planned: Math.round(plannedCost),
        Actual: Math.round(actualCost),
        Revenue: Math.round(actualSales),
      };
    });
  }, [filteredCycles, filteredFinancial, currency]);

  // Trend Chart: Egg crates & daily mortality over recent dates
  const dailyTrendData = useMemo(() => {
    const byDate = new Map<string, { date: string; crates: number; mortality: number }>();
    filteredEggs.forEach((e) => {
      const cur = byDate.get(e.record_date) ?? { date: e.record_date, crates: 0, mortality: 0 };
      cur.crates += e.crates_collected + safeDiv(e.loose_eggs, e.eggs_per_crate || 30);
      byDate.set(e.record_date, cur);
    });
    filteredFlock
      .filter((f) => f.event_type === 'mortality')
      .forEach((f) => {
        const cur = byDate.get(f.record_date) ?? { date: f.record_date, crates: 0, mortality: 0 };
        cur.mortality += f.bird_count;
        byDate.set(f.record_date, cur);
      });
    return Array.from(byDate.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14);
  }, [filteredEggs, filteredFlock]);

  return (
    <AppShell
      title="Farm Dashboard"
      subtitle="Multi-farm summary, live flock health, and planned vs. actual financials"
      actions={
        <div className="flex items-center gap-2">
          <select
            aria-label="Filter by farm"
            value={selectedFarmId}
            onChange={(e) => setSelectedFarmId(e.target.value)}
            className="min-h-[40px] px-3 rounded-lg border border-[#26312D]/20 bg-white text-xs sm:text-sm font-medium text-[#26312D]"
          >
            <option value="all">All Farms ({farms.length})</option>
            {farms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.farm_name}
              </option>
            ))}
          </select>
        </div>
      }
    >
      {loadingData ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-white border border-[#26312D]/10" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Primary Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                to="/planner/broiler"
                className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#173F35] text-white text-sm font-semibold hover:bg-[#173F35]/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>New Broiler Plan</span>
              </Link>
              <Link
                to="/planner/layer"
                className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4F8A5B] text-white text-sm font-semibold hover:bg-[#4F8A5B]/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>New Layer Plan</span>
              </Link>
            </div>
            <Link
              to="/settings"
              className="text-xs font-semibold text-[#173F35] hover:underline"
            >
              Manage Farms ({farms.length})
            </Link>
          </div>

          {/* KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-[#26312D]/12 p-5">
              <p className="text-xs font-medium text-[#26312D]/70">Active Cycles &amp; Live Birds</p>
              <p className="mt-1 text-2xl font-bold text-[#173F35] font-display tabular-nums">
                {formatNumber(kpis.liveFlockCount)} birds
              </p>
              <p className="mt-1 text-xs text-[#26312D]/70 tabular-nums">
                {activeCycles.length} active cycle{activeCycles.length === 1 ? '' : 's'} · Mortality {formatNumber(kpis.mortalityRate, 1)}%
              </p>
            </div>

            <div className="bg-white rounded-xl border border-[#26312D]/12 p-5">
              <p className="text-xs font-medium text-[#26312D]/70">Planned Investment</p>
              <p className="mt-1 text-2xl font-bold text-[#26312D] font-display tabular-nums">
                {formatCurrency(kpis.totalPlannedInvestment, currency)}
              </p>
              <p className="mt-1 text-xs text-[#26312D]/70 tabular-nums">
                Projected rev: {formatCurrency(kpis.totalProjectedRevenue, currency)}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-[#26312D]/12 p-5">
              <p className="text-xs font-medium text-[#26312D]/70">Actual Expenditure</p>
              <p className="mt-1 text-2xl font-bold text-[#26312D] font-display tabular-nums">
                {formatCurrency(kpis.totalActualExpense, currency)}
              </p>
              <p className="mt-1 text-xs text-[#26312D]/70 tabular-nums">
                Paid {formatCurrency(kpis.actualPaidExpense, currency)} · Due {formatCurrency(kpis.actualOutstandingExpense, currency)}
              </p>
            </div>

            <div className="bg-[#173F35] text-white rounded-xl border border-[#173F35] p-5">
              <p className="text-xs font-medium text-white/75">Actual Net Cashflow</p>
              <p
                className={`mt-1 text-2xl font-bold font-display tabular-nums ${
                  kpis.netActualProfit >= 0 ? 'text-[#E6B84A]' : 'text-red-300'
                }`}
              >
                {formatCurrency(kpis.netActualProfit, currency)}
              </p>
              <p className="mt-1 text-xs text-white/75 tabular-nums">
                Sales: {formatCurrency(kpis.actualRevenue, currency)}
                {kpis.hasBagInventory ? ` · Stock: ${formatNumber(kpis.feedBagsBalance, 1)} bags` : ''}
              </p>
            </div>
          </div>

          {/* Active Cycles & Saved Draft Plans */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-white rounded-xl border border-[#26312D]/12 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#173F35] font-display">
                  Active &amp; Recent Production Cycles
                </h2>
                <span className="text-xs text-[#26312D]/65 tabular-nums">
                  {filteredCycles.length} total
                </span>
              </div>

              {filteredCycles.length === 0 ? (
                <div className="rounded-xl bg-[#F7F6F0] p-6 text-center space-y-3">
                  <p className="text-sm font-medium text-[#26312D]">
                    No active production cycles yet.
                  </p>
                  <p className="text-xs text-[#26312D]/70">
                    Create a Broiler or Layer plan and click &ldquo;Convert Plan to Active Cycle&rdquo; to begin logging daily records.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/planner/broiler')}
                    className="min-h-[40px] px-4 py-2 rounded-lg bg-[#173F35] text-white text-xs font-semibold"
                  >
                    Start Broiler Plan
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-[#26312D]/10">
                  {filteredCycles.map((cycle) => {
                    const losses = filteredFlock
                      .filter(
                        (f) =>
                          f.cycle_id === cycle.id &&
                          (f.event_type === 'mortality' || f.event_type === 'culling')
                      )
                      .reduce((s, f) => s + f.bird_count, 0);
                    const live = Math.max(0, cycle.initial_birds - losses);
                    const spent = filteredFinancial
                      .filter((f) => f.cycle_id === cycle.id && f.record_type === 'expense')
                      .reduce((s, f) => s + f.total_amount, 0);

                    return (
                      <div
                        key={cycle.id}
                        className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-xs text-[#4F8A5B] font-semibold">
                            {cycle.bird_type === 'broiler' ? (
                              <Bird className="w-3.5 h-3.5" />
                            ) : (
                              <Egg className="w-3.5 h-3.5" />
                            )}
                            <span className="capitalize">{cycle.bird_type}</span>
                            <span aria-hidden="true">·</span>
                            <span className="capitalize">{cycle.status}</span>
                            <span aria-hidden="true">·</span>
                            <span>Started {cycle.start_date}</span>
                          </div>
                          <p className="text-sm font-bold text-[#173F35] truncate mt-0.5">
                            {cycle.cycle_name}
                          </p>
                          <p className="text-xs text-[#26312D]/70 tabular-nums mt-0.5">
                            {formatNumber(live)} / {formatNumber(cycle.initial_birds)} live birds · Spent {formatCurrency(spent, currency)}
                          </p>
                        </div>

                        <Link
                          to={`/cycles/${cycle.id}`}
                          className="min-h-[40px] inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-[#173F35]/25 text-xs font-semibold text-[#173F35] hover:bg-[#F7F6F0] whitespace-nowrap shrink-0"
                        >
                          <span>Log / Manage</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Upcoming 7-Day Activities + Saved Plans */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white rounded-xl border border-[#26312D]/12 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-[#173F35] font-display">
                    Upcoming 7-Day Activities
                  </h2>
                  <Link
                    to="/calendar"
                    className="text-xs font-semibold text-[#4F8A5B] hover:underline"
                  >
                    Full Calendar
                  </Link>
                </div>

                {upcomingActivities.length === 0 ? (
                  <p className="text-xs text-[#26312D]/70 py-3">
                    No pending tasks due in the next 7 days.
                  </p>
                ) : (
                  <div className="divide-y divide-[#26312D]/10">
                    {upcomingActivities.slice(0, 5).map((act) => (
                      <div key={act.id} className="py-2.5 flex items-start gap-3">
                        <CalendarDays className="w-4 h-4 text-[#4F8A5B] mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[#173F35] truncate">
                            {act.title}
                          </p>
                          <p className="text-xs text-[#26312D]/65 tabular-nums">
                            {act.scheduled_date} · {act.activity_type.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl border border-[#26312D]/12 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-[#173F35] font-display">
                    Saved Plans ({filteredPlans.length})
                  </h2>
                  <Link
                    to="/scenarios"
                    className="text-xs font-semibold text-[#4F8A5B] hover:underline"
                  >
                    What-If Compare
                  </Link>
                </div>
                {filteredPlans.length === 0 ? (
                  <p className="text-xs text-[#26312D]/70 py-2">
                    No saved plans yet. Open Broiler or Layer Planner to create one.
                  </p>
                ) : (
                  <div className="divide-y divide-[#26312D]/10">
                    {filteredPlans.slice(0, 4).map((p) => (
                      <div key={p.id} className="py-2.5 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#26312D] truncate">
                            {p.plan_name}
                          </p>
                          <p className="text-xs text-[#26312D]/65 capitalize">
                            {p.bird_type} · {p.status}
                          </p>
                        </div>
                        <Link
                          to={`/planner/${p.bird_type}?planId=${p.id}`}
                          className="text-xs font-semibold text-[#173F35] hover:underline shrink-0"
                        >
                          Open
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-[#26312D]/12 p-5">
              <h2 className="text-base font-bold text-[#173F35] font-display mb-4">
                Planned Cost vs. Actual Cost &amp; Revenue
              </h2>
              {cycleChartData.length === 0 ? (
                <div className="h-56 flex items-center justify-center text-xs text-[#26312D]/60">
                  Convert a plan to an active cycle to compare planned vs. actual costs.
                </div>
              ) : (
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cycleChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E4DC" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#26312D' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#26312D' }} />
                      <Tooltip />
                      <Bar dataKey="Planned" fill="#173F35" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Actual" fill="#E6B84A" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Revenue" fill="#4F8A5B" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-[#26312D]/12 p-5">
              <h2 className="text-base font-bold text-[#173F35] font-display mb-4">
                Recent Egg Crates &amp; Mortality Trend
              </h2>
              {dailyTrendData.length === 0 ? (
                <div className="h-56 flex items-center justify-center text-xs text-[#26312D]/60">
                  Log egg collections or flock mortality inside an active cycle to view trends.
                </div>
              ) : (
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E4DC" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#26312D' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#26312D' }} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="crates"
                        name="Egg Crates"
                        stroke="#4F8A5B"
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="mortality"
                        name="Mortality"
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
      )}
    </AppShell>
  );
};
