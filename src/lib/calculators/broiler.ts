import type {
  BroilerPlanInput,
  BroilerPlanResult,
  BroilerStageResult,
} from '@/src/types/domain';
import { clampNumber, formatCurrency, formatNumber, nonNegative, safeDiv } from './format';

export function calculateBroilerPlan(
  input: BroilerPlanInput,
  currency = '₦'
): BroilerPlanResult {
  const startingBirds = Math.round(nonNegative(input.startingBirds));
  const pricePerChick = nonNegative(input.pricePerChick);
  const mortalityRatePercent = clampNumber(input.mortalityRatePercent, 0, 100);
  const mortalityFraction = mortalityRatePercent / 100;
  const targetAvgWeightKg = nonNegative(input.targetAvgWeightKg);

  const expectedDeadBirds = startingBirds * mortalityFraction;
  const survivingBirds = Math.max(0, Math.round(startingBirds * (1 - mortalityFraction)));
  const chickCost = startingBirds * pricePerChick;

  const stages = input.feedStages ?? [];
  const totalStageDays = stages.reduce((sum, s) => sum + nonNegative(s.durationDays), 0);

  let elapsedDays = 0;
  const stageBreakdown: BroilerStageResult[] = stages.map((stage, index) => {
    const durationDays = nonNegative(stage.durationDays);
    const bagWeightKg = nonNegative(stage.bagWeightKg);
    const pricePerBag = nonNegative(stage.pricePerBag);
    const feedPerBirdKg = nonNegative(stage.feedPerBirdKg);

    const midpointFraction =
      totalStageDays > 0
        ? (elapsedDays + 0.5 * durationDays) / totalStageDays
        : safeDiv(index + 0.5, Math.max(1, stages.length));

    elapsedDays += durationDays;

    const effectiveBirds = Math.max(0, startingBirds - expectedDeadBirds * midpointFraction);
    const exactKgRequired = effectiveBirds * feedPerBirdKg;
    const wholeBagsToPurchase = bagWeightKg > 0 ? Math.ceil(safeDiv(exactKgRequired, bagWeightKg)) : 0;
    const stageFeedCost = wholeBagsToPurchase * pricePerBag;

    return {
      id: stage.id,
      stageName: stage.stageName || `Stage ${index + 1}`,
      durationDays,
      effectiveBirds,
      exactKgRequired,
      wholeBagsToPurchase,
      bagWeightKg,
      pricePerBag,
      stageFeedCost,
      midpointFraction,
    };
  });

  const totalFeedKg = stageBreakdown.reduce((sum, s) => sum + s.exactKgRequired, 0);
  const totalWholeBags = stageBreakdown.reduce((sum, s) => sum + s.wholeBagsToPurchase, 0);
  const totalFeedCost = stageBreakdown.reduce((sum, s) => sum + s.stageFeedCost, 0);

  let recurringOpex = 0;
  let amortizedCapex = 0;

  for (const item of input.expenseItems ?? []) {
    const amount = nonNegative(item.amount);
    if (item.isCapex) {
      const cycles = Math.max(1, Math.round(nonNegative(item.amortizationCycles) || 1));
      amortizedCapex += safeDiv(amount, cycles);
    } else {
      recurringOpex += amount;
    }
  }

  const totalProductionCost = chickCost + totalFeedCost + recurringOpex + amortizedCapex;
  const totalLiveweightKg = survivingBirds * targetAvgWeightKg;

  const projectedRevenue =
    input.sellingMethod === 'per_kg'
      ? totalLiveweightKg * nonNegative(input.sellingPricePerKg)
      : survivingBirds * nonNegative(input.sellingPricePerBird);

  const netProfit = projectedRevenue - totalProductionCost;
  const profitMarginPercent = safeDiv(netProfit, projectedRevenue) * 100;
  const costPerSurvivingBird = safeDiv(totalProductionCost, survivingBirds);
  const breakEvenPricePerBird = costPerSurvivingBird;
  const breakEvenPricePerKg = safeDiv(totalProductionCost, totalLiveweightKg);
  const projectedFcr = safeDiv(totalFeedKg, totalLiveweightKg);

  return {
    startingBirds,
    expectedDeadBirds,
    survivingBirds,
    chickCost,
    totalFeedKg,
    totalWholeBags,
    totalFeedCost,
    recurringOpex,
    amortizedCapex,
    totalProductionCost,
    totalLiveweightKg,
    projectedRevenue,
    netProfit,
    profitMarginPercent,
    costPerSurvivingBird,
    breakEvenPricePerBird,
    breakEvenPricePerKg,
    projectedFcr,
    stageBreakdown,
    howCalculated: {
      mortalityFormula: `${formatNumber(startingBirds)} chicks × (1 − ${formatNumber(mortalityRatePercent, 1)}%) = ${formatNumber(survivingBirds)} surviving birds (${formatNumber(expectedDeadBirds, 1)} expected losses distributed across feed stage midpoints).`,
      feedFormula: `Each stage computes Effective Birds × kg/bird, then rounds up to whole bags (⌈kg ÷ bag weight⌉). Total = ${formatNumber(totalFeedKg, 1)} kg across ${formatNumber(totalWholeBags)} bags = ${formatCurrency(totalFeedCost, currency)}.`,
      revenueFormula:
        input.sellingMethod === 'per_kg'
          ? `Per-kg mode: ${formatNumber(survivingBirds)} birds × ${formatNumber(targetAvgWeightKg, 2)} kg = ${formatNumber(totalLiveweightKg, 1)} kg × ${formatCurrency(input.sellingPricePerKg, currency)}/kg = ${formatCurrency(projectedRevenue, currency)}.`
          : `Per-bird mode: ${formatNumber(survivingBirds)} surviving birds × ${formatCurrency(input.sellingPricePerBird, currency)}/bird = ${formatCurrency(projectedRevenue, currency)}.`,
      breakEvenFormula: `Total Cost (${formatCurrency(totalProductionCost, currency)}) ÷ ${formatNumber(survivingBirds)} surviving birds = ${formatCurrency(breakEvenPricePerBird, currency)}/bird (${formatCurrency(breakEvenPricePerKg, currency)}/kg).`,
      fcrFormula: `Total Feed (${formatNumber(totalFeedKg, 1)} kg) ÷ Total Liveweight (${formatNumber(totalLiveweightKg, 1)} kg) = ${formatNumber(projectedFcr, 2)} FCR.`,
    },
  };
}
