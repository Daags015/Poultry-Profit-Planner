import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Plus, X } from 'lucide-react';
import { AppShell } from '@/src/components/AppShell';
import { useAuth } from '@/src/context/AuthContext';
import { useData } from '@/src/context/DataContext';
import { calculateBroilerPlan } from '@/src/lib/calculators/broiler';
import { formatCurrency, formatNumber, safeDiv } from '@/src/lib/calculators/format';
import { calculateLayerPlan } from '@/src/lib/calculators/layer';
import type { BroilerPlanInput, LayerPlanInput } from '@/src/types/domain';

type RecordDrawerTab = 'flock' | 'feed' | 'eggs' | 'financial';

const EXPENSE_CATEGORIES = [
  'Chicks/Birds',
  'Feed',
  'Vaccination',
  'Medication',
  'Labour',
  'Electricity & Water',
  'Housing & Repairs',
  'Equipment',
  'Transportation',
  'Litter',
  'Disinfectants',
  'Custom',
];

const SALE_CATEGORIES = [
  'Egg Sales',
  'Live/Dressed Bird Sales',
  'Spent Layer Sales',
  'Manure Sales',
  'Custom',
];

export const CycleDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const {
    cycles,
    flockRecords,
    feedRecords,
    eggRecords,
    financialRecords,
    calendarActivities,
    saveCycle,
    addFlockRecord,
    addFeedRecord,
    addEggRecord,
    addFinancialRecord,
    toggleFinancialPaymentStatus,
    toggleCalendarActivity,
  } = useData();

  const currency = profile?.default_currency || '₦';
  const cycle = cycles.find((c) => c.id === id);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<RecordDrawerTab>('flock');
  const [ledgerTab, setLedgerTab] = useState<RecordDrawerTab | 'milestones'>('financial');

  // Form states
  const todayIso = new Date().toISOString().slice(0, 10);
  const [recordDate, setRecordDate] = useState(todayIso);

  // Flock form
  const [flockEventType, setFlockEventType] = useState<'mortality' | 'culling' | 'weight_sample'>('mortality');
  const [flockBirdCount, setFlockBirdCount] = useState(1);
  const [flockAvgWeight, setFlockAvgWeight] = useState(1.2);
  const [flockNotes, setFlockNotes] = useState('');

  // Feed form
  const [feedTxType, setFeedTxType] = useState<'purchase' | 'consumption' | 'adjustment'>('consumption');
  const [feedStageName, setFeedStageName] = useState('Starter');
  const [feedBags, setFeedBags] = useState(1);
  const [feedBagWeight, setFeedBagWeight] = useState(profile?.default_bag_weight_kg || 25);
  const [feedCostPerBag, setFeedCostPerBag] = useState(21500);
  const [feedNotes, setFeedNotes] = useState('');

  // Egg form
  const [eggCrates, setEggCrates] = useState(10);
  const [eggLoose, setEggLoose] = useState(0);
  const [eggCracked, setEggCracked] = useState(0);
  const [eggPerCrate, setEggPerCrate] = useState(profile?.default_crate_size || 30);
  const [eggNotes, setEggNotes] = useState('');

  // Financial form
  const [finType, setFinType] = useState<'expense' | 'sale'>('expense');
  const [finCategory, setFinCategory] = useState('Medication');
  const [finDesc, setFinDesc] = useState('');
  const [finQty, setFinQty] = useState(1);
  const [finUnitPrice, setFinUnitPrice] = useState(0);
  const [finStatus, setFinStatus] = useState<'paid' | 'outstanding'>('paid');
  const [finIsCapex, setFinIsCapex] = useState(false);
  const [finAmortCycles, setFinAmortCycles] = useState(4);

  const cycleFlock = useMemo(
    () => flockRecords.filter((r) => r.cycle_id === id),
    [flockRecords, id]
  );
  const cycleFeed = useMemo(
    () => feedRecords.filter((r) => r.cycle_id === id),
    [feedRecords, id]
  );
  const cycleEggs = useMemo(
    () => eggRecords.filter((r) => r.cycle_id === id),
    [eggRecords, id]
  );
  const cycleFin = useMemo(
    () => financialRecords.filter((r) => r.cycle_id === id),
    [financialRecords, id]
  );
  const cycleMilestones = useMemo(
    () => calendarActivities.filter((a) => a.cycle_id === id),
    [calendarActivities, id]
  );

  const stats = useMemo(() => {
    if (!cycle) return null;

    const planned =
      cycle.bird_type === 'broiler'
        ? calculateBroilerPlan(cycle.assumptions as unknown as BroilerPlanInput, currency)
        : calculateLayerPlan(cycle.assumptions as unknown as LayerPlanInput, currency);

    const plannedCost =
      cycle.bird_type === 'broiler'
        ? (planned as ReturnType<typeof calculateBroilerPlan>).totalProductionCost
        : (planned as ReturnType<typeof calculateLayerPlan>).cumulativeCost;
    const plannedRev =
      cycle.bird_type === 'broiler'
        ? (planned as ReturnType<typeof calculateBroilerPlan>).projectedRevenue
        : (planned as ReturnType<typeof calculateLayerPlan>).totalRevenue;
    const plannedBags = planned.totalWholeBags;

    const totalLosses = cycleFlock
      .filter((f) => f.event_type === 'mortality' || f.event_type === 'culling')
      .reduce((s, f) => s + f.bird_count, 0);
    const liveBirds = Math.max(0, cycle.initial_birds - totalLosses);
    const actualMortalityPct = safeDiv(totalLosses, cycle.initial_birds) * 100;

    let bagsPurchased = 0;
    let bagsConsumed = 0;
    let bagsAdjusted = 0;
    cycleFeed.forEach((f) => {
      if (f.transaction_type === 'purchase') bagsPurchased += f.bags_count;
      else if (f.transaction_type === 'consumption') bagsConsumed += f.bags_count;
      else bagsAdjusted += f.bags_count;
    });
    const bagStockBalance = bagsPurchased - bagsConsumed + bagsAdjusted;

    const totalActualExpenses = cycleFin
      .filter((f) => f.record_type === 'expense')
      .reduce(
        (s, f) =>
          s + (f.is_capex ? safeDiv(f.total_amount, Math.max(1, f.amortization_cycles)) : f.total_amount),
        0
      );
    const totalActualSales = cycleFin
      .filter((f) => f.record_type === 'sale')
      .reduce((s, f) => s + f.total_amount, 0);

    const totalEggCount = cycleEggs.reduce(
      (s, e) => s + e.crates_collected * (e.eggs_per_crate || 30) + e.loose_eggs,
      0
    );

    return {
      plannedCost,
      plannedRev,
      plannedBags,
      totalLosses,
      liveBirds,
      actualMortalityPct,
      bagsPurchased,
      bagsConsumed,
      bagStockBalance,
      totalActualExpenses,
      totalActualSales,
      actualProfit: totalActualSales - totalActualExpenses,
      totalEggCount,
      totalEggCrates: safeDiv(totalEggCount, profile?.default_crate_size || 30),
    };
  }, [cycle, cycleFlock, cycleFeed, cycleFin, cycleEggs, currency, profile]);

  if (!cycle || !stats) {
    return (
      <AppShell title="Cycle Not Found">
        <div className="bg-white rounded-xl border border-[#26312D]/12 p-8 text-center space-y-3">
          <p className="text-sm font-medium text-[#26312D]">
            This production cycle could not be found on this device.
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#173F35] text-white text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </AppShell>
    );
  }

  const openDrawer = (tab: RecordDrawerTab) => {
    setDrawerTab(tab);
    setDrawerOpen(true);
  };

  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (drawerTab === 'flock') {
      await addFlockRecord({
        cycle_id: cycle.id,
        record_date: recordDate,
        event_type: flockEventType,
        bird_count: flockBirdCount,
        average_weight_kg: flockEventType === 'weight_sample' ? flockAvgWeight : null,
        cause_or_notes: flockNotes,
      });
      setFlockNotes('');
    } else if (drawerTab === 'feed') {
      const totalCost = feedTxType === 'purchase' ? feedBags * feedCostPerBag : 0;
      await addFeedRecord({
        cycle_id: cycle.id,
        record_date: recordDate,
        transaction_type: feedTxType,
        stage_name: feedStageName,
        bags_count: feedBags,
        bag_weight_kg: feedBagWeight,
        cost_per_bag: feedTxType === 'purchase' ? feedCostPerBag : 0,
        total_cost: totalCost,
        notes: feedNotes,
      });
      setFeedNotes('');
    } else if (drawerTab === 'eggs') {
      await addEggRecord({
        cycle_id: cycle.id,
        record_date: recordDate,
        crates_collected: eggCrates,
        loose_eggs: eggLoose,
        cracked_eggs: eggCracked,
        eggs_per_crate: eggPerCrate,
        notes: eggNotes,
      });
      setEggNotes('');
    } else if (drawerTab === 'financial') {
      await addFinancialRecord({
        cycle_id: cycle.id,
        record_date: recordDate,
        record_type: finType,
        category: finCategory,
        description: finDesc,
        quantity: finQty,
        unit_price: finUnitPrice,
        total_amount: finQty * finUnitPrice,
        payment_status: finStatus,
        is_capex: finType === 'expense' ? finIsCapex : false,
        amortization_cycles: finType === 'expense' && finIsCapex ? finAmortCycles : 1,
      });
      setFinDesc('');
    }
    setDrawerOpen(false);
  };

  const toggleCycleStatus = async () => {
    await saveCycle({
      ...cycle,
      status: cycle.status === 'active' ? 'completed' : 'active',
    });
  };

  return (
    <AppShell
      title={cycle.cycle_name}
      subtitle={`${cycle.bird_type.toUpperCase()} · Started ${cycle.start_date} · ${
        cycle.tracking_mode === 'bag_inventory' ? 'Bag Inventory Mode' : 'Simple Expense Mode'
      }`}
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void toggleCycleStatus()}
            className="min-h-[40px] px-3 py-2 rounded-lg border border-[#26312D]/20 bg-white text-xs font-semibold text-[#173F35]"
          >
            {cycle.status === 'active' ? 'Mark Completed' : 'Reopen Cycle'}
          </button>
          <button
            type="button"
            onClick={() => openDrawer('flock')}
            className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#173F35] text-white text-xs font-semibold hover:bg-[#173F35]/90"
          >
            <Plus className="w-4 h-4" />
            <span>Log Record</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Fast Mobile Action Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => openDrawer('flock')}
            className="min-h-[48px] px-4 py-2.5 rounded-xl bg-white border border-[#26312D]/15 text-xs sm:text-sm font-semibold text-[#173F35] hover:bg-[#F7F6F0] text-left"
          >
            + Mortality / Weight
          </button>
          <button
            type="button"
            onClick={() => openDrawer('feed')}
            className="min-h-[48px] px-4 py-2.5 rounded-xl bg-white border border-[#26312D]/15 text-xs sm:text-sm font-semibold text-[#173F35] hover:bg-[#F7F6F0] text-left"
          >
            + Feed Purchase / Use
          </button>
          {cycle.bird_type === 'layer' && (
            <button
              type="button"
              onClick={() => openDrawer('eggs')}
              className="min-h-[48px] px-4 py-2.5 rounded-xl bg-white border border-[#26312D]/15 text-xs sm:text-sm font-semibold text-[#173F35] hover:bg-[#F7F6F0] text-left"
            >
              + Egg Collection
            </button>
          )}
          <button
            type="button"
            onClick={() => openDrawer('financial')}
            className="min-h-[48px] px-4 py-2.5 rounded-xl bg-white border border-[#26312D]/15 text-xs sm:text-sm font-semibold text-[#173F35] hover:bg-[#F7F6F0] text-left"
          >
            + Expense / Sale
          </button>
        </div>

        {/* Variance Cards (Planned vs Actual) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-[#26312D]/12 p-5">
            <p className="text-xs font-medium text-[#26312D]/70">Live Flock &amp; Mortality</p>
            <p className="mt-1 text-2xl font-bold text-[#173F35] font-display tabular-nums">
              {formatNumber(stats.liveBirds)} / {formatNumber(cycle.initial_birds)}
            </p>
            <p className="mt-1 text-xs text-[#26312D]/70 tabular-nums">
              Losses: {formatNumber(stats.totalLosses)} ({formatNumber(stats.actualMortalityPct, 1)}%)
            </p>
          </div>

          <div className="bg-white rounded-xl border border-[#26312D]/12 p-5">
            <p className="text-xs font-medium text-[#26312D]/70">Cost Variance (Actual vs Plan)</p>
            <p className="mt-1 text-2xl font-bold text-[#26312D] font-display tabular-nums">
              {formatCurrency(stats.totalActualExpenses, currency)}
            </p>
            <p className="mt-1 text-xs text-[#26312D]/70 tabular-nums">
              Planned budget: {formatCurrency(stats.plannedCost, currency)}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-[#26312D]/12 p-5">
            <p className="text-xs font-medium text-[#26312D]/70">
              {cycle.tracking_mode === 'bag_inventory' ? 'Feed Store Balance' : 'Feed Bags Logged'}
            </p>
            <p className="mt-1 text-2xl font-bold text-[#26312D] font-display tabular-nums">
              {cycle.tracking_mode === 'bag_inventory'
                ? `${formatNumber(stats.bagStockBalance, 1)} bags`
                : `${formatNumber(stats.bagsPurchased, 1)} bags`}
            </p>
            <p className="mt-1 text-xs text-[#26312D]/70 tabular-nums">
              Plan target: {formatNumber(stats.plannedBags)} bags
              {cycle.tracking_mode === 'bag_inventory' ? ` · Used ${formatNumber(stats.bagsConsumed, 1)}` : ''}
            </p>
          </div>

          <div className="bg-[#173F35] text-white rounded-xl border border-[#173F35] p-5">
            <p className="text-xs font-medium text-white/75">
              {cycle.bird_type === 'layer' ? 'Egg Output & Cashflow' : 'Actual Sales & Net Cashflow'}
            </p>
            <p
              className={`mt-1 text-2xl font-bold font-display tabular-nums ${
                stats.actualProfit >= 0 ? 'text-[#E6B84A]' : 'text-red-300'
              }`}
            >
              {formatCurrency(stats.actualProfit, currency)}
            </p>
            <p className="mt-1 text-xs text-white/80 tabular-nums">
              Sales {formatCurrency(stats.totalActualSales, currency)}
              {cycle.bird_type === 'layer'
                ? ` · ${formatNumber(stats.totalEggCrates, 1)} crates`
                : ` · Plan ${formatCurrency(stats.plannedRev, currency)}`}
            </p>
          </div>
        </div>

        {/* Ledgers */}
        <div className="bg-white rounded-xl border border-[#26312D]/12 overflow-hidden">
          <div className="px-4 py-3 border-b border-[#26312D]/10 flex flex-wrap gap-2">
            {([
              { key: 'financial', label: `Financials (${cycleFin.length})` },
              { key: 'flock', label: `Flock (${cycleFlock.length})` },
              { key: 'feed', label: `Feed (${cycleFeed.length})` },
              ...(cycle.bird_type === 'layer'
                ? [{ key: 'eggs' as const, label: `Eggs (${cycleEggs.length})` }]
                : []),
              { key: 'milestones', label: `Milestones (${cycleMilestones.length})` },
            ] as Array<{ key: RecordDrawerTab | 'milestones'; label: string }>).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setLedgerTab(t.key)}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  ledgerTab === t.key
                    ? 'bg-[#173F35] text-white'
                    : 'bg-[#F7F6F0] text-[#26312D] hover:bg-[#F7F6F0]/70'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-4 sm:p-5 overflow-x-auto">
            {ledgerTab === 'financial' && (
              cycleFin.length === 0 ? (
                <p className="text-xs text-[#26312D]/70 py-4">No financial records logged yet.</p>
              ) : (
                <table className="w-full text-xs sm:text-sm text-left">
                  <thead>
                    <tr className="border-b border-[#26312D]/10 text-xs text-[#26312D]/65">
                      <th className="py-2 pr-3 font-semibold">Date</th>
                      <th className="py-2 px-3 font-semibold">Type</th>
                      <th className="py-2 px-3 font-semibold">Category &amp; Description</th>
                      <th className="py-2 px-3 font-semibold text-right">Amount</th>
                      <th className="py-2 pl-3 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#26312D]/10 tabular-nums">
                    {cycleFin.map((f) => (
                      <tr key={f.id}>
                        <td className="py-2.5 pr-3 whitespace-nowrap">{f.record_date}</td>
                        <td className="py-2.5 px-3 capitalize font-medium">{f.record_type}</td>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-[#173F35]">{f.category}</span>
                          {f.description && (
                            <span className="text-[#26312D]/75"> — {f.description}</span>
                          )}
                          {f.is_capex && (
                            <span className="text-xs text-[#4F8A5B] ml-2">
                              (CapEx ÷ {f.amortization_cycles})
                            </span>
                          )}
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-semibold ${
                            f.record_type === 'sale' ? 'text-[#4F8A5B]' : 'text-[#26312D]'
                          }`}
                        >
                          {f.record_type === 'sale' ? '+' : '-'}
                          {formatCurrency(f.total_amount, currency)}
                        </td>
                        <td className="py-2.5 pl-3 text-right">
                          <button
                            type="button"
                            onClick={() => void toggleFinancialPaymentStatus(f.id)}
                            className={`px-2.5 py-1 rounded text-xs font-semibold ${
                              f.payment_status === 'paid'
                                ? 'bg-[#4F8A5B]/15 text-[#173F35]'
                                : 'bg-[#E6B84A]/25 text-[#26312D]'
                            }`}
                          >
                            {f.payment_status === 'paid' ? 'Paid' : 'Outstanding'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}

            {ledgerTab === 'flock' && (
              cycleFlock.length === 0 ? (
                <p className="text-xs text-[#26312D]/70 py-4">No flock records logged yet.</p>
              ) : (
                <table className="w-full text-xs sm:text-sm text-left">
                  <thead>
                    <tr className="border-b border-[#26312D]/10 text-xs text-[#26312D]/65">
                      <th className="py-2 pr-3 font-semibold">Date</th>
                      <th className="py-2 px-3 font-semibold">Event</th>
                      <th className="py-2 px-3 font-semibold text-right">Birds</th>
                      <th className="py-2 px-3 font-semibold text-right">Avg Weight</th>
                      <th className="py-2 pl-3 font-semibold">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#26312D]/10 tabular-nums">
                    {cycleFlock.map((f) => (
                      <tr key={f.id}>
                        <td className="py-2.5 pr-3">{f.record_date}</td>
                        <td className="py-2.5 px-3 capitalize font-medium">
                          {f.event_type.replace('_', ' ')}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold">{f.bird_count}</td>
                        <td className="py-2.5 px-3 text-right">
                          {f.average_weight_kg ? `${f.average_weight_kg} kg` : '—'}
                        </td>
                        <td className="py-2.5 pl-3 text-[#26312D]/75">{f.cause_or_notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}

            {ledgerTab === 'feed' && (
              cycleFeed.length === 0 ? (
                <p className="text-xs text-[#26312D]/70 py-4">No feed records logged yet.</p>
              ) : (
                <table className="w-full text-xs sm:text-sm text-left">
                  <thead>
                    <tr className="border-b border-[#26312D]/10 text-xs text-[#26312D]/65">
                      <th className="py-2 pr-3 font-semibold">Date</th>
                      <th className="py-2 px-3 font-semibold">Transaction</th>
                      <th className="py-2 px-3 font-semibold">Stage</th>
                      <th className="py-2 px-3 font-semibold text-right">Bags</th>
                      <th className="py-2 pl-3 font-semibold text-right">Total Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#26312D]/10 tabular-nums">
                    {cycleFeed.map((f) => (
                      <tr key={f.id}>
                        <td className="py-2.5 pr-3">{f.record_date}</td>
                        <td className="py-2.5 px-3 capitalize font-medium">{f.transaction_type}</td>
                        <td className="py-2.5 px-3">{f.stage_name}</td>
                        <td className="py-2.5 px-3 text-right font-semibold">
                          {formatNumber(f.bags_count, 1)} ({f.bag_weight_kg}kg)
                        </td>
                        <td className="py-2.5 pl-3 text-right">
                          {f.total_cost > 0 ? formatCurrency(f.total_cost, currency) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}

            {ledgerTab === 'eggs' && (
              cycleEggs.length === 0 ? (
                <p className="text-xs text-[#26312D]/70 py-4">No egg collection logs yet.</p>
              ) : (
                <table className="w-full text-xs sm:text-sm text-left">
                  <thead>
                    <tr className="border-b border-[#26312D]/10 text-xs text-[#26312D]/65">
                      <th className="py-2 pr-3 font-semibold">Date</th>
                      <th className="py-2 px-3 font-semibold text-right">Crates</th>
                      <th className="py-2 px-3 font-semibold text-right">Loose</th>
                      <th className="py-2 px-3 font-semibold text-right">Cracked</th>
                      <th className="py-2 pl-3 font-semibold text-right">Total Eggs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#26312D]/10 tabular-nums">
                    {cycleEggs.map((e) => (
                      <tr key={e.id}>
                        <td className="py-2.5 pr-3">{e.record_date}</td>
                        <td className="py-2.5 px-3 text-right font-semibold">{e.crates_collected}</td>
                        <td className="py-2.5 px-3 text-right">{e.loose_eggs}</td>
                        <td className="py-2.5 px-3 text-right text-red-700">{e.cracked_eggs}</td>
                        <td className="py-2.5 pl-3 text-right font-bold text-[#173F35]">
                          {formatNumber(e.crates_collected * (e.eggs_per_crate || 30) + e.loose_eggs)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}

            {ledgerTab === 'milestones' && (
              <div className="divide-y divide-[#26312D]/10">
                {cycleMilestones.map((m) => (
                  <div key={m.id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <p
                        className={`text-sm font-semibold ${
                          m.is_completed ? 'line-through text-[#26312D]/50' : 'text-[#173F35]'
                        }`}
                      >
                        {m.title}
                      </p>
                      <p className="text-xs text-[#26312D]/70 tabular-nums">
                        {m.scheduled_date} · {m.notes}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void toggleCalendarActivity(m.id)}
                      className={`min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                        m.is_completed
                          ? 'bg-[#4F8A5B]/15 text-[#173F35]'
                          : 'border border-[#26312D]/20 text-[#26312D]'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{m.is_completed ? 'Completed' : 'Mark Done'}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fast Mobile-First Log Record Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/45">
          <div className="w-full max-w-md bg-white h-full overflow-y-auto p-6 flex flex-col justify-between shadow-2xl">
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#26312D]/10">
                <h2 className="text-lg font-bold text-[#173F35] font-display">Log Farm Record</h2>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg hover:bg-[#F7F6F0]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-lg bg-[#F7F6F0]">
                {([
                  { key: 'flock', label: 'Flock' },
                  { key: 'feed', label: 'Feed' },
                  ...(cycle.bird_type === 'layer' ? [{ key: 'eggs' as const, label: 'Eggs' }] : []),
                  { key: 'financial', label: 'Money' },
                ] as Array<{ key: RecordDrawerTab; label: string }>).map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setDrawerTab(t.key)}
                    className={`min-h-[38px] rounded-md text-xs font-semibold ${
                      drawerTab === t.key ? 'bg-[#173F35] text-white' : 'text-[#26312D]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <form id="log-record-form" onSubmit={handleSaveRecord} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#26312D] mb-1">
                    Record Date
                  </label>
                  <input
                    type="date"
                    required
                    value={recordDate}
                    onChange={(e) => setRecordDate(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-lg border border-[#26312D]/20 text-sm"
                  />
                </div>

                {drawerTab === 'flock' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-[#26312D] mb-1">
                        Event Type
                      </label>
                      <select
                        value={flockEventType}
                        onChange={(e) =>
                          setFlockEventType(
                            e.target.value as 'mortality' | 'culling' | 'weight_sample'
                          )
                        }
                        className="w-full min-h-[44px] px-3 rounded-lg border border-[#26312D]/20 bg-white text-sm"
                      >
                        <option value="mortality">Daily Mortality</option>
                        <option value="culling">Culling</option>
                        <option value="weight_sample">Weight Sample</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#26312D] mb-1">
                        {flockEventType === 'weight_sample' ? 'Sample Birds Weighed' : 'Bird Count'}
                      </label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={flockBirdCount}
                        onChange={(e) => setFlockBirdCount(Math.max(1, Number(e.target.value)))}
                        className="w-full min-h-[44px] px-3 rounded-lg border border-[#26312D]/20 text-sm tabular-nums"
                      />
                    </div>
                    {flockEventType === 'weight_sample' && (
                      <div>
                        <label className="block text-xs font-medium text-[#26312D] mb-1">
                          Average Weight (kg)
                        </label>
                        <input
                          type="number"
                          min={0.05}
                          step={0.05}
                          value={flockAvgWeight}
                          onChange={(e) => setFlockAvgWeight(Math.max(0, Number(e.target.value)))}
                          className="w-full min-h-[44px] px-3 rounded-lg border border-[#26312D]/20 text-sm tabular-nums"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-[#26312D] mb-1">
                        Cause / Notes
                      </label>
                      <input
                        type="text"
                        value={flockNotes}
                        onChange={(e) => setFlockNotes(e.target.value)}
                        placeholder="Optional observation"
                        className="w-full min-h-[44px] px-3 rounded-lg border border-[#26312D]/20 text-sm"
                      />
                    </div>
                  </>
                )}

                {drawerTab === 'feed' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-[#26312D] mb-1">
                        Transaction Type
                      </label>
                      <select
                        value={feedTxType}
                        onChange={(e) =>
                          setFeedTxType(
                            e.target.value as 'purchase' | 'consumption' | 'adjustment'
                          )
                        }
                        className="w-full min-h-[44px] px-3 rounded-lg border border-[#26312D]/20 bg-white text-sm"
                      >
                        <option value="consumption">Daily Consumption (from store)</option>
                        <option value="purchase">Feed Purchase (adds to store &amp; expenses)</option>
                        <option value="adjustment">Store Stock Adjustment</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[#26312D] mb-1">
                          Stage / Ration
                        </label>
                        <input
                          type="text"
                          value={feedStageName}
                          onChange={(e) => setFeedStageName(e.target.value)}
                          className="w-full min-h-[44px] px-3 rounded-lg border border-[#26312D]/20 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#26312D] mb-1">
                          Bags Count
                        </label>
                        <input
                          type="number"
                          step={0.5}
                          value={feedBags}
                          onChange={(e) => setFeedBags(Number(e.target.value))}
                          className="w-full min-h-[44px] px-3 rounded-lg border border-[#26312D]/20 text-sm tabular-nums"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[#26312D] mb-1">
                          Bag Weight (kg)
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={feedBagWeight}
                          onChange={(e) => setFeedBagWeight(Math.max(1, Number(e.target.value)))}
                          className="w-full min-h-[44px] px-3 rounded-lg border border-[#26312D]/20 text-sm tabular-nums"
                        />
                      </div>
                      {feedTxType === 'purchase' && (
                        <div>
                          <label className="block text-xs font-medium text-[#26312D] mb-1">
                            Cost / Bag ({currency})
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={feedCostPerBag}
                            onChange={(e) => setFeedCostPerBag(Math.max(0, Number(e.target.value)))}
                            className="w-full min-h-[44px] px-3 rounded-lg border border-[#26312D]/20 text-sm tabular-nums"
                          />
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#26312D] mb-1">Notes</label>
                      <input
                        type="text"
                        value={feedNotes}
                        onChange={(e) => setFeedNotes(e.target.value)}
                        className="w-full min-h-[44px] px-3 rounded-lg border border-[#26312D]/20 text-sm"
                      />
                    </div>
                  </>
                )}

                {drawerTab === 'eggs' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[#26312D] mb-1">
                          Crates Collected
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={eggCrates}
                          onChange={(e) => setEggCrates(Math.max(0, Number(e.target.value)))}
                          className="w-full min-h-[44px] px-3 rounded-lg border border-[#26312D]/20 text-sm tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#26312D] mb-1">
                          Loose Eggs
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={eggLoose}
                          onChange={(e) => setEggLoose(Math.max(0, Number(e.target.value)))}
                          className="w-full min-h-[44px] px-3 rounded-lg border border-[#26312D]/20 text-sm tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#26312D] mb-1">
                          Cracked Eggs
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={eggCracked}
                          onChange={(e) => setEggCracked(Math.max(0, Number(e.target.value)))}
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
                          value={eggPerCrate}
                          onChange={(e) => setEggPerCrate(Math.max(1, Number(e.target.value)))}
                          className="w-full min-h-[44px] px-3 rounded-lg border border-[#26312D]/20 text-sm tabular-nums"
                        />
                      </div>
                    </div>
                    <p className="text-xs font-semibold text-[#4F8A5B] tabular-nums">
                      Total good eggs: {formatNumber(eggCrates * eggPerCrate + eggLoose)}
                    </p>
                    <div>
                      <label className="block text-xs font-medium text-[#26312D] mb-1">Notes</label>
                      <input
                        type="text"
                        value={eggNotes}
                        onChange={(e) => setEggNotes(e.target.value)}
                        className="w-full min-h-[44px] px-3 rounded-lg border border-[#26312D]/20 text-sm"
                      />
                    </div>
                  </>
                )}

                {drawerTab === 'financial' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[#26312D] mb-1">
                          Record Type
                        </label>
                        <select
                          value={finType}
                          onChange={(e) => {
                            const next = e.target.value as 'expense' | 'sale';
                            setFinType(next);
                            setFinCategory(
                              next === 'expense' ? EXPENSE_CATEGORIES[0] : SALE_CATEGORIES[0]
                            );
                          }}
                          className="w-full min-h-[44px] px-3 rounded-lg border border-[#26312D]/20 bg-white text-sm"
                        >
                          <option value="expense">Expense</option>
                          <option value="sale">Sale / Revenue</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#26312D] mb-1">
                          Category
                        </label>
                        <select
                          value={finCategory}
                          onChange={(e) => setFinCategory(e.target.value)}
                          className="w-full min-h-[44px] px-3 rounded-lg border border-[#26312D]/20 bg-white text-sm"
                        >
                          {(finType === 'expense' ? EXPENSE_CATEGORIES : SALE_CATEGORIES).map(
                            (cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            )
                          )}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#26312D] mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={finDesc}
                        onChange={(e) => setFinDesc(e.target.value)}
                        placeholder="e.g. 200 live broilers sold at farm gate"
                        className="w-full min-h-[44px] px-3 rounded-lg border border-[#26312D]/20 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[#26312D] mb-1">
                          Quantity
                        </label>
                        <input
                          type="number"
                          min={0.01}
                          step="any"
                          value={finQty}
                          onChange={(e) => setFinQty(Math.max(0, Number(e.target.value)))}
                          className="w-full min-h-[44px] px-3 rounded-lg border border-[#26312D]/20 text-sm tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#26312D] mb-1">
                          Unit Price ({currency})
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={finUnitPrice}
                          onChange={(e) => setFinUnitPrice(Math.max(0, Number(e.target.value)))}
                          className="w-full min-h-[44px] px-3 rounded-lg border border-[#26312D]/20 text-sm tabular-nums"
                        />
                      </div>
                    </div>

                    <p className="text-xs font-semibold text-[#173F35] tabular-nums">
                      Total Amount: {formatCurrency(finQty * finUnitPrice, currency)}
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[#26312D] mb-1">
                          Payment Status
                        </label>
                        <select
                          value={finStatus}
                          onChange={(e) =>
                            setFinStatus(e.target.value as 'paid' | 'outstanding')
                          }
                          className="w-full min-h-[44px] px-3 rounded-lg border border-[#26312D]/20 bg-white text-sm"
                        >
                          <option value="paid">Paid</option>
                          <option value="outstanding">Outstanding</option>
                        </select>
                      </div>

                      {finType === 'expense' && (
                        <div>
                          <label className="block text-xs font-medium text-[#26312D] mb-1">
                            Expense Type
                          </label>
                          <select
                            value={finIsCapex ? 'capex' : 'opex'}
                            onChange={(e) => setFinIsCapex(e.target.value === 'capex')}
                            className="w-full min-h-[44px] px-3 rounded-lg border border-[#26312D]/20 bg-white text-sm"
                          >
                            <option value="opex">OpEx (This Cycle)</option>
                            <option value="capex">CapEx (Amortized)</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {finType === 'expense' && finIsCapex && (
                      <div>
                        <label className="block text-xs font-medium text-[#26312D] mb-1">
                          Amortize Across (Cycles)
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={finAmortCycles}
                          onChange={(e) =>
                            setFinAmortCycles(Math.max(1, Number(e.target.value)))
                          }
                          className="w-full min-h-[44px] px-3 rounded-lg border border-[#26312D]/20 text-sm tabular-nums"
                        />
                      </div>
                    )}
                  </>
                )}
              </form>
            </div>

            <div className="pt-6 border-t border-[#26312D]/10 flex gap-3">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="flex-1 min-h-[46px] rounded-lg border border-[#26312D]/20 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="log-record-form"
                className="flex-1 min-h-[46px] rounded-lg bg-[#173F35] text-white text-sm font-semibold"
              >
                Save Record
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
};
