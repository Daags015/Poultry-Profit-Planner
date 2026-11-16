export type BirdType = 'broiler' | 'layer';
export type UserRole = 'user' | 'admin';
export type WeightUnit = 'kg' | 'lb';

export interface BaseRecord {
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  client_mutation_id?: string | null;
}

export interface Profile extends BaseRecord {
  full_name: string;
  phone: string;
  role: UserRole;
  default_currency: string;
  default_bag_weight_kg: number;
  default_crate_size: number;
  weight_unit: WeightUnit;
}

export type SiteSectionType =
  | 'hero'
  | 'value_props'
  | 'how_it_works'
  | 'feature_grid'
  | 'testimonials'
  | 'preview'
  | 'cta'
  | 'custom';

export interface SiteSectionItem {
  title: string;
  description: string;
  icon?: string;
  badge?: string;
  author_role?: string;
  farm_name?: string;
  metric?: string;
}

export interface SiteSection extends BaseRecord {
  section_key: string;
  section_type: SiteSectionType;
  heading: string;
  subheading: string;
  body_text: string;
  primary_cta_label: string;
  primary_cta_link: string;
  secondary_cta_label: string;
  secondary_cta_link: string;
  items: SiteSectionItem[];
  display_order: number;
  is_visible: boolean;
}

export interface SiteFaq extends BaseRecord {
  question: string;
  answer: string;
  category: string;
  display_order: number;
  is_visible: boolean;
}

export interface NavLinkItem {
  label: string;
  href: string;
}

export interface SiteSettings extends BaseRecord {
  site_name: string;
  tagline: string;
  footer_about: string;
  contact_email: string;
  contact_phone: string;
  disclaimer_text: string;
  navigation_links: NavLinkItem[];
  footer_links: NavLinkItem[];
}

export interface PlannerTemplate extends BaseRecord {
  bird_type: BirdType;
  template_name: string;
  description: string;
  is_active: boolean;
  default_assumptions: Record<string, unknown>;
}

export interface FeatureSuggestion extends BaseRecord {
  name: string;
  contact: string;
  category: string;
  suggestion: string;
  status: 'new' | 'planned' | 'completed';
}

export interface Farm extends BaseRecord {
  user_id: string;
  farm_name: string;
  location: string;
  farm_type: string;
  notes: string;
}

// Broiler Planner Types
export interface BroilerFeedStage {
  id: string;
  stageName: string;
  durationDays: number;
  feedPerBirdKg: number;
  bagWeightKg: number;
  pricePerBag: number;
}

export interface PlannerExpenseItem {
  id: string;
  category: string;
  description: string;
  amount: number;
  isCapex: boolean;
  amortizationCycles: number;
  phase?: 'rearing' | 'laying';
}

export type BroilerSellingMethod = 'per_bird' | 'per_kg';

export interface BroilerPlanInput {
  startingBirds: number;
  pricePerChick: number;
  durationDays: number;
  mortalityRatePercent: number;
  targetAvgWeightKg: number;
  sellingMethod: BroilerSellingMethod;
  sellingPricePerBird: number;
  sellingPricePerKg: number;
  feedStages: BroilerFeedStage[];
  expenseItems: PlannerExpenseItem[];
}

export interface BroilerStageResult {
  id: string;
  stageName: string;
  durationDays: number;
  effectiveBirds: number;
  exactKgRequired: number;
  wholeBagsToPurchase: number;
  bagWeightKg: number;
  pricePerBag: number;
  stageFeedCost: number;
  midpointFraction: number;
}

export interface BroilerPlanResult {
  startingBirds: number;
  expectedDeadBirds: number;
  survivingBirds: number;
  chickCost: number;
  totalFeedKg: number;
  totalWholeBags: number;
  totalFeedCost: number;
  recurringOpex: number;
  amortizedCapex: number;
  totalProductionCost: number;
  totalLiveweightKg: number;
  projectedRevenue: number;
  netProfit: number;
  profitMarginPercent: number;
  costPerSurvivingBird: number;
  breakEvenPricePerBird: number;
  breakEvenPricePerKg: number;
  projectedFcr: number;
  stageBreakdown: BroilerStageResult[];
  howCalculated: {
    feedFormula: string;
    mortalityFormula: string;
    revenueFormula: string;
    breakEvenFormula: string;
    fcrFormula: string;
  };
}

// Layer Planner Types
export type LayerEntryType = 'day_old_chicks' | 'point_of_lay';
export type LayerFeedConsumptionMode = 'daily_grams' | 'total_kg';

export interface LayerFeedStage {
  id: string;
  stageName: string;
  phase: 'rearing' | 'laying';
  durationDays: number;
  consumptionMode: LayerFeedConsumptionMode;
  dailyGramsPerBird: number;
  totalKgPerBird: number;
  bagWeightKg: number;
  pricePerBag: number;
}

export interface LayerPeriodSchedule {
  id: string;
  periodName: string;
  days: number;
  layingPercent: number;
  mortalityPercent: number;
}

export interface LayerPlanInput {
  startingBirds: number;
  entryType: LayerEntryType;
  purchasePricePerBird: number;
  rearingMortalityPercent: number;
  ageAtFirstLayWeeks: number;
  layingDurationMonths: number;
  eggsPerCrate: number;
  eggPricePerCrate: number;
  spentLayerPricePerBird: number;
  estimatedManureRevenue: number;
  feedStages: LayerFeedStage[];
  layingPeriods: LayerPeriodSchedule[];
  expenseItems: PlannerExpenseItem[];
}

export interface LayerStageResult {
  id: string;
  stageName: string;
  phase: 'rearing' | 'laying';
  durationDays: number;
  effectiveBirds: number;
  exactKgRequired: number;
  wholeBagsToPurchase: number;
  bagWeightKg: number;
  pricePerBag: number;
  stageFeedCost: number;
}

export interface LayerPeriodResult {
  id: string;
  periodName: string;
  days: number;
  startingHens: number;
  endingHens: number;
  averageHens: number;
  layingPercent: number;
  eggsProduced: number;
  cratesProduced: number;
  eggRevenue: number;
  amortizedRearingCost: number;
}

export interface LayerPlanResult {
  startingBirds: number;
  hensEnteringLay: number;
  survivingHensAtCulling: number;
  birdPurchaseCost: number;
  rearingFeedCost: number;
  rearingOtherExpenses: number;
  capitalizedRearingCost: number;
  monthlyAmortizedRearingCost: number;
  layingFeedKg: number;
  layingFeedBags: number;
  layingFeedCost: number;
  layingRecurringOpex: number;
  layingAmortizedCapex: number;
  layingPeriodDirectCost: number;
  cumulativeCost: number;
  totalFeedKg: number;
  totalWholeBags: number;
  totalEggs: number;
  totalCrates: number;
  eggRevenue: number;
  spentLayerRevenue: number;
  manureRevenue: number;
  otherRevenue: number;
  totalRevenue: number;
  netProfit: number;
  profitMarginPercent: number;
  costPerCrate: number;
  breakEvenPricePerCrate: number;
  feedKgPerCrate: number;
  stageBreakdown: LayerStageResult[];
  periodBreakdown: LayerPeriodResult[];
  howCalculated: {
    rearingAmortizationFormula: string;
    eggOutputFormula: string;
    crateBreakEvenFormula: string;
    feedEfficiencyFormula: string;
  };
}

export interface ProductionPlan extends BaseRecord {
  user_id: string;
  farm_id: string | null;
  plan_name: string;
  bird_type: BirdType;
  status: 'draft' | 'converted';
  assumptions: Record<string, unknown>;
  feed_stages: (BroilerFeedStage | LayerFeedStage)[];
  expense_items: PlannerExpenseItem[];
}

export interface ProductionCycle extends BaseRecord {
  user_id: string;
  farm_id: string | null;
  source_plan_id: string | null;
  cycle_name: string;
  bird_type: BirdType;
  status: 'active' | 'completed';
  start_date: string;
  expected_end_date: string | null;
  initial_birds: number;
  bird_unit_cost: number;
  tracking_mode: 'simple_expense' | 'bag_inventory';
  assumptions: Record<string, unknown>;
  feed_stages: (BroilerFeedStage | LayerFeedStage)[];
}

export interface FlockRecord extends BaseRecord {
  user_id: string;
  cycle_id: string;
  record_date: string;
  event_type: 'mortality' | 'culling' | 'weight_sample';
  bird_count: number;
  average_weight_kg: number | null;
  cause_or_notes: string;
}

export interface FeedRecord extends BaseRecord {
  user_id: string;
  cycle_id: string;
  record_date: string;
  transaction_type: 'purchase' | 'consumption' | 'adjustment';
  stage_name: string;
  bags_count: number;
  bag_weight_kg: number;
  cost_per_bag: number;
  total_cost: number;
  notes: string;
}

export interface EggRecord extends BaseRecord {
  user_id: string;
  cycle_id: string;
  record_date: string;
  crates_collected: number;
  loose_eggs: number;
  cracked_eggs: number;
  eggs_per_crate: number;
  notes: string;
}

export type FinancialCategory =
  | 'Chicks/Birds'
  | 'Feed'
  | 'Vaccination'
  | 'Medication'
  | 'Labour'
  | 'Electricity & Water'
  | 'Housing & Repairs'
  | 'Equipment'
  | 'Transportation'
  | 'Litter'
  | 'Disinfectants'
  | 'Egg Sales'
  | 'Live/Dressed Bird Sales'
  | 'Spent Layer Sales'
  | 'Manure Sales'
  | 'Custom';

export interface FinancialRecord extends BaseRecord {
  user_id: string;
  cycle_id: string;
  record_date: string;
  record_type: 'expense' | 'sale';
  category: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  payment_status: 'paid' | 'outstanding';
  is_capex: boolean;
  amortization_cycles: number;
}

export type CalendarActivityType =
  | 'vaccination'
  | 'medication'
  | 'feed_change'
  | 'weighing'
  | 'egg_milestone'
  | 'market_date'
  | 'general';

export interface CalendarActivity extends BaseRecord {
  user_id: string;
  cycle_id: string | null;
  scheduled_date: string;
  activity_type: CalendarActivityType;
  title: string;
  notes: string;
  is_completed: boolean;
  completed_at: string | null;
}

export interface ScenarioComparison extends BaseRecord {
  user_id: string;
  base_plan_id: string | null;
  scenario_name: string;
  bird_type: BirdType;
  modified_assumptions: Record<string, unknown>;
  calculated_summary: Record<string, unknown>;
}

export type SyncTableName =
  | 'profiles'
  | 'farms'
  | 'production_plans'
  | 'production_cycles'
  | 'flock_records'
  | 'feed_records'
  | 'egg_records'
  | 'financial_records'
  | 'calendar_activities'
  | 'scenario_comparisons'
  | 'site_sections'
  | 'site_faqs'
  | 'site_settings'
  | 'planner_templates';

export interface SyncMutation {
  mutation_id: string;
  table: SyncTableName;
  operation: 'upsert' | 'soft_delete';
  record_id: string;
  payload: Record<string, unknown>;
  base_updated_at: string | null;
  timestamp: string;
  retry_count: number;
  last_error?: string;
}

export interface SyncConflict {
  id: string;
  table: SyncTableName;
  record_id: string;
  local_payload: Record<string, unknown>;
  server_payload: Record<string, unknown>;
  detected_at: string;
}
