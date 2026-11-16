import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type {
  BirdType,
  CalendarActivity,
  EggRecord,
  Farm,
  FeatureSuggestion,
  FeedRecord,
  FinancialRecord,
  FlockRecord,
  PlannerTemplate,
  ProductionCycle,
  ProductionPlan,
  ScenarioComparison,
  SiteFaq,
  SiteSection,
  SiteSettings,
  SyncConflict,
  SyncTableName,
} from '@/src/types/domain';
import { cmsDb, getUserDb, requestPersistentStorage } from '@/src/lib/db';
import {
  DEFAULT_PLANNER_TEMPLATES,
  DEFAULT_SITE_FAQS,
  DEFAULT_SITE_SECTIONS,
  DEFAULT_SITE_SETTINGS,
  addDaysIso,
  generateCycleMilestones,
} from '@/src/lib/defaults';
import { isSupabaseConfigured, supabase } from '@/src/lib/supabase';
import {
  enqueueMutation,
  processSyncQueue,
  pullPublicCmsData,
  pullUserData,
  resolveSyncConflict,
} from '@/src/lib/sync';
import { useAuth } from './AuthContext';

export type SyncStatus = 'synced' | 'syncing' | 'offline_pending' | 'offline' | 'attention';

interface DataContextValue {
  // User Data
  farms: Farm[];
  plans: ProductionPlan[];
  cycles: ProductionCycle[];
  flockRecords: FlockRecord[];
  feedRecords: FeedRecord[];
  eggRecords: EggRecord[];
  financialRecords: FinancialRecord[];
  calendarActivities: CalendarActivity[];
  scenarios: ScenarioComparison[];

  // Public / CMS Data
  siteSections: SiteSection[];
  siteFaqs: SiteFaq[];
  siteSettings: SiteSettings;
  plannerTemplates: PlannerTemplate[];
  featureSuggestions: FeatureSuggestion[];

  // UI & Sync state
  loadingData: boolean;
  selectedFarmId: string;
  setSelectedFarmId: (id: string) => void;
  isOnline: boolean;
  syncStatus: SyncStatus;
  pendingCount: number;
  syncErrors: string[];
  conflicts: SyncConflict[];
  lastSyncedAt: string | null;

  // Actions
  reloadLocalData: () => Promise<void>;
  syncNow: () => Promise<void>;
  handleResolveConflict: (conflictId: string, resolution: 'keep_local' | 'accept_server') => Promise<void>;

  // CRUD
  saveFarm: (farm: Partial<Farm> & { farm_name: string }) => Promise<Farm>;
  deleteFarm: (id: string) => Promise<void>;

  savePlan: (
    plan: Partial<ProductionPlan> & {
      plan_name: string;
      bird_type: BirdType;
      assumptions: Record<string, unknown>;
    }
  ) => Promise<ProductionPlan>;
  deletePlan: (id: string) => Promise<void>;

  convertPlanToCycle: (params: {
    plan: ProductionPlan;
    cycleName: string;
    farmId: string | null;
    startDate: string;
    trackingMode: 'simple_expense' | 'bag_inventory';
  }) => Promise<ProductionCycle>;
  saveCycle: (cycle: ProductionCycle) => Promise<ProductionCycle>;
  deleteCycle: (id: string) => Promise<void>;

  addFlockRecord: (
    rec: Omit<FlockRecord, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'deleted_at'>
  ) => Promise<FlockRecord>;
  addFeedRecord: (
    rec: Omit<FeedRecord, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'deleted_at'>
  ) => Promise<FeedRecord>;
  addEggRecord: (
    rec: Omit<EggRecord, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'deleted_at'>
  ) => Promise<EggRecord>;
  addFinancialRecord: (
    rec: Omit<FinancialRecord, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'deleted_at'>
  ) => Promise<FinancialRecord>;
  toggleFinancialPaymentStatus: (id: string) => Promise<void>;

  saveCalendarActivity: (
    act: Partial<CalendarActivity> & {
      title: string;
      scheduled_date: string;
      activity_type: CalendarActivity['activity_type'];
    }
  ) => Promise<CalendarActivity>;
  toggleCalendarActivity: (id: string) => Promise<void>;
  deleteCalendarActivity: (id: string) => Promise<void>;

  saveScenario: (
    sc: Omit<ScenarioComparison, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'deleted_at'> & {
      id?: string;
    }
  ) => Promise<ScenarioComparison>;
  deleteScenario: (id: string) => Promise<void>;

  // Admin CMS CRUD
  saveSiteSection: (section: SiteSection) => Promise<void>;
  deleteSiteSection: (id: string) => Promise<void>;
  reorderSiteSections: (orderedIds: string[]) => Promise<void>;
  saveSiteFaq: (faq: SiteFaq) => Promise<void>;
  deleteSiteFaq: (id: string) => Promise<void>;
  saveSiteSettings: (settings: SiteSettings) => Promise<void>;
  savePlannerTemplate: (tpl: PlannerTemplate) => Promise<void>;
  deletePlannerTemplate: (id: string) => Promise<void>;
  submitFeatureSuggestion: (input: {
    name: string;
    contact: string;
    category: string;
    suggestion: string;
  }) => Promise<FeatureSuggestion>;
  updateFeatureSuggestionStatus: (
    id: string,
    status: FeatureSuggestion['status']
  ) => Promise<void>;
  invalidateCmsCache: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeUserId, user } = useAuth();

  const [farms, setFarms] = useState<Farm[]>([]);
  const [plans, setPlans] = useState<ProductionPlan[]>([]);
  const [cycles, setCycles] = useState<ProductionCycle[]>([]);
  const [flockRecords, setFlockRecords] = useState<FlockRecord[]>([]);
  const [feedRecords, setFeedRecords] = useState<FeedRecord[]>([]);
  const [eggRecords, setEggRecords] = useState<EggRecord[]>([]);
  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>([]);
  const [calendarActivities, setCalendarActivities] = useState<CalendarActivity[]>([]);
  const [scenarios, setScenarios] = useState<ScenarioComparison[]>([]);

  const [siteSections, setSiteSections] = useState<SiteSection[]>(DEFAULT_SITE_SECTIONS);
  const [siteFaqs, setSiteFaqs] = useState<SiteFaq[]>(DEFAULT_SITE_FAQS);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [plannerTemplates, setPlannerTemplates] = useState<PlannerTemplate[]>(DEFAULT_PLANNER_TEMPLATES);
  const [featureSuggestions, setFeatureSuggestions] = useState<FeatureSuggestion[]>([]);

  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [selectedFarmId, setSelectedFarmId] = useState<string>('all');
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [syncErrors, setSyncErrors] = useState<string[]>([]);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const reloadLocalData = useCallback(async () => {
    const db = getUserDb(activeUserId);
    const [
      farmsArr,
      plansArr,
      cyclesArr,
      flockArr,
      feedArr,
      eggArr,
      finArr,
      calArr,
      scenArr,
      outboxCount,
      conflictArr,
    ] = await Promise.all([
      db.farms.filter((r) => !r.deleted_at).toArray(),
      db.production_plans.filter((r) => !r.deleted_at).toArray(),
      db.production_cycles.filter((r) => !r.deleted_at).toArray(),
      db.flock_records.filter((r) => !r.deleted_at).toArray(),
      db.feed_records.filter((r) => !r.deleted_at).toArray(),
      db.egg_records.filter((r) => !r.deleted_at).toArray(),
      db.financial_records.filter((r) => !r.deleted_at).toArray(),
      db.calendar_activities.filter((r) => !r.deleted_at).toArray(),
      db.scenario_comparisons.filter((r) => !r.deleted_at).toArray(),
      db.sync_outbox.count(),
      db.sync_conflicts.toArray(),
    ]);

    setFarms(farmsArr.sort((a, b) => b.updated_at.localeCompare(a.updated_at)));
    setPlans(plansArr.sort((a, b) => b.updated_at.localeCompare(a.updated_at)));
    setCycles(cyclesArr.sort((a, b) => b.start_date.localeCompare(a.start_date)));
    setFlockRecords(flockArr.sort((a, b) => b.record_date.localeCompare(a.record_date)));
    setFeedRecords(feedArr.sort((a, b) => b.record_date.localeCompare(a.record_date)));
    setEggRecords(eggArr.sort((a, b) => b.record_date.localeCompare(a.record_date)));
    setFinancialRecords(finArr.sort((a, b) => b.record_date.localeCompare(a.record_date)));
    setCalendarActivities(calArr.sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date)));
    setScenarios(scenArr.sort((a, b) => b.updated_at.localeCompare(a.updated_at)));
    setPendingCount(outboxCount);
    setConflicts(conflictArr);
  }, [activeUserId]);

  const loadCms = useCallback(async () => {
    const cms = await pullPublicCmsData();
    setSiteSections(cms.sections);
    setSiteFaqs(cms.faqs);
    setSiteSettings(cms.settings);
    setPlannerTemplates(cms.templates);

    if (isSupabaseConfigured && supabase && navigator.onLine && user) {
      const { data } = await supabase
        .from('feature_suggestions')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (data && data.length > 0) {
        await cmsDb.feature_suggestions.bulkPut(data as FeatureSuggestion[]);
      }
    }
    const localSuggestions = (await cmsDb.feature_suggestions.toArray())
      .filter((s) => !s.deleted_at)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    setFeatureSuggestions(localSuggestions);
  }, [user]);

  const syncNow = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await loadCms();
      if (activeUserId !== 'guest' && isSupabaseConfigured && navigator.onLine) {
        const res = await processSyncQueue(activeUserId);
        setPendingCount(res.pendingCount);
        setSyncErrors(res.errors);
        await pullUserData(activeUserId);
        if (res.errors.length === 0 && res.conflictCount === 0) {
          setLastSyncedAt(new Date().toISOString());
        }
      }
      await reloadLocalData();
    } finally {
      setIsSyncing(false);
    }
  }, [activeUserId, isSyncing, loadCms, reloadLocalData]);

  // Initial load + startup sync
  useEffect(() => {
    let mounted = true;
    async function bootstrap() {
      setLoadingData(true);
      await Promise.all([reloadLocalData(), loadCms()]);
      if (!mounted) return;
      setLoadingData(false);
      if (activeUserId !== 'guest' && isSupabaseConfigured && navigator.onLine) {
        void syncNow();
      }
    }
    bootstrap();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUserId]);

  // Online / Offline & Visibility change automatic sync triggers
  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      void syncNow();
    };
    const onOffline = () => setIsOnline(false);
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        void syncNow();
      }
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [syncNow]);

  const syncStatus: SyncStatus = (() => {
    if (isSyncing) return 'syncing';
    if (conflicts.length > 0 || syncErrors.length > 0) return 'attention';
    if (!isOnline) return pendingCount > 0 ? 'offline_pending' : 'offline';
    if (pendingCount > 0) return 'offline_pending';
    return 'synced';
  })();

  const writeAndQueue = async <T extends { id: string; updated_at: string; deleted_at: string | null }>(
    table: SyncTableName,
    record: T,
    baseUpdatedAt: string | null,
    operation: 'upsert' | 'soft_delete' = 'upsert'
  ) => {
    const db = getUserDb(activeUserId);
    await (db as unknown as Record<string, any>)[table].put(record);
    void requestPersistentStorage();

    if (activeUserId !== 'guest') {
      await enqueueMutation({
        userId: activeUserId,
        table,
        operation,
        recordId: record.id,
        payload: record as unknown as Record<string, unknown>,
        baseUpdatedAt,
      });
    }
    await reloadLocalData();
    if (activeUserId !== 'guest' && navigator.onLine && isSupabaseConfigured) {
      void syncNow();
    }
  };

  const handleResolveConflict = async (
    conflictId: string,
    resolution: 'keep_local' | 'accept_server'
  ) => {
    await resolveSyncConflict({ userId: activeUserId, conflictId, resolution });
    await reloadLocalData();
  };

  // Farms
  const saveFarm = async (input: Partial<Farm> & { farm_name: string }): Promise<Farm> => {
    const now = new Date().toISOString();
    const db = getUserDb(activeUserId);
    const existing = input.id ? await db.farms.get(input.id) : undefined;
    const record: Farm = {
      id: input.id ?? crypto.randomUUID(),
      user_id: activeUserId,
      farm_name: input.farm_name,
      location: input.location ?? existing?.location ?? '',
      farm_type: input.farm_type ?? existing?.farm_type ?? 'Mixed Poultry',
      notes: input.notes ?? existing?.notes ?? '',
      created_at: existing?.created_at ?? now,
      updated_at: now,
      deleted_at: null,
    };
    await writeAndQueue('farms', record, existing?.updated_at ?? null);
    return record;
  };

  const deleteFarm = async (id: string) => {
    const db = getUserDb(activeUserId);
    const existing = await db.farms.get(id);
    if (!existing) return;
    const now = new Date().toISOString();
    await writeAndQueue(
      'farms',
      { ...existing, deleted_at: now, updated_at: now },
      existing.updated_at,
      'soft_delete'
    );
  };

  // Plans
  const savePlan = async (
    input: Partial<ProductionPlan> & {
      plan_name: string;
      bird_type: BirdType;
      assumptions: Record<string, unknown>;
    }
  ): Promise<ProductionPlan> => {
    const now = new Date().toISOString();
    const db = getUserDb(activeUserId);
    const existing = input.id ? await db.production_plans.get(input.id) : undefined;
    const record: ProductionPlan = {
      id: input.id ?? crypto.randomUUID(),
      user_id: activeUserId,
      farm_id: input.farm_id !== undefined ? input.farm_id : (existing?.farm_id ?? null),
      plan_name: input.plan_name,
      bird_type: input.bird_type,
      status: input.status ?? existing?.status ?? 'draft',
      assumptions: input.assumptions,
      feed_stages: input.feed_stages ?? existing?.feed_stages ?? [],
      expense_items: input.expense_items ?? existing?.expense_items ?? [],
      created_at: existing?.created_at ?? now,
      updated_at: now,
      deleted_at: null,
    };
    await writeAndQueue('production_plans', record, existing?.updated_at ?? null);
    return record;
  };

  const deletePlan = async (id: string) => {
    const db = getUserDb(activeUserId);
    const existing = await db.production_plans.get(id);
    if (!existing) return;
    const now = new Date().toISOString();
    await writeAndQueue(
      'production_plans',
      { ...existing, deleted_at: now, updated_at: now },
      existing.updated_at,
      'soft_delete'
    );
  };

  // Convert Plan -> Active Cycle + Milestones + Initial Chick Cost Record
  const convertPlanToCycle = async (params: {
    plan: ProductionPlan;
    cycleName: string;
    farmId: string | null;
    startDate: string;
    trackingMode: 'simple_expense' | 'bag_inventory';
  }): Promise<ProductionCycle> => {
    const { plan, cycleName, farmId, startDate, trackingMode } = params;
    const now = new Date().toISOString();
    const assumptions = plan.assumptions as Record<string, any>;
    const initialBirds = Number(assumptions.startingBirds ?? 0);
    const birdUnitCost =
      plan.bird_type === 'broiler'
        ? Number(assumptions.pricePerChick ?? 0)
        : Number(assumptions.purchasePricePerBird ?? 0);

    const durationDays =
      plan.bird_type === 'broiler'
        ? Number(assumptions.durationDays ?? 42)
        : Math.max(
            180,
            (Number(assumptions.ageAtFirstLayWeeks ?? 18) * 7) +
              (Number(assumptions.layingDurationMonths ?? 12) * 30)
          );

    const cycle: ProductionCycle = {
      id: crypto.randomUUID(),
      user_id: activeUserId,
      farm_id: farmId ?? plan.farm_id,
      source_plan_id: plan.id,
      cycle_name: cycleName,
      bird_type: plan.bird_type,
      status: 'active',
      start_date: startDate,
      expected_end_date: addDaysIso(startDate, durationDays),
      initial_birds: initialBirds,
      bird_unit_cost: birdUnitCost,
      tracking_mode: trackingMode,
      assumptions: plan.assumptions,
      feed_stages: plan.feed_stages,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };

    await writeAndQueue('production_cycles', cycle, null);

    // Mark source plan converted
    await writeAndQueue(
      'production_plans',
      { ...plan, status: 'converted', updated_at: now },
      plan.updated_at
    );

    // Log initial bird purchase expense
    if (initialBirds > 0 && birdUnitCost > 0) {
      const chickExp: FinancialRecord = {
        id: crypto.randomUUID(),
        user_id: activeUserId,
        cycle_id: cycle.id,
        record_date: startDate,
        record_type: 'expense',
        category: 'Chicks/Birds',
        description: `Initial ${initialBirds} ${plan.bird_type === 'broiler' ? 'day-old chicks' : 'layer birds'}`,
        quantity: initialBirds,
        unit_price: birdUnitCost,
        total_amount: initialBirds * birdUnitCost,
        payment_status: 'paid',
        is_capex: false,
        amortization_cycles: 1,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      };
      await writeAndQueue('financial_records', chickExp, null);
    }

    // Auto-generate suggested production milestones
    const feedStages = (plan.feed_stages as Array<{ stageName?: string; durationDays?: number }>) || [];
    const milestones = generateCycleMilestones({
      userId: activeUserId,
      cycleId: cycle.id,
      cycleName,
      birdType: plan.bird_type,
      startDate,
      durationDays,
      feedStageNames: feedStages.map((s) => s.stageName || 'Stage'),
      feedStageDurations: feedStages.map((s) => Number(s.durationDays || 14)),
    });

    for (const m of milestones) {
      await writeAndQueue('calendar_activities', m, null);
    }

    return cycle;
  };

  const saveCycle = async (cycle: ProductionCycle): Promise<ProductionCycle> => {
    const db = getUserDb(activeUserId);
    const existing = await db.production_cycles.get(cycle.id);
    const updated: ProductionCycle = {
      ...cycle,
      updated_at: new Date().toISOString(),
    };
    await writeAndQueue('production_cycles', updated, existing?.updated_at ?? null);
    return updated;
  };

  const deleteCycle = async (id: string) => {
    const db = getUserDb(activeUserId);
    const existing = await db.production_cycles.get(id);
    if (!existing) return;
    const now = new Date().toISOString();
    await writeAndQueue(
      'production_cycles',
      { ...existing, deleted_at: now, updated_at: now },
      existing.updated_at,
      'soft_delete'
    );
  };

  // Active Farm Records
  const addFlockRecord = async (
    rec: Omit<FlockRecord, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'deleted_at'>
  ) => {
    const now = new Date().toISOString();
    const record: FlockRecord = {
      ...rec,
      id: crypto.randomUUID(),
      user_id: activeUserId,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };
    await writeAndQueue('flock_records', record, null);
    return record;
  };

  const addFeedRecord = async (
    rec: Omit<FeedRecord, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'deleted_at'>
  ) => {
    const now = new Date().toISOString();
    const record: FeedRecord = {
      ...rec,
      id: crypto.randomUUID(),
      user_id: activeUserId,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };
    await writeAndQueue('feed_records', record, null);

    // If it's a feed purchase with cost, also reflect in financial_records
    if (rec.transaction_type === 'purchase' && rec.total_cost > 0) {
      const fin: FinancialRecord = {
        id: crypto.randomUUID(),
        user_id: activeUserId,
        cycle_id: rec.cycle_id,
        record_date: rec.record_date,
        record_type: 'expense',
        category: 'Feed',
        description: `${rec.stage_name || 'Poultry'} feed (${rec.bags_count} bags × ${rec.bag_weight_kg} kg)`,
        quantity: rec.bags_count,
        unit_price: rec.cost_per_bag,
        total_amount: rec.total_cost,
        payment_status: 'paid',
        is_capex: false,
        amortization_cycles: 1,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      };
      await writeAndQueue('financial_records', fin, null);
    }

    return record;
  };

  const addEggRecord = async (
    rec: Omit<EggRecord, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'deleted_at'>
  ) => {
    const now = new Date().toISOString();
    const record: EggRecord = {
      ...rec,
      id: crypto.randomUUID(),
      user_id: activeUserId,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };
    await writeAndQueue('egg_records', record, null);
    return record;
  };

  const addFinancialRecord = async (
    rec: Omit<FinancialRecord, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'deleted_at'>
  ) => {
    const now = new Date().toISOString();
    const record: FinancialRecord = {
      ...rec,
      id: crypto.randomUUID(),
      user_id: activeUserId,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };
    await writeAndQueue('financial_records', record, null);
    return record;
  };

  const toggleFinancialPaymentStatus = async (id: string) => {
    const db = getUserDb(activeUserId);
    const existing = await db.financial_records.get(id);
    if (!existing) return;
    const nextStatus = existing.payment_status === 'paid' ? 'outstanding' : 'paid';
    await writeAndQueue(
      'financial_records',
      { ...existing, payment_status: nextStatus, updated_at: new Date().toISOString() },
      existing.updated_at
    );
  };

  // Calendar
  const saveCalendarActivity = async (
    input: Partial<CalendarActivity> & {
      title: string;
      scheduled_date: string;
      activity_type: CalendarActivity['activity_type'];
    }
  ) => {
    const now = new Date().toISOString();
    const db = getUserDb(activeUserId);
    const existing = input.id ? await db.calendar_activities.get(input.id) : undefined;
    const record: CalendarActivity = {
      id: input.id ?? crypto.randomUUID(),
      user_id: activeUserId,
      cycle_id: input.cycle_id !== undefined ? input.cycle_id : (existing?.cycle_id ?? null),
      scheduled_date: input.scheduled_date,
      activity_type: input.activity_type,
      title: input.title,
      notes: input.notes ?? existing?.notes ?? '',
      is_completed: input.is_completed ?? existing?.is_completed ?? false,
      completed_at: input.completed_at ?? existing?.completed_at ?? null,
      created_at: existing?.created_at ?? now,
      updated_at: now,
      deleted_at: null,
    };
    await writeAndQueue('calendar_activities', record, existing?.updated_at ?? null);
    return record;
  };

  const toggleCalendarActivity = async (id: string) => {
    const db = getUserDb(activeUserId);
    const existing = await db.calendar_activities.get(id);
    if (!existing) return;
    const nextCompleted = !existing.is_completed;
    const now = new Date().toISOString();
    await writeAndQueue(
      'calendar_activities',
      {
        ...existing,
        is_completed: nextCompleted,
        completed_at: nextCompleted ? now : null,
        updated_at: now,
      },
      existing.updated_at
    );
  };

  const deleteCalendarActivity = async (id: string) => {
    const db = getUserDb(activeUserId);
    const existing = await db.calendar_activities.get(id);
    if (!existing) return;
    const now = new Date().toISOString();
    await writeAndQueue(
      'calendar_activities',
      { ...existing, deleted_at: now, updated_at: now },
      existing.updated_at,
      'soft_delete'
    );
  };

  // Scenarios
  const saveScenario = async (
    sc: Omit<ScenarioComparison, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'deleted_at'> & {
      id?: string;
    }
  ) => {
    const now = new Date().toISOString();
    const db = getUserDb(activeUserId);
    const existing = sc.id ? await db.scenario_comparisons.get(sc.id) : undefined;
    const record: ScenarioComparison = {
      id: sc.id ?? crypto.randomUUID(),
      user_id: activeUserId,
      base_plan_id: sc.base_plan_id,
      scenario_name: sc.scenario_name,
      bird_type: sc.bird_type,
      modified_assumptions: sc.modified_assumptions,
      calculated_summary: sc.calculated_summary,
      created_at: existing?.created_at ?? now,
      updated_at: now,
      deleted_at: null,
    };
    await writeAndQueue('scenario_comparisons', record, existing?.updated_at ?? null);
    return record;
  };

  const deleteScenario = async (id: string) => {
    const db = getUserDb(activeUserId);
    const existing = await db.scenario_comparisons.get(id);
    if (!existing) return;
    const now = new Date().toISOString();
    await writeAndQueue(
      'scenario_comparisons',
      { ...existing, deleted_at: now, updated_at: now },
      existing.updated_at,
      'soft_delete'
    );
  };

  // Admin CMS mutations (write to local cmsDb + Supabase if admin & configured)
  const persistCmsRecord = async (table: SyncTableName, record: Record<string, unknown>) => {
    await (cmsDb as unknown as Record<string, any>)[table].put(record);
    if (user && isSupabaseConfigured && supabase && navigator.onLine) {
      await supabase.from(table).upsert(record, { onConflict: 'id' });
    }
    await loadCms();
  };

  const saveSiteSection = async (section: SiteSection) => {
    const updated = { ...section, updated_at: new Date().toISOString() };
    await persistCmsRecord('site_sections', updated);
  };

  const deleteSiteSection = async (id: string) => {
    const existing = await cmsDb.site_sections.get(id);
    if (!existing) return;
    const now = new Date().toISOString();
    await persistCmsRecord('site_sections', { ...existing, deleted_at: now, updated_at: now });
  };

  const reorderSiteSections = async (orderedIds: string[]) => {
    for (let idx = 0; idx < orderedIds.length; idx++) {
      const existing = await cmsDb.site_sections.get(orderedIds[idx]);
      if (existing) {
        await persistCmsRecord('site_sections', {
          ...existing,
          display_order: idx + 1,
          updated_at: new Date().toISOString(),
        });
      }
    }
  };

  const saveSiteFaq = async (faq: SiteFaq) => {
    const updated = { ...faq, updated_at: new Date().toISOString() };
    await persistCmsRecord('site_faqs', updated);
  };

  const deleteSiteFaq = async (id: string) => {
    const existing = await cmsDb.site_faqs.get(id);
    if (!existing) return;
    const now = new Date().toISOString();
    await persistCmsRecord('site_faqs', { ...existing, deleted_at: now, updated_at: now });
  };

  const saveSiteSettings = async (settings: SiteSettings) => {
    const updated = { ...settings, updated_at: new Date().toISOString() };
    await persistCmsRecord('site_settings', updated);
  };

  const savePlannerTemplate = async (tpl: PlannerTemplate) => {
    const updated = { ...tpl, updated_at: new Date().toISOString() };
    await persistCmsRecord('planner_templates', updated);
  };

  const deletePlannerTemplate = async (id: string) => {
    const existing = await cmsDb.planner_templates.get(id);
    if (!existing) return;
    const now = new Date().toISOString();
    await persistCmsRecord('planner_templates', { ...existing, deleted_at: now, updated_at: now });
  };

  const submitFeatureSuggestion = async (input: {
    name: string;
    contact: string;
    category: string;
    suggestion: string;
  }): Promise<FeatureSuggestion> => {
    const now = new Date().toISOString();
    const record: FeatureSuggestion = {
      id: crypto.randomUUID(),
      name: input.name.trim(),
      contact: input.contact.trim(),
      category: input.category,
      suggestion: input.suggestion.trim(),
      status: 'new',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };
    await cmsDb.feature_suggestions.put(record);
    if (isSupabaseConfigured && supabase && navigator.onLine) {
      await supabase.from('feature_suggestions').insert(record);
    }
    const updated = (await cmsDb.feature_suggestions.toArray())
      .filter((s) => !s.deleted_at)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    setFeatureSuggestions(updated);
    return record;
  };

  const updateFeatureSuggestionStatus = async (
    id: string,
    status: FeatureSuggestion['status']
  ) => {
    const existing = await cmsDb.feature_suggestions.get(id);
    if (!existing) return;
    const updatedRecord: FeatureSuggestion = {
      ...existing,
      status,
      updated_at: new Date().toISOString(),
    };
    await cmsDb.feature_suggestions.put(updatedRecord);
    if (user && isSupabaseConfigured && supabase && navigator.onLine) {
      await supabase.from('feature_suggestions').upsert(updatedRecord, { onConflict: 'id' });
    }
    await loadCms();
  };

  const invalidateCmsCache = async () => {
    await loadCms();
  };

  return (
    <DataContext.Provider
      value={{
        farms,
        plans,
        cycles,
        flockRecords,
        feedRecords,
        eggRecords,
        financialRecords,
        calendarActivities,
        scenarios,
        siteSections,
        siteFaqs,
        siteSettings,
        plannerTemplates,
        featureSuggestions,
        loadingData,
        selectedFarmId,
        setSelectedFarmId,
        isOnline,
        syncStatus,
        pendingCount,
        syncErrors,
        conflicts,
        lastSyncedAt,
        reloadLocalData,
        syncNow,
        handleResolveConflict,
        saveFarm,
        deleteFarm,
        savePlan,
        deletePlan,
        convertPlanToCycle,
        saveCycle,
        deleteCycle,
        addFlockRecord,
        addFeedRecord,
        addEggRecord,
        addFinancialRecord,
        toggleFinancialPaymentStatus,
        saveCalendarActivity,
        toggleCalendarActivity,
        deleteCalendarActivity,
        saveScenario,
        deleteScenario,
        saveSiteSection,
        deleteSiteSection,
        reorderSiteSections,
        saveSiteFaq,
        deleteSiteFaq,
        saveSiteSettings,
        savePlannerTemplate,
        deletePlannerTemplate,
        submitFeatureSuggestion,
        updateFeatureSuggestionStatus,
        invalidateCmsCache,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
