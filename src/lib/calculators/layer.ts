import type {
  LayerPeriodResult,
  LayerPlanInput,
  LayerPlanResult,
  LayerStageResult,
} from '@/src/types/domain';
import { clampNumber, formatCurrency, formatNumber, nonNegative, safeDiv } from './format';

export function calculateLayerPlan(
  input: LayerPlanInput,
  currency = '₦'
): LayerPlanResult {
  const startingBirds = Math.round(nonNegative(input.startingBirds));
  const purchasePricePerBird = nonNegative(input.purchasePricePerBird);
  const rearingMortalityPercent = clampNumber(input.rearingMortalityPercent, 0, 100);
  const rearingMortalityFraction = rearingMortalityPercent / 100;
  const eggsPerCrate = Math.max(0, Math.round(nonNegative(input.eggsPerCrate)));
  const eggPricePerCrate = nonNegative(input.eggPricePerCrate);
  const spentLayerPricePerBird = nonNegative(input.spentLayerPricePerBird);
  const manureRevenue = nonNegative(input.estimatedManureRevenue);

  const birdPurchaseCost = startingBirds * purchasePricePerBird;
  const expectedRearingLosses = startingBirds * rearingMortalityFraction;
  const hensEnteringLay = Math.max(0, Math.round(startingBirds * (1 - rearingMortalityFraction)));

  // Period-by-period egg and surviving hen tracking
  const periods = input.layingPeriods ?? [];
  const layingMonths = Math.max(
    1,
    Math.round(nonNegative(input.layingDurationMonths) || periods.length || 1)
  );

  let currentHens = hensEnteringLay;
  const rawPeriodResults: Omit<LayerPeriodResult, 'amortizedRearingCost'>[] = periods.map(
    (period, index) => {
      const days = nonNegative(period.days);
      const layingPercent = clampNumber(period.layingPercent, 0, 150);
      const periodMortalityFraction = clampNumber(period.mortalityPercent, 0, 100) / 100;

      const startingHens = currentHens;
      const deaths = startingHens * periodMortalityFraction;
      const endingHens = Math.max(0, startingHens - deaths);
      const averageHens = (startingHens + endingHens) / 2;

      const eggsProduced = averageHens * (layingPercent / 100) * days;
      const cratesProduced = eggsPerCrate > 0 ? safeDiv(eggsProduced, eggsPerCrate) : 0;
      const eggRevenue = cratesProduced * eggPricePerCrate;

      currentHens = endingHens;

      return {
        id: period.id,
        periodName: period.periodName || `Period ${index + 1}`,
        days,
        startingHens,
        endingHens,
        averageHens,
        layingPercent,
        eggsProduced,
        cratesProduced,
        eggRevenue,
      };
    }
  );

  const survivingHensAtCulling = Math.max(0, Math.round(currentHens));
  const avgLayingHens = (hensEnteringLay + survivingHensAtCulling) / 2;

  // Separate rearing and laying feed stages
  const allStages = input.feedStages ?? [];
  const rearingStages = allStages.filter((s) => s.phase === 'rearing');
  const totalRearingDays = rearingStages.reduce((sum, s) => sum + nonNegative(s.durationDays), 0);

  let elapsedRearingDays = 0;
  const stageBreakdown: LayerStageResult[] = allStages.map((stage, index) => {
    const durationDays = nonNegative(stage.durationDays);
    const bagWeightKg = nonNegative(stage.bagWeightKg);
    const pricePerBag = nonNegative(stage.pricePerBag);

    const kgPerBird =
      stage.consumptionMode === 'daily_grams'
        ? (nonNegative(stage.dailyGramsPerBird) / 1000) * durationDays
        : nonNegative(stage.totalKgPerBird);

    let effectiveBirds = 0;
    if (stage.phase === 'rearing') {
      if (input.entryType === 'day_old_chicks') {
        const midpoint =
          totalRearingDays > 0
            ? (elapsedRearingDays + 0.5 * durationDays) / totalRearingDays
            : safeDiv(index + 0.5, Math.max(1, rearingStages.length));
        elapsedRearingDays += durationDays;
        effectiveBirds = Math.max(0, startingBirds - expectedRearingLosses * midpoint);
      } else {
        effectiveBirds = Math.max(0, startingBirds - expectedRearingLosses * 0.5);
      }
    } else {
      effectiveBirds = avgLayingHens;
    }

    const exactKgRequired = effectiveBirds * kgPerBird;
    const wholeBagsToPurchase = bagWeightKg > 0 ? Math.ceil(safeDiv(exactKgRequired, bagWeightKg)) : 0;
    const stageFeedCost = wholeBagsToPurchase * pricePerBag;

    return {
      id: stage.id,
      stageName: stage.stageName || `Feed Stage ${index + 1}`,
      phase: stage.phase,
      durationDays,
      effectiveBirds,
      exactKgRequired,
      wholeBagsToPurchase,
      bagWeightKg,
      pricePerBag,
      stageFeedCost,
    };
  });

  const rearingFeedCost = stageBreakdown
    .filter((s) => s.phase === 'rearing')
    .reduce((sum, s) => sum + s.stageFeedCost, 0);

  const layingFeedResults = stageBreakdown.filter((s) => s.phase === 'laying');
  const layingFeedKg = layingFeedResults.reduce((sum, s) => sum + s.exactKgRequired, 0);
  const layingFeedBags = layingFeedResults.reduce((sum, s) => sum + s.wholeBagsToPurchase, 0);
  const layingFeedCost = layingFeedResults.reduce((sum, s) => sum + s.stageFeedCost, 0);

  const totalFeedKg = stageBreakdown.reduce((sum, s) => sum + s.exactKgRequired, 0);
  const totalWholeBags = stageBreakdown.reduce((sum, s) => sum + s.wholeBagsToPurchase, 0);

  // Separate Rearing vs Laying non-feed expenses
  let rearingOtherExpenses = 0;
  let layingRecurringOpex = 0;
  let layingAmortizedCapex = 0;

  for (const item of input.expenseItems ?? []) {
    const rawAmount = nonNegative(item.amount);
    const cycles = Math.max(1, Math.round(nonNegative(item.amortizationCycles) || 1));
    const effectiveAmount = item.isCapex ? safeDiv(rawAmount, cycles) : rawAmount;

    if (item.phase === 'rearing') {
      rearingOtherExpenses += effectiveAmount;
    } else if (item.isCapex) {
      layingAmortizedCapex += effectiveAmount;
    } else {
      layingRecurringOpex += effectiveAmount;
    }
  }

  // Capitalized Rearing Cost (Day-Old includes full rearing feed + vaccines; Point-of-Lay includes pullet purchase + pre-lay transition)
  const capitalizedRearingCost = birdPurchaseCost + rearingFeedCost + rearingOtherExpenses;
  const monthlyAmortizedRearingCost = safeDiv(capitalizedRearingCost, layingMonths);

  const periodAmortizationShare =
    rawPeriodResults.length > 0
      ? safeDiv(capitalizedRearingCost, rawPeriodResults.length)
      : monthlyAmortizedRearingCost;

  const periodBreakdown: LayerPeriodResult[] = rawPeriodResults.map((p) => ({
    ...p,
    amortizedRearingCost: periodAmortizationShare,
  }));

  const layingPeriodDirectCost = layingFeedCost + layingRecurringOpex + layingAmortizedCapex;
  const cumulativeCost = capitalizedRearingCost + layingPeriodDirectCost;

  const totalEggs = periodBreakdown.reduce((sum, p) => sum + p.eggsProduced, 0);
  const totalCrates = eggsPerCrate > 0 ? safeDiv(totalEggs, eggsPerCrate) : 0;
  const eggRevenue = periodBreakdown.reduce((sum, p) => sum + p.eggRevenue, 0);
  const spentLayerRevenue = survivingHensAtCulling * spentLayerPricePerBird;
  const otherRevenue = spentLayerRevenue + manureRevenue;
  const totalRevenue = eggRevenue + otherRevenue;

  const netProfit = totalRevenue - cumulativeCost;
  const profitMarginPercent = safeDiv(netProfit, totalRevenue) * 100;
  const costPerCrate = safeDiv(cumulativeCost, totalCrates);
  const breakEvenPricePerCrate = safeDiv(Math.max(0, cumulativeCost - otherRevenue), totalCrates);
  const feedKgPerCrate = safeDiv(layingFeedKg, totalCrates);

  return {
    startingBirds,
    hensEnteringLay,
    survivingHensAtCulling,
    birdPurchaseCost,
    rearingFeedCost,
    rearingOtherExpenses,
    capitalizedRearingCost,
    monthlyAmortizedRearingCost,
    layingFeedKg,
    layingFeedBags,
    layingFeedCost,
    layingRecurringOpex,
    layingAmortizedCapex,
    layingPeriodDirectCost,
    cumulativeCost,
    totalFeedKg,
    totalWholeBags,
    totalEggs,
    totalCrates,
    eggRevenue,
    spentLayerRevenue,
    manureRevenue,
    otherRevenue,
    totalRevenue,
    netProfit,
    profitMarginPercent,
    costPerCrate,
    breakEvenPricePerCrate,
    feedKgPerCrate,
    stageBreakdown,
    periodBreakdown,
    howCalculated: {
      rearingAmortizationFormula: `Capitalized Rearing (${formatCurrency(capitalizedRearingCost, currency)}) = Bird Purchase (${formatCurrency(birdPurchaseCost, currency)}) + Rearing Feed (${formatCurrency(rearingFeedCost, currency)}) + Rearing Expenses (${formatCurrency(rearingOtherExpenses, currency)}), amortized at ${formatCurrency(monthlyAmortizedRearingCost, currency)}/month across ${formatNumber(layingMonths)} laying months.`,
      eggOutputFormula: `Sum across periods of (Average Surviving Hens × Period Laying % × Days) = ${formatNumber(totalEggs)} eggs ÷ ${formatNumber(eggsPerCrate)} eggs/crate = ${formatNumber(totalCrates, 1)} crates.`,
      crateBreakEvenFormula: `(Cumulative Cost ${formatCurrency(cumulativeCost, currency)} − Spent Layer & Manure Revenue ${formatCurrency(otherRevenue, currency)}) ÷ ${formatNumber(totalCrates, 1)} crates = ${formatCurrency(breakEvenPricePerCrate, currency)}/crate.`,
      feedEfficiencyFormula: `Laying Feed (${formatNumber(layingFeedKg, 1)} kg) ÷ Total Crates (${formatNumber(totalCrates, 1)}) = ${formatNumber(feedKgPerCrate, 2)} kg feed per crate.`,
    },
  };
}
