import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Calculator, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import { useData } from '@/src/context/DataContext';
import { calculateBroilerPlan } from '@/src/lib/calculators/broiler';
import { formatCurrency, formatNumber } from '@/src/lib/calculators/format';
import { calculateLayerPlan } from '@/src/lib/calculators/layer';
import { DEFAULT_BROILER_INPUT, DEFAULT_LAYER_INPUT } from '@/src/lib/defaults';
import type { BirdType } from '@/src/types/domain';

export const QuickEstimator: React.FC<{ disclaimerText: string }> = ({ disclaimerText }) => {
  const navigate = useNavigate();
  const { profile, refreshGuestCount } = useAuth();
  const { savePlan } = useData();
  const currency = profile?.default_currency || '₦';

  const [birdType, setBirdType] = useState<BirdType>('broiler');
  const [flockSize, setFlockSize] = useState<number>(500);
  const [birdPrice, setBirdPrice] = useState<number>(950);
  const [feedBagPrice, setFeedBagPrice] = useState<number>(21500);
  const [mortalityPct, setMortalityPct] = useState<number>(5);
  const [sellingPrice, setSellingPrice] = useState<number>(8500); // per bird (broiler) or per crate (layer)
  const [showFormula, setShowFormula] = useState<boolean>(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const switchBirdType = (next: BirdType) => {
    setBirdType(next);
    setSavedNotice(null);
    if (next === 'broiler') {
      setBirdPrice(950);
      setFeedBagPrice(21500);
      setMortalityPct(5);
      setSellingPrice(8500);
    } else {
      setBirdPrice(1150);
      setFeedBagPrice(19500);
      setMortalityPct(5);
      setSellingPrice(5200);
    }
  };

  const broilerResult = useMemo(() => {
    if (birdType !== 'broiler') return null;
    const stages = DEFAULT_BROILER_INPUT.feedStages.map((s) => ({
      ...s,
      pricePerBag: feedBagPrice,
    }));
    return calculateBroilerPlan(
      {
        ...DEFAULT_BROILER_INPUT,
        startingBirds: flockSize,
        pricePerChick: birdPrice,
        mortalityRatePercent: mortalityPct,
        sellingMethod: 'per_bird',
        sellingPricePerBird: sellingPrice,
        feedStages: stages,
      },
      currency
    );
  }, [birdType, flockSize, birdPrice, feedBagPrice, mortalityPct, sellingPrice, currency]);

  const layerResult = useMemo(() => {
    if (birdType !== 'layer') return null;
    const stages = DEFAULT_LAYER_INPUT.feedStages.map((s) => ({
      ...s,
      pricePerBag: feedBagPrice,
    }));
    return calculateLayerPlan(
      {
        ...DEFAULT_LAYER_INPUT,
        startingBirds: flockSize,
        purchasePricePerBird: birdPrice,
        rearingMortalityPercent: mortalityPct,
        eggPricePerCrate: sellingPrice,
        feedStages: stages,
      },
      currency
    );
  }, [birdType, flockSize, birdPrice, feedBagPrice, mortalityPct, sellingPrice, currency]);

  const handleSaveToDevice = async () => {
    if (birdType === 'broiler') {
      const stages = DEFAULT_BROILER_INPUT.feedStages.map((s) => ({
        ...s,
        pricePerBag: feedBagPrice,
      }));
      const assumptions = {
        ...DEFAULT_BROILER_INPUT,
        startingBirds: flockSize,
        pricePerChick: birdPrice,
        mortalityRatePercent: mortalityPct,
        sellingMethod: 'per_bird' as const,
        sellingPricePerBird: sellingPrice,
        feedStages: stages,
      };
      await savePlan({
        plan_name: `Quick Broiler Estimate (${flockSize} birds)`,
        bird_type: 'broiler',
        assumptions: assumptions as unknown as Record<string, unknown>,
        feed_stages: stages,
        expense_items: DEFAULT_BROILER_INPUT.expenseItems,
      });
    } else {
      const stages = DEFAULT_LAYER_INPUT.feedStages.map((s) => ({
        ...s,
        pricePerBag: feedBagPrice,
      }));
      const assumptions = {
        ...DEFAULT_LAYER_INPUT,
        startingBirds: flockSize,
        purchasePricePerBird: birdPrice,
        rearingMortalityPercent: mortalityPct,
        eggPricePerCrate: sellingPrice,
        feedStages: stages,
      };
      await savePlan({
        plan_name: `Quick Layer Estimate (${flockSize} birds)`,
        bird_type: 'layer',
        assumptions: assumptions as unknown as Record<string, unknown>,
        feed_stages: stages,
        expense_items: DEFAULT_LAYER_INPUT.expenseItems,
      });
    }
    await refreshGuestCount();
    setSavedNotice('Saved to this device. Open the full planner anytime to customize stages.');
  };

  const totalCost =
    birdType === 'broiler' ? broilerResult?.totalProductionCost ?? 0 : layerResult?.cumulativeCost ?? 0;
  const totalRevenue =
    birdType === 'broiler' ? broilerResult?.projectedRevenue ?? 0 : layerResult?.totalRevenue ?? 0;
  const netProfit =
    birdType === 'broiler' ? broilerResult?.netProfit ?? 0 : layerResult?.netProfit ?? 0;
  const margin =
    birdType === 'broiler'
      ? broilerResult?.profitMarginPercent ?? 0
      : layerResult?.profitMarginPercent ?? 0;
  const totalBags =
    birdType === 'broiler' ? broilerResult?.totalWholeBags ?? 0 : layerResult?.totalWholeBags ?? 0;

  return (
    <section
      id="estimator"
      className="py-16 lg:py-20 bg-white border-y border-[#26312D]/10"
      aria-labelledby="quick-estimator-title"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#4F8A5B] mb-2">
              Instant Estimator · No Registration Required
            </p>
            <h2
              id="quick-estimator-title"
              className="text-2xl sm:text-3xl font-bold text-[#173F35] tracking-tight"
            >
              Test your flock numbers before buying a single chick
            </h2>
            <p className="mt-2 text-sm text-[#26312D]/75">
              Pre-filled with a sample estimate — adjust bird count, feed price, and selling rate to match your market.
            </p>
          </div>

          <div className="inline-flex p-1 rounded-lg bg-[#F7F6F0] border border-[#26312D]/10 self-start">
            <button
              type="button"
              onClick={() => switchBirdType('broiler')}
              className={`min-h-[44px] px-4 py-2 rounded-md text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                birdType === 'broiler'
                  ? 'bg-[#173F35] text-white'
                  : 'text-[#26312D] hover:text-[#173F35]'
              }`}
            >
              Broiler Batch (42d)
            </button>
            <button
              type="button"
              onClick={() => switchBirdType('layer')}
              className={`min-h-[44px] px-4 py-2 rounded-md text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                birdType === 'layer'
                  ? 'bg-[#173F35] text-white'
                  : 'text-[#26312D] hover:text-[#173F35]'
              }`}
            >
              Layer Flock (12m Lay)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Inputs Column */}
          <div className="lg:col-span-5 bg-[#F7F6F0] rounded-xl border border-[#26312D]/12 p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#26312D]/10">
              <span className="text-sm font-semibold text-[#173F35]">
                Sample Estimate Inputs
              </span>
              <span className="text-xs text-[#26312D]/65">Adjust to your farm prices</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#26312D] mb-1.5">
                Starting Flock Size (birds)
              </label>
              <input
                type="number"
                min={10}
                step={50}
                value={flockSize}
                onChange={(e) => setFlockSize(Math.max(0, Number(e.target.value)))}
                className="w-full min-h-[44px] px-3.5 rounded-lg border border-[#26312D]/20 bg-white text-[#26312D] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#173F35]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#26312D] mb-1.5">
                  Day-Old Chick Price ({currency})
                </label>
                <input
                  type="number"
                  min={0}
                  step={50}
                  value={birdPrice}
                  onChange={(e) => setBirdPrice(Math.max(0, Number(e.target.value)))}
                  className="w-full min-h-[44px] px-3.5 rounded-lg border border-[#26312D]/20 bg-white text-[#26312D] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#173F35]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#26312D] mb-1.5">
                  Avg 25 kg Feed Bag ({currency})
                </label>
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={feedBagPrice}
                  onChange={(e) => setFeedBagPrice(Math.max(0, Number(e.target.value)))}
                  className="w-full min-h-[44px] px-3.5 rounded-lg border border-[#26312D]/20 bg-white text-[#26312D] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#173F35]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#26312D] mb-1.5">
                  {birdType === 'broiler' ? 'Expected Mortality (%)' : 'Rearing Mortality (%)'}
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={mortalityPct}
                  onChange={(e) => setMortalityPct(Math.min(100, Math.max(0, Number(e.target.value))))}
                  className="w-full min-h-[44px] px-3.5 rounded-lg border border-[#26312D]/20 bg-white text-[#26312D] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#173F35]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#26312D] mb-1.5">
                  {birdType === 'broiler'
                    ? `Selling Price / Bird (${currency})`
                    : `Egg Price / 30-Egg Crate (${currency})`}
                </label>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(Math.max(0, Number(e.target.value)))}
                  className="w-full min-h-[44px] px-3.5 rounded-lg border border-[#26312D]/20 bg-white text-[#26312D] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#173F35]"
                />
              </div>
            </div>
          </div>

          {/* Outputs Column */}
          <div className="lg:col-span-7 space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-[#26312D]/12 bg-white">
                <p className="text-xs font-medium text-[#26312D]/70">Total Production Cost</p>
                <p className="mt-1 text-xl sm:text-2xl font-bold text-[#173F35] tabular-nums font-display">
                  {formatCurrency(totalCost, currency)}
                </p>
              </div>
              <div className="p-4 rounded-xl border border-[#26312D]/12 bg-white">
                <p className="text-xs font-medium text-[#26312D]/70">Projected Revenue</p>
                <p className="mt-1 text-xl sm:text-2xl font-bold text-[#26312D] tabular-nums font-display">
                  {formatCurrency(totalRevenue, currency)}
                </p>
              </div>
              <div className="col-span-2 sm:col-span-1 p-4 rounded-xl border border-[#173F35]/20 bg-[#173F35] text-white">
                <p className="text-xs font-medium text-white/80">Estimated Net Profit</p>
                <p
                  className={`mt-1 text-xl sm:text-2xl font-bold tabular-nums font-display ${
                    netProfit >= 0 ? 'text-[#E6B84A]' : 'text-red-300'
                  }`}
                >
                  {formatCurrency(netProfit, currency)}
                </p>
                <p className="text-xs text-white/80 tabular-nums mt-0.5">
                  Margin: {formatNumber(margin, 1)}%
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 px-5 rounded-xl bg-[#F7F6F0] border border-[#26312D]/10">
              <div>
                <p className="text-xs text-[#26312D]/70">Whole Feed Bags</p>
                <p className="text-base font-bold text-[#173F35] tabular-nums">
                  {formatNumber(totalBags)} bags
                </p>
              </div>
              {birdType === 'broiler' && broilerResult ? (
                <>
                  <div>
                    <p className="text-xs text-[#26312D]/70">Surviving Birds</p>
                    <p className="text-base font-bold text-[#26312D] tabular-nums">
                      {formatNumber(broilerResult.survivingBirds)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#26312D]/70">Break-Even / Bird</p>
                    <p className="text-base font-bold text-[#26312D] tabular-nums">
                      {formatCurrency(broilerResult.breakEvenPricePerBird, currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#26312D]/70">Projected FCR</p>
                    <p className="text-base font-bold text-[#26312D] tabular-nums">
                      {formatNumber(broilerResult.projectedFcr, 2)}
                    </p>
                  </div>
                </>
              ) : layerResult ? (
                <>
                  <div>
                    <p className="text-xs text-[#26312D]/70">Projected Crates</p>
                    <p className="text-base font-bold text-[#26312D] tabular-nums">
                      {formatNumber(layerResult.totalCrates, 0)} crates
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#26312D]/70">Break-Even / Crate</p>
                    <p className="text-base font-bold text-[#26312D] tabular-nums">
                      {formatCurrency(layerResult.breakEvenPricePerCrate, currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#26312D]/70">Rearing / Lay Month</p>
                    <p className="text-base font-bold text-[#26312D] tabular-nums">
                      {formatCurrency(layerResult.monthlyAmortizedRearingCost, currency)}
                    </p>
                  </div>
                </>
              ) : null}
            </div>

            {/* Expandable Formula Explanation */}
            <div className="border border-[#26312D]/12 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowFormula((v) => !v)}
                className="w-full min-h-[44px] px-4 py-3 flex items-center justify-between text-left text-xs font-semibold text-[#173F35] bg-white hover:bg-[#F7F6F0]/60 transition-colors"
              >
                <span className="inline-flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-[#4F8A5B]" />
                  How this was calculated
                </span>
                {showFormula ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showFormula && (
                <div className="px-4 pb-4 pt-2 bg-[#F7F6F0]/50 border-t border-[#26312D]/10 text-xs text-[#26312D]/85 space-y-2">
                  {birdType === 'broiler' && broilerResult ? (
                    <>
                      <p>{broilerResult.howCalculated.mortalityFormula}</p>
                      <p>{broilerResult.howCalculated.feedFormula}</p>
                      <p>{broilerResult.howCalculated.breakEvenFormula}</p>
                    </>
                  ) : layerResult ? (
                    <>
                      <p>{layerResult.howCalculated.rearingAmortizationFormula}</p>
                      <p>{layerResult.howCalculated.eggOutputFormula}</p>
                      <p>{layerResult.howCalculated.crateBreakEvenFormula}</p>
                    </>
                  ) : null}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(birdType === 'broiler' ? '/planner/broiler' : '/planner/layer')}
                className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#173F35] text-white text-sm font-semibold hover:bg-[#173F35]/90 transition-colors whitespace-nowrap shrink-0"
              >
                <span>Open Full {birdType === 'broiler' ? 'Broiler' : 'Layer'} Planner</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => void handleSaveToDevice()}
                className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#173F35]/25 bg-white text-sm font-semibold text-[#173F35] hover:bg-[#F7F6F0] transition-colors whitespace-nowrap shrink-0"
              >
                <Check className="w-4 h-4 text-[#4F8A5B]" />
                <span>Save Plan to Device</span>
              </button>
            </div>

            {savedNotice && (
              <p className="text-xs font-medium text-[#4F8A5B]">{savedNotice}</p>
            )}

            <p className="text-xs text-[#26312D]/65 leading-relaxed">{disclaimerText}</p>
          </div>
        </div>
      </div>
    </section>
  );
};
