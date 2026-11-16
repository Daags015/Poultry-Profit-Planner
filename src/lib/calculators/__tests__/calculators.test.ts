import { describe, expect, it } from 'vitest';
import { calculateBroilerPlan } from '../broiler';
import { calculateLayerPlan } from '../layer';
import { safeDiv } from '../format';
import type { BroilerPlanInput, LayerPlanInput } from '@/src/types/domain';

describe('safeDiv utility', () => {
  it('returns 0 when denominator is zero or non-finite', () => {
    expect(safeDiv(100, 0)).toBe(0);
    expect(safeDiv(100, Number.NaN)).toBe(0);
    expect(safeDiv(Number.POSITIVE_INFINITY, 10)).toBe(0);
    expect(safeDiv(50, 10)).toBe(5);
  });
});

describe('Broiler Production Calculation Engine', () => {
  const baseBroilerInput: BroilerPlanInput = {
    startingBirds: 1000,
    pricePerChick: 1000,
    durationDays: 42,
    mortalityRatePercent: 10, // 100 expected dead -> 900 surviving
    targetAvgWeightKg: 2.0,
    sellingMethod: 'per_bird',
    sellingPricePerBird: 8500,
    sellingPricePerKg: 4200,
    feedStages: [
      {
        id: 's1',
        stageName: 'Starter',
        durationDays: 14,
        feedPerBirdKg: 0.6,
        bagWeightKg: 25,
        pricePerBag: 22000,
      },
      {
        id: 's2',
        stageName: 'Grower',
        durationDays: 14,
        feedPerBirdKg: 1.4,
        bagWeightKg: 25,
        pricePerBag: 21000,
      },
      {
        id: 's3',
        stageName: 'Finisher',
        durationDays: 14,
        feedPerBirdKg: 2.0,
        bagWeightKg: 25,
        pricePerBag: 20000,
      },
    ],
    expenseItems: [
      {
        id: 'e1',
        category: 'Vaccination',
        description: 'Vaccines',
        amount: 50000,
        isCapex: false,
        amortizationCycles: 1,
      },
      {
        id: 'e2',
        category: 'Equipment',
        description: 'Drinkers',
        amount: 200000,
        isCapex: true,
        amortizationCycles: 4, // 50,000 per cycle
      },
    ],
  };

  it('distributes expected mortality across stage midpoints and rounds up whole bags', () => {
    const res = calculateBroilerPlan(baseBroilerInput);

    expect(res.survivingBirds).toBe(900);
    expect(res.expectedDeadBirds).toBeCloseTo(100, 5);

    // Total days = 42. Stage midpoints: 7/42 = 1/6, 21/42 = 0.5, 35/42 = 5/6
    // Effective birds: 1000 - 100*(1/6) = 983.333, 950, 916.667
    expect(res.stageBreakdown[0].effectiveBirds).toBeCloseTo(983.333, 2);
    expect(res.stageBreakdown[1].effectiveBirds).toBeCloseTo(950, 2);
    expect(res.stageBreakdown[2].effectiveBirds).toBeCloseTo(916.667, 2);

    // Exact kg: 590, 1330, 1833.333
    expect(res.stageBreakdown[0].wholeBagsToPurchase).toBe(Math.ceil(590 / 25)); // 24
    expect(res.stageBreakdown[1].wholeBagsToPurchase).toBe(Math.ceil(1330 / 25)); // 54
    expect(res.stageBreakdown[2].wholeBagsToPurchase).toBe(Math.ceil(1833.333 / 25)); // 74
    expect(res.totalWholeBags).toBe(24 + 54 + 74);
  });

  it('enforces single selling mode (per_bird vs per_kg) and amortizes CapEx', () => {
    const perBird = calculateBroilerPlan(baseBroilerInput);
    expect(perBird.projectedRevenue).toBe(900 * 8500);
    expect(perBird.recurringOpex).toBe(50000);
    expect(perBird.amortizedCapex).toBe(50000);

    const perKg = calculateBroilerPlan({
      ...baseBroilerInput,
      sellingMethod: 'per_kg',
    });
    expect(perKg.totalLiveweightKg).toBe(900 * 2.0);
    expect(perKg.projectedRevenue).toBe(1800 * 4200);
    expect(perKg.projectedFcr).toBeCloseTo(perKg.totalFeedKg / 1800, 5);
  });

  it('handles zero birds, zero bag weight, and 100% mortality without NaN or Infinity', () => {
    const zeroResult = calculateBroilerPlan({
      ...baseBroilerInput,
      startingBirds: 0,
      mortalityRatePercent: 100,
      feedStages: [
        {
          id: 's1',
          stageName: 'Starter',
          durationDays: 0,
          feedPerBirdKg: 1,
          bagWeightKg: 0,
          pricePerBag: 20000,
        },
      ],
    });

    expect(Number.isFinite(zeroResult.netProfit)).toBe(true);
    expect(Number.isFinite(zeroResult.profitMarginPercent)).toBe(true);
    expect(zeroResult.breakEvenPricePerBird).toBe(0);
    expect(zeroResult.breakEvenPricePerKg).toBe(0);
    expect(zeroResult.projectedFcr).toBe(0);
    expect(zeroResult.totalWholeBags).toBe(0);
  });
});

describe('Layer Production Calculation Engine', () => {
  const baseLayerInput: LayerPlanInput = {
    startingBirds: 500,
    entryType: 'day_old_chicks',
    purchasePricePerBird: 1000,
    rearingMortalityPercent: 4, // 20 dead -> 480 hens entering lay
    ageAtFirstLayWeeks: 18,
    layingDurationMonths: 2,
    eggsPerCrate: 30,
    eggPricePerCrate: 5000,
    spentLayerPricePerBird: 4000,
    estimatedManureRevenue: 50000,
    feedStages: [
      {
        id: 'r1',
        stageName: 'Starter',
        phase: 'rearing',
        durationDays: 56,
        consumptionMode: 'total_kg',
        dailyGramsPerBird: 0,
        totalKgPerBird: 2,
        bagWeightKg: 25,
        pricePerBag: 20000,
      },
      {
        id: 'l1',
        stageName: 'Layer Mash',
        phase: 'laying',
        durationDays: 60,
        consumptionMode: 'daily_grams',
        dailyGramsPerBird: 120,
        totalKgPerBird: 0,
        bagWeightKg: 25,
        pricePerBag: 18000,
      },
    ],
    layingPeriods: [
      { id: 'p1', periodName: 'Month 1', days: 30, layingPercent: 80, mortalityPercent: 0 },
      { id: 'p2', periodName: 'Month 2', days: 30, layingPercent: 90, mortalityPercent: 0 },
    ],
    expenseItems: [
      {
        id: 'ex1',
        category: 'Vaccination',
        description: 'Rearing vaccines',
        amount: 60000,
        phase: 'rearing',
        isCapex: false,
        amortizationCycles: 1,
      },
      {
        id: 'ex2',
        category: 'Labour',
        description: 'Laying labour',
        amount: 120000,
        phase: 'laying',
        isCapex: false,
        amortizationCycles: 1,
      },
    ],
  };

  it('capitalizes rearing costs and amortizes evenly across laying months', () => {
    const res = calculateLayerPlan(baseLayerInput);

    expect(res.hensEnteringLay).toBe(480);
    expect(res.birdPurchaseCost).toBe(500000);
    expect(res.rearingOtherExpenses).toBe(60000);
    expect(res.capitalizedRearingCost).toBe(res.birdPurchaseCost + res.rearingFeedCost + 60000);
    expect(res.monthlyAmortizedRearingCost).toBeCloseTo(res.capitalizedRearingCost / 2, 4);

    // Period 1: 480 * 0.8 * 30 = 11,520 eggs -> 384 crates
    // Period 2: 480 * 0.9 * 30 = 12,960 eggs -> 432 crates
    expect(res.totalEggs).toBeCloseTo(24480, 2);
    expect(res.totalCrates).toBeCloseTo(816, 2);
    expect(res.eggRevenue).toBeCloseTo(816 * 5000, 2);
    expect(res.spentLayerRevenue).toBe(480 * 4000);
  });

  it('handles zero crate size and zero hens safely without NaN', () => {
    const zeroLayer = calculateLayerPlan({
      ...baseLayerInput,
      startingBirds: 0,
      eggsPerCrate: 0,
      layingDurationMonths: 0,
      layingPeriods: [],
    });

    expect(Number.isFinite(zeroLayer.costPerCrate)).toBe(true);
    expect(Number.isFinite(zeroLayer.breakEvenPricePerCrate)).toBe(true);
    expect(Number.isFinite(zeroLayer.feedKgPerCrate)).toBe(true);
    expect(zeroLayer.totalCrates).toBe(0);
    expect(zeroLayer.costPerCrate).toBe(0);
  });
});
