import Dexie, { type Table } from 'dexie';
import type {
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
  Profile,
  ScenarioComparison,
  SiteFaq,
  SiteSection,
  SiteSettings,
  SyncConflict,
  SyncMutation,
} from '@/src/types/domain';

export class PoultryUserDatabase extends Dexie {
  profiles!: Table<Profile, string>;
  farms!: Table<Farm, string>;
  production_plans!: Table<ProductionPlan, string>;
  production_cycles!: Table<ProductionCycle, string>;
  flock_records!: Table<FlockRecord, string>;
  feed_records!: Table<FeedRecord, string>;
  egg_records!: Table<EggRecord, string>;
  financial_records!: Table<FinancialRecord, string>;
  calendar_activities!: Table<CalendarActivity, string>;
  scenario_comparisons!: Table<ScenarioComparison, string>;
  sync_outbox!: Table<SyncMutation, string>;
  sync_conflicts!: Table<SyncConflict, string>;

  constructor(userNamespace: string) {
    super(`ppp_db_${userNamespace}`);
    this.version(1).stores({
      profiles: 'id, updated_at',
      farms: 'id, user_id, updated_at, deleted_at',
      production_plans: 'id, user_id, farm_id, bird_type, status, updated_at, deleted_at',
      production_cycles: 'id, user_id, farm_id, status, bird_type, updated_at, deleted_at',
      flock_records: 'id, user_id, cycle_id, record_date, updated_at, deleted_at',
      feed_records: 'id, user_id, cycle_id, record_date, updated_at, deleted_at',
      egg_records: 'id, user_id, cycle_id, record_date, updated_at, deleted_at',
      financial_records: 'id, user_id, cycle_id, record_date, record_type, updated_at, deleted_at',
      calendar_activities: 'id, user_id, cycle_id, scheduled_date, is_completed, updated_at, deleted_at',
      scenario_comparisons: 'id, user_id, base_plan_id, updated_at, deleted_at',
      sync_outbox: 'mutation_id, table, record_id, timestamp',
      sync_conflicts: 'id, table, record_id, detected_at',
    });
  }
}

export class PoultryCmsDatabase extends Dexie {
  site_sections!: Table<SiteSection, string>;
  site_faqs!: Table<SiteFaq, string>;
  site_settings!: Table<SiteSettings, string>;
  planner_templates!: Table<PlannerTemplate, string>;
  feature_suggestions!: Table<FeatureSuggestion, string>;

  constructor() {
    super('ppp_cms_cache');
    this.version(1).stores({
      site_sections: 'id, section_key, display_order, is_visible, deleted_at',
      site_faqs: 'id, display_order, is_visible, deleted_at',
      site_settings: 'id, deleted_at',
      planner_templates: 'id, bird_type, is_active, deleted_at',
    });
    this.version(2).stores({
      site_sections: 'id, section_key, display_order, is_visible, deleted_at',
      site_faqs: 'id, display_order, is_visible, deleted_at',
      site_settings: 'id, deleted_at',
      planner_templates: 'id, bird_type, is_active, deleted_at',
      feature_suggestions: 'id, category, status, created_at, deleted_at',
    });
  }
}

export const cmsDb = new PoultryCmsDatabase();

const dbInstances = new Map<string, PoultryUserDatabase>();

export function getUserDb(userId: string | null | undefined): PoultryUserDatabase {
  const ns = userId && userId.trim().length > 0 ? userId : 'guest';
  let instance = dbInstances.get(ns);
  if (!instance) {
    instance = new PoultryUserDatabase(ns);
    dbInstances.set(ns, instance);
  }
  return instance;
}

export async function clearUserDb(userId: string): Promise<void> {
  const db = getUserDb(userId);
  await db.transaction(
    'rw',
    [
      db.profiles,
      db.farms,
      db.production_plans,
      db.production_cycles,
      db.flock_records,
      db.feed_records,
      db.egg_records,
      db.financial_records,
      db.calendar_activities,
      db.scenario_comparisons,
      db.sync_outbox,
      db.sync_conflicts,
    ],
    async () => {
      await Promise.all([
        db.profiles.clear(),
        db.farms.clear(),
        db.production_plans.clear(),
        db.production_cycles.clear(),
        db.flock_records.clear(),
        db.feed_records.clear(),
        db.egg_records.clear(),
        db.financial_records.clear(),
        db.calendar_activities.clear(),
        db.scenario_comparisons.clear(),
        db.sync_outbox.clear(),
        db.sync_conflicts.clear(),
      ]);
    }
  );
}

export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      return await navigator.storage.persist();
    }
  } catch {
    // Ignore unsupported environments
  }
  return false;
}
