import type {
  BirdType,
  BroilerPlanInput,
  CalendarActivity,
  LayerPlanInput,
  PlannerTemplate,
  SiteFaq,
  SiteSection,
  SiteSettings,
} from '@/src/types/domain';

const NOW_ISO = '2026-11-15T00:00:00.000Z';

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  id: '11111111-1111-1111-1111-111111111111',
  site_name: 'Poultry Profit Planner',
  tagline: 'Plan Better. Calculate Smarter. Farm Profitably.',
  footer_about:
    'Built for commercial and emerging broiler and layer farmers who want clear unit economics, accurate feed stage budgets, and offline-ready daily farm records.',
  contact_email: 'daagsdigitalconcept@gmail.com',
  contact_phone: '08168779732',
  disclaimer_text:
    'Estimates depend on your inputs, bird genetics, feed quality, and farm management; results are projections, not guaranteed profits.',
  navigation_links: [
    { label: 'Estimator', href: '/#estimator' },
    { label: 'Broiler Planner', href: '/planner/broiler' },
    { label: 'Layer Planner', href: '/planner/layer' },
    { label: 'Scenarios', href: '/scenarios' },
    { label: 'Dashboard', href: '/dashboard' },
  ],
  footer_links: [
    { label: 'Broiler Planner', href: '/planner/broiler' },
    { label: 'Layer Planner', href: '/planner/layer' },
    { label: 'What-If Comparator', href: '/scenarios' },
    { label: 'Production Calendar', href: '/calendar' },
    { label: 'Reports & Exports', href: '/reports' },
  ],
  created_at: NOW_ISO,
  updated_at: NOW_ISO,
  deleted_at: null,
};

export const DEFAULT_SITE_SECTIONS: SiteSection[] = [
  {
    id: '22222222-2222-2222-2222-222222222201',
    section_key: 'hero',
    section_type: 'hero',
    heading: 'Know your exact feed bags, break-even price, and flock profit before the chicks arrive.',
    subheading: 'Built for field-ready poultry farming',
    body_text:
      'Model broiler batches and multi-month layer flocks with stage-adjusted mortality, amortized equipment costs, and offline-first daily records that work right inside your poultry house.',
    primary_cta_label: 'Open Full Planner',
    primary_cta_link: '/planner/broiler',
    secondary_cta_label: 'Try Quick Estimator',
    secondary_cta_link: '#estimator',
    items: [
      {
        title: 'Stage-Adjusted Feed',
        description:
          'Accounts for early flock mortality so starter and finisher bag counts reflect real consumption.',
        badge: 'Broiler & Layer',
      },
      {
        title: 'Rearing Amortization',
        description:
          'Spreads day-old rearing costs cleanly across laying months without distorting monthly P&L.',
        badge: 'Layer Math',
      },
      {
        title: 'Offline-First Records',
        description:
          'Log mortality, feed bags, and egg crates with zero signal; syncs automatically later.',
        badge: 'IndexedDB',
      },
    ],
    display_order: 1,
    is_visible: true,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
    deleted_at: null,
  },
  {
    id: '22222222-2222-2222-2222-222222222202',
    section_key: 'value_props',
    section_type: 'value_props',
    heading: 'Engineered around real poultry house math, not generic spreadsheets.',
    subheading: 'Why farmers replace guesswork',
    body_text:
      'Feed typically makes up 65–75% of total poultry production cost. A small miscalculation in bag counts or break-even crate price wipes out margins. Every formula inside Poultry Profit Planner exposes its exact calculation.',
    primary_cta_label: 'Compare What-If Scenarios',
    primary_cta_link: '/scenarios',
    secondary_cta_label: '',
    secondary_cta_link: '',
    items: [
      {
        title: '01. Whole Bags + Exact Kg',
        description:
          'See exact kilogram feed demand alongside rounded-up whole 25 kg or 50 kg bags to purchase from the feed mill.',
        icon: 'scale',
      },
      {
        title: '02. Zero Double-Counting',
        description:
          'Choose per-bird or per-kg selling mode for broilers, and cleanly separate capitalized rearing from monthly layer expenses.',
        icon: 'shield',
      },
      {
        title: '03. One-Tap Cycle Conversion',
        description:
          'Turn any approved budget into an active production cycle with pre-scheduled vaccination and feed-switch milestones.',
        icon: 'calendar',
      },
    ],
    display_order: 2,
    is_visible: true,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
    deleted_at: null,
  },
  {
    id: '22222222-2222-2222-2222-222222222203',
    section_key: 'how_it_works',
    section_type: 'how_it_works',
    heading: 'From pre-stocking budget to final harvest ledger in four steps.',
    subheading: 'Workflow',
    body_text:
      'Start immediately with zero registration, save drafts to your device, and convert winning plans into live farm cycles.',
    primary_cta_label: 'Launch Layer Planner',
    primary_cta_link: '/planner/layer',
    secondary_cta_label: '',
    secondary_cta_link: '',
    items: [
      {
        title: '1. Load a Starter Template',
        description:
          'Start with editable Broiler (3-stage or 2-stage) or Layer (Day-Old or Point-of-Lay) assumptions and adjust to your local market prices.',
        badge: 'Step 01',
      },
      {
        title: '2. Stress-Test Your Margins',
        description:
          'Run side-by-side What-If scenarios for feed price spikes, mortality changes, or market price dips before buying stock.',
        badge: 'Step 02',
      },
      {
        title: '3. Convert to Active Cycle',
        description:
          'Lock in your budget baseline, select Simple Expense or Bag Inventory feed tracking, and auto-generate farm milestones.',
        badge: 'Step 03',
      },
      {
        title: '4. Track Variance & Export',
        description:
          'Log daily crates, mortality, and expenses offline in the pen, then print clean PDF or Excel reports anytime.',
        badge: 'Step 04',
      },
    ],
    display_order: 3,
    is_visible: true,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
    deleted_at: null,
  },
  {
    id: '22222222-2222-2222-2222-222222222204',
    section_key: 'feature_grid',
    section_type: 'feature_grid',
    heading: 'Everything needed across planning, daily pens, and financial reporting.',
    subheading: 'Platform capabilities',
    body_text:
      'Designed for outdoor sunlit legibility on mobile phones and full analytical clarity on desktop screens.',
    primary_cta_label: 'View Dashboard',
    primary_cta_link: '/dashboard',
    secondary_cta_label: '',
    secondary_cta_link: '',
    items: [
      {
        title: 'Multi-Farm & Multi-Cycle Tracking',
        description:
          'Filter KPIs, flock counts, and cashflow across all farms or isolate a single poultry house.',
        icon: 'layers',
      },
      {
        title: 'Bag Inventory & Simple Expense Modes',
        description:
          'Track every bag purchased vs. consumed in store, or record direct feed expenses per batch.',
        icon: 'package',
      },
      {
        title: 'Period Laying Curve Modeling',
        description:
          'Model onset, peak, and late-lay egg percentages month by month instead of a flat unrealistic average.',
        icon: 'trending',
      },
      {
        title: 'OpEx vs. Amortized CapEx',
        description:
          'Amortize drinkers, feeders, cages, and housing repairs across multiple production cycles.',
        icon: 'calculator',
      },
    ],
    display_order: 4,
    is_visible: true,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
    deleted_at: null,
  },
  {
    id: '22222222-2222-2222-2222-222222222206',
    section_key: 'testimonials',
    section_type: 'testimonials',
    heading: 'Trusted by poultry farmers managing real flock budgets.',
    subheading: 'Farmer Stories',
    body_text:
      'See how commercial broiler growers and layer farms use stage-adjusted feed modeling and offline daily logs to protect batch margins.',
    primary_cta_label: '',
    primary_cta_link: '',
    secondary_cta_label: '',
    secondary_cta_link: '',
    items: [
      {
        title: 'Chinedu Okafor',
        author_role: 'Managing Farmer',
        farm_name: 'Greenfield Broilers, Ogun State',
        metric: 'Saved 14 bags of finisher feed across 1,500 birds',
        description:
          'Before using Poultry Profit Planner, our paper estimates always over-ordered finisher feed by 10–15 bags. Accounting for early mortality across each feed stage cut dead feed capital on our very next 42-day cycle.',
      },
      {
        title: 'Amina Bello',
        author_role: 'Operations Lead',
        farm_name: 'Kano Crest Layer Farms',
        metric: 'Clear break-even crate pricing across 12 laying months',
        description:
          'Separating our 18-week rearing cost from monthly layer mash showed our true break-even price per 30-egg crate. Adjusting our wholesale pricing kept every month profitable even when maize prices shifted.',
      },
      {
        title: 'Tunde Adeyemi',
        author_role: 'Farm Supervisor',
        farm_name: 'Cedar Valley Poultry',
        metric: '100% daily pen logging with zero mobile signal',
        description:
          'Network inside our deep-litter pens is unreliable. Attendants log daily mortality, bag consumption, and egg crates offline on their phones, and everything syncs cleanly to my dashboard once back at the office.',
      },
    ],
    display_order: 5,
    is_visible: true,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
    deleted_at: null,
  },
  {
    id: '22222222-2222-2222-2222-222222222205',
    section_key: 'cta',
    section_type: 'cta',
    heading: 'Ready to model your next broiler batch or layer house?',
    subheading: 'Start free — works offline on your device',
    body_text:
      'Run unlimited broiler and layer budgets right now. Create a free account anytime to sync plans and daily logs across devices.',
    primary_cta_label: 'Create Broiler Plan',
    primary_cta_link: '/planner/broiler',
    secondary_cta_label: 'Create Layer Plan',
    secondary_cta_link: '/planner/layer',
    items: [],
    display_order: 6,
    is_visible: true,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
    deleted_at: null,
  },
];

export const DEFAULT_SITE_FAQS: SiteFaq[] = [
  {
    id: '33333333-3333-3333-3333-333333333301',
    question: 'Does Poultry Profit Planner work without internet inside the poultry house?',
    answer:
      'Yes. Your plans, daily mortality, feed logs, egg collections, and financial entries save immediately to your device via IndexedDB and sync automatically to your cloud account whenever connectivity returns.',
    category: 'Offline & Sync',
    display_order: 1,
    is_visible: true,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
    deleted_at: null,
  },
  {
    id: '33333333-3333-3333-3333-333333333302',
    question: 'How does the Broiler engine avoid overestimating feed when birds die early?',
    answer:
      'Expected mortality is distributed proportionally across each feed stage midpoint. Birds lost in the starter phase are not counted as consuming full grower and finisher rations, giving you realistic kilogram and whole-bag totals.',
    category: 'Calculations',
    display_order: 2,
    is_visible: true,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
    deleted_at: null,
  },
  {
    id: '33333333-3333-3333-3333-333333333303',
    question: 'How are Day-Old Layer rearing costs handled during laying months?',
    answer:
      'When starting from day-old chicks, chick cost, starter/grower/pre-layer feed, and rearing medications are capitalized into a Rearing Cost total and amortized evenly across your laying months so monthly egg P&L remains accurate.',
    category: 'Calculations',
    display_order: 3,
    is_visible: true,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
    deleted_at: null,
  },
  {
    id: '33333333-3333-3333-3333-333333333304',
    question: 'Can I try the planner before creating an account?',
    answer:
      'Yes. You can use the Quick Estimator on the homepage or the full Broiler and Layer Planners immediately. Plans saved as a guest stay on your device and can be migrated into your account as soon as you sign in.',
    category: 'Account',
    display_order: 4,
    is_visible: true,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
    deleted_at: null,
  },
];

export const DEFAULT_BROILER_INPUT: BroilerPlanInput = {
  startingBirds: 500,
  pricePerChick: 950,
  durationDays: 42,
  mortalityRatePercent: 5,
  targetAvgWeightKg: 2.3,
  sellingMethod: 'per_bird',
  sellingPricePerBird: 8500,
  sellingPricePerKg: 3800,
  feedStages: [
    {
      id: 'st-1',
      stageName: 'Starter',
      durationDays: 14,
      feedPerBirdKg: 0.65,
      bagWeightKg: 25,
      pricePerBag: 22500,
    },
    {
      id: 'st-2',
      stageName: 'Grower',
      durationDays: 14,
      feedPerBirdKg: 1.45,
      bagWeightKg: 25,
      pricePerBag: 21500,
    },
    {
      id: 'st-3',
      stageName: 'Finisher',
      durationDays: 14,
      feedPerBirdKg: 1.95,
      bagWeightKg: 25,
      pricePerBag: 21000,
    },
  ],
  expenseItems: [
    {
      id: 'ex-1',
      category: 'Vaccination',
      description: 'Gumboro & Newcastle vaccines',
      amount: 45000,
      isCapex: false,
      amortizationCycles: 1,
    },
    {
      id: 'ex-2',
      category: 'Medication',
      description: 'Vitamins, anticoccidials & brooding boosters',
      amount: 55000,
      isCapex: false,
      amortizationCycles: 1,
    },
    {
      id: 'ex-3',
      category: 'Litter',
      description: 'Wood shavings & disinfectants',
      amount: 35000,
      isCapex: false,
      amortizationCycles: 1,
    },
    {
      id: 'ex-4',
      category: 'Electricity & Water',
      description: 'Brooding heat, charcoal/gas & water',
      amount: 65000,
      isCapex: false,
      amortizationCycles: 1,
    },
    {
      id: 'ex-5',
      category: 'Labour',
      description: 'Pen attendant allowance (6 weeks)',
      amount: 90000,
      isCapex: false,
      amortizationCycles: 1,
    },
    {
      id: 'ex-6',
      category: 'Equipment',
      description: 'Feeders & bell drinkers (amortized over 6 cycles)',
      amount: 180000,
      isCapex: true,
      amortizationCycles: 6,
    },
  ],
};

export const DEFAULT_LAYER_INPUT: LayerPlanInput = {
  startingBirds: 500,
  entryType: 'day_old_chicks',
  purchasePricePerBird: 1150,
  rearingMortalityPercent: 5,
  ageAtFirstLayWeeks: 18,
  layingDurationMonths: 12,
  eggsPerCrate: 30,
  eggPricePerCrate: 5200,
  spentLayerPricePerBird: 4800,
  estimatedManureRevenue: 180000,
  feedStages: [
    {
      id: 'ls-1',
      stageName: 'Chick Starter',
      phase: 'rearing',
      durationDays: 56,
      consumptionMode: 'total_kg',
      dailyGramsPerBird: 38,
      totalKgPerBird: 2.1,
      bagWeightKg: 25,
      pricePerBag: 21000,
    },
    {
      id: 'ls-2',
      stageName: 'Grower Mash',
      phase: 'rearing',
      durationDays: 56,
      consumptionMode: 'total_kg',
      dailyGramsPerBird: 65,
      totalKgPerBird: 3.6,
      bagWeightKg: 25,
      pricePerBag: 18500,
    },
    {
      id: 'ls-3',
      stageName: 'Pre-Layer',
      phase: 'rearing',
      durationDays: 14,
      consumptionMode: 'daily_grams',
      dailyGramsPerBird: 90,
      totalKgPerBird: 1.26,
      bagWeightKg: 25,
      pricePerBag: 19200,
    },
    {
      id: 'ls-4',
      stageName: 'Layer Mash',
      phase: 'laying',
      durationDays: 365,
      consumptionMode: 'daily_grams',
      dailyGramsPerBird: 115,
      totalKgPerBird: 41.975,
      bagWeightKg: 25,
      pricePerBag: 19500,
    },
  ],
  layingPeriods: [
    { id: 'lp-1', periodName: 'Month 1 (Onset)', days: 30, layingPercent: 35, mortalityPercent: 0.5 },
    { id: 'lp-2', periodName: 'Month 2 (Ramp-Up)', days: 30, layingPercent: 74, mortalityPercent: 0.4 },
    { id: 'lp-3', periodName: 'Month 3 (Peak)', days: 30, layingPercent: 90, mortalityPercent: 0.4 },
    { id: 'lp-4', periodName: 'Month 4 (Peak)', days: 30, layingPercent: 91, mortalityPercent: 0.4 },
    { id: 'lp-5', periodName: 'Month 5 (Peak)', days: 30, layingPercent: 89, mortalityPercent: 0.4 },
    { id: 'lp-6', periodName: 'Month 6', days: 30, layingPercent: 87, mortalityPercent: 0.4 },
    { id: 'lp-7', periodName: 'Month 7', days: 30, layingPercent: 84, mortalityPercent: 0.4 },
    { id: 'lp-8', periodName: 'Month 8', days: 30, layingPercent: 81, mortalityPercent: 0.5 },
    { id: 'lp-9', periodName: 'Month 9', days: 30, layingPercent: 78, mortalityPercent: 0.5 },
    { id: 'lp-10', periodName: 'Month 10', days: 30, layingPercent: 75, mortalityPercent: 0.5 },
    { id: 'lp-11', periodName: 'Month 11', days: 30, layingPercent: 72, mortalityPercent: 0.5 },
    { id: 'lp-12', periodName: 'Month 12 (Late Lay)', days: 35, layingPercent: 68, mortalityPercent: 0.6 },
  ],
  expenseItems: [
    {
      id: 'lex-1',
      category: 'Vaccination',
      description: 'Full rearing vaccine series',
      amount: 110000,
      phase: 'rearing',
      isCapex: false,
      amortizationCycles: 1,
    },
    {
      id: 'lex-2',
      category: 'Medication',
      description: 'Brooding & grower health support',
      amount: 85000,
      phase: 'rearing',
      isCapex: false,
      amortizationCycles: 1,
    },
    {
      id: 'lex-3',
      category: 'Labour',
      description: 'Rearing phase attendant (18 weeks)',
      amount: 220000,
      phase: 'rearing',
      isCapex: false,
      amortizationCycles: 1,
    },
    {
      id: 'lex-4',
      category: 'Labour',
      description: 'Laying house labour (12 months)',
      amount: 720000,
      phase: 'laying',
      isCapex: false,
      amortizationCycles: 1,
    },
    {
      id: 'lex-5',
      category: 'Medication',
      description: 'Deworming, calcium & routine boosters',
      amount: 140000,
      phase: 'laying',
      isCapex: false,
      amortizationCycles: 1,
    },
    {
      id: 'lex-6',
      category: 'Equipment',
      description: 'Battery cages / nest boxes (amortized 4 cycles)',
      amount: 900000,
      phase: 'laying',
      isCapex: true,
      amortizationCycles: 4,
    },
  ],
};

export const DEFAULT_PLANNER_TEMPLATES: PlannerTemplate[] = [
  {
    id: '44444444-4444-4444-4444-444444444401',
    bird_type: 'broiler',
    template_name: 'Standard 3-Stage Broiler (500 Birds · 42 Days)',
    description: 'Sample Estimate — Adjust chick, feed bag, and selling prices to your local farm market.',
    is_active: true,
    default_assumptions: DEFAULT_BROILER_INPUT as unknown as Record<string, unknown>,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
    deleted_at: null,
  },
  {
    id: '44444444-4444-4444-4444-444444444402',
    bird_type: 'broiler',
    template_name: 'Fast 2-Stage Broiler (500 Birds · 38 Days)',
    description: 'Sample Estimate — Starter + Finisher program for fast commercial turnaround.',
    is_active: true,
    default_assumptions: {
      ...DEFAULT_BROILER_INPUT,
      durationDays: 38,
      mortalityRatePercent: 4.5,
      targetAvgWeightKg: 2.05,
      sellingMethod: 'per_kg',
      feedStages: [
        {
          id: 'st-1',
          stageName: 'Super Starter',
          durationDays: 18,
          feedPerBirdKg: 1.05,
          bagWeightKg: 25,
          pricePerBag: 22500,
        },
        {
          id: 'st-2',
          stageName: 'Finisher',
          durationDays: 20,
          feedPerBirdKg: 2.55,
          bagWeightKg: 25,
          pricePerBag: 21200,
        },
      ],
    } as unknown as Record<string, unknown>,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
    deleted_at: null,
  },
  {
    id: '44444444-4444-4444-4444-444444444403',
    bird_type: 'layer',
    template_name: 'Day-Old Layer Flock (500 Birds · 12 Laying Months)',
    description: 'Sample Estimate — Models 18-week rearing capitalization plus 12 months of graded egg production.',
    is_active: true,
    default_assumptions: DEFAULT_LAYER_INPUT as unknown as Record<string, unknown>,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
    deleted_at: null,
  },
  {
    id: '44444444-4444-4444-4444-444444444404',
    bird_type: 'layer',
    template_name: 'Point-of-Lay Pullets (500 Birds · 12 Laying Months)',
    description: 'Sample Estimate — Immediate egg production starting at 16–18 weeks old.',
    is_active: true,
    default_assumptions: {
      ...DEFAULT_LAYER_INPUT,
      entryType: 'point_of_lay',
      purchasePricePerBird: 6800,
      rearingMortalityPercent: 1,
      feedStages: [
        {
          id: 'ls-3',
          stageName: 'Pre-Layer Transition',
          phase: 'rearing',
          durationDays: 14,
          consumptionMode: 'daily_grams',
          dailyGramsPerBird: 95,
          totalKgPerBird: 1.33,
          bagWeightKg: 25,
          pricePerBag: 19200,
        },
        {
          id: 'ls-4',
          stageName: 'Layer Mash',
          phase: 'laying',
          durationDays: 365,
          consumptionMode: 'daily_grams',
          dailyGramsPerBird: 115,
          totalKgPerBird: 41.975,
          bagWeightKg: 25,
          pricePerBag: 19500,
        },
      ],
    } as unknown as Record<string, unknown>,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
    deleted_at: null,
  },
];

export function addDaysIso(startDate: string, days: number): string {
  const date = new Date(`${startDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function generateCycleMilestones(params: {
  userId: string;
  cycleId: string;
  cycleName: string;
  birdType: BirdType;
  startDate: string;
  durationDays: number;
  feedStageNames?: string[];
  feedStageDurations?: number[];
}): CalendarActivity[] {
  const { userId, cycleId, cycleName, birdType, startDate, durationDays } = params;
  const now = new Date().toISOString();

  const makeActivity = (
    offsetDays: number,
    activityType: CalendarActivity['activity_type'],
    title: string,
    notes: string
  ): CalendarActivity => ({
    id: crypto.randomUUID(),
    user_id: userId,
    cycle_id: cycleId,
    scheduled_date: addDaysIso(startDate, offsetDays),
    activity_type: activityType,
    title: `${title} (${cycleName})`,
    notes,
    is_completed: false,
    completed_at: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  });

  const activities: CalendarActivity[] = [
    makeActivity(0, 'general', 'Day 1 Stocking & Brooding Setup', 'Verify brooder heat, clean drinkers, glucose/vitamins in water.'),
  ];

  if (birdType === 'broiler') {
    activities.push(
      makeActivity(7, 'vaccination', '1st Gumboro / Lasota Window', 'Confirm flock vaccination schedule with veterinary guidance.'),
      makeActivity(7, 'weighing', 'Week 1 Sample Weighing', 'Weigh 5% of birds to verify early growth target.'),
      makeActivity(14, 'vaccination', '2nd Gumboro Booster Window', 'Administer booster per local vet protocol.'),
      makeActivity(21, 'weighing', 'Mid-Cycle Weight Check', 'Compare sample weight against projected curve.'),
      makeActivity(28, 'vaccination', 'Newcastle Booster Check', 'Confirm booster requirement and litter dryness.'),
      makeActivity(Math.max(14, durationDays), 'market_date', 'Target Harvest & Market Date', 'Confirm buyer orders and liveweight grading.')
    );

    if (params.feedStageNames && params.feedStageDurations) {
      let cumulative = 0;
      params.feedStageNames.forEach((name, idx) => {
        if (idx > 0) {
          activities.push(
            makeActivity(
              cumulative,
              'feed_change',
              `Transition to ${name}`,
              `Gradually blend previous ration with ${name} over 2–3 days.`
            )
          );
        }
        cumulative += params.feedStageDurations![idx] || 0;
      });
    }
  } else {
    activities.push(
      makeActivity(7, 'vaccination', 'Early Chick Vaccination Window', 'Follow veterinary schedule for Newcastle / Gumboro.'),
      makeActivity(28, 'weighing', '4-Week Pullet Uniformity Check', 'Target ≥ 80% flock weight uniformity.'),
      makeActivity(56, 'feed_change', 'Transition to Grower Mash', 'Switch from Chick Starter to Grower ration.'),
      makeActivity(112, 'feed_change', 'Pre-Layer Calcium Transition', 'Introduce Pre-Layer ration ahead of point-of-lay.'),
      makeActivity(126, 'egg_milestone', 'Expected Point-of-Lay (Week 18)', 'Verify nest boxes / cages and transition to Layer Mash.'),
      makeActivity(Math.max(180, durationDays), 'market_date', 'Planned Cycle End / Spent Layer Review', 'Evaluate late-lay hen-day % vs feed cost.')
    );
  }

  return activities;
}
