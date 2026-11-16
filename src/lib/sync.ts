import type { Table } from 'dexie';
import type {
  SiteFaq,
  SiteSection,
  SiteSettings,
  PlannerTemplate,
  SyncConflict,
  SyncMutation,
  SyncTableName,
} from '@/src/types/domain';
import { cmsDb, getUserDb } from './db';
import {
  DEFAULT_PLANNER_TEMPLATES,
  DEFAULT_SITE_FAQS,
  DEFAULT_SITE_SECTIONS,
  DEFAULT_SITE_SETTINGS,
} from './defaults';
import { isSupabaseConfigured, supabase } from './supabase';

const USER_TABLES: SyncTableName[] = [
  'profiles',
  'farms',
  'production_plans',
  'production_cycles',
  'flock_records',
  'feed_records',
  'egg_records',
  'financial_records',
  'calendar_activities',
  'scenario_comparisons',
];

function getTableRef(userId: string, table: SyncTableName): Table<any, string> {
  if (
    table === 'site_sections' ||
    table === 'site_faqs' ||
    table === 'site_settings' ||
    table === 'planner_templates'
  ) {
    return (cmsDb as unknown as Record<string, Table<any, string>>)[table];
  }
  const db = getUserDb(userId);
  return (db as unknown as Record<string, Table<any, string>>)[table];
}

export async function enqueueMutation(params: {
  userId: string;
  table: SyncTableName;
  operation: 'upsert' | 'soft_delete';
  recordId: string;
  payload: Record<string, unknown>;
  baseUpdatedAt: string | null;
}): Promise<void> {
  const { userId, table, operation, recordId, payload, baseUpdatedAt } = params;
  if (!userId || userId === 'guest') return;

  const db = getUserDb(userId);
  const mutation: SyncMutation = {
    mutation_id: crypto.randomUUID(),
    table,
    operation,
    record_id: recordId,
    payload: {
      ...payload,
      client_mutation_id: crypto.randomUUID(),
    },
    base_updated_at: baseUpdatedAt,
    timestamp: new Date().toISOString(),
    retry_count: 0,
  };
  await db.sync_outbox.put(mutation);
}

export interface SyncProcessResult {
  syncedCount: number;
  pendingCount: number;
  conflictCount: number;
  errors: string[];
}

export async function processSyncQueue(userId: string): Promise<SyncProcessResult> {
  const db = getUserDb(userId);
  const outbox = await db.sync_outbox.orderBy('timestamp').toArray();

  if (!isSupabaseConfigured || !supabase || !userId || userId === 'guest') {
    const conflicts = await db.sync_conflicts.count();
    return {
      syncedCount: 0,
      pendingCount: outbox.length,
      conflictCount: conflicts,
      errors: [],
    };
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const conflicts = await db.sync_conflicts.count();
    return {
      syncedCount: 0,
      pendingCount: outbox.length,
      conflictCount: conflicts,
      errors: [],
    };
  }

  let syncedCount = 0;
  const errors: string[] = [];

  for (const mutation of outbox) {
    try {
      // Check server timestamp for non-destructive conflict detection
      if (mutation.base_updated_at) {
        const { data: existing, error: fetchErr } = await supabase
          .from(mutation.table)
          .select('*')
          .eq('id', mutation.record_id)
          .maybeSingle();

        if (fetchErr) {
          throw new Error(fetchErr.message);
        }

        if (
          existing &&
          existing.updated_at &&
          new Date(existing.updated_at).getTime() > new Date(mutation.base_updated_at).getTime() &&
          existing.client_mutation_id !== mutation.payload.client_mutation_id
        ) {
          const conflict: SyncConflict = {
            id: `${mutation.table}:${mutation.record_id}`,
            table: mutation.table,
            record_id: mutation.record_id,
            local_payload: mutation.payload,
            server_payload: existing,
            detected_at: new Date().toISOString(),
          };
          await db.sync_conflicts.put(conflict);
          await db.sync_outbox.delete(mutation.mutation_id);
          continue;
        }
      }

      const payloadToSend = { ...mutation.payload };
      if (mutation.operation === 'soft_delete' && !payloadToSend.deleted_at) {
        payloadToSend.deleted_at = new Date().toISOString();
      }

      const { data: upserted, error: upsertErr } = await supabase
        .from(mutation.table)
        .upsert(payloadToSend, { onConflict: 'id' })
        .select()
        .single();

      if (upsertErr) {
        throw new Error(upsertErr.message);
      }

      if (upserted) {
        const tableRef = getTableRef(userId, mutation.table);
        await tableRef.put(upserted);
      }

      await db.sync_outbox.delete(mutation.mutation_id);
      syncedCount += 1;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sync failure';
      errors.push(`${mutation.table}: ${msg}`);
      await db.sync_outbox.update(mutation.mutation_id, {
        retry_count: mutation.retry_count + 1,
        last_error: msg,
      });
    }
  }

  const remaining = await db.sync_outbox.count();
  const conflictCount = await db.sync_conflicts.count();

  return {
    syncedCount,
    pendingCount: remaining,
    conflictCount,
    errors,
  };
}

export async function resolveSyncConflict(params: {
  userId: string;
  conflictId: string;
  resolution: 'keep_local' | 'accept_server';
}): Promise<void> {
  const { userId, conflictId, resolution } = params;
  const db = getUserDb(userId);
  const conflict = await db.sync_conflicts.get(conflictId);
  if (!conflict) return;

  const tableRef = getTableRef(userId, conflict.table);

  if (resolution === 'accept_server') {
    await tableRef.put(conflict.server_payload);
    await db.sync_conflicts.delete(conflictId);
    return;
  }

  // Keep local: bump updated_at and overwrite server if online
  const localRecord: Record<string, unknown> = {
    ...conflict.local_payload,
    updated_at: new Date().toISOString(),
    client_mutation_id: crypto.randomUUID(),
  };
  await tableRef.put(localRecord);
  await db.sync_conflicts.delete(conflictId);
  await enqueueMutation({
    userId,
    table: conflict.table,
    operation: localRecord.deleted_at ? 'soft_delete' : 'upsert',
    recordId: conflict.record_id,
    payload: localRecord,
    baseUpdatedAt: null,
  });
  await processSyncQueue(userId);
}

export async function pullUserData(userId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase || !userId || userId === 'guest') return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;

  const db = getUserDb(userId);
  const outbox = await db.sync_outbox.toArray();
  const pendingIds = new Set(outbox.map((m) => `${m.table}:${m.record_id}`));

  for (const table of USER_TABLES) {
    const query =
      table === 'profiles'
        ? supabase.from(table).select('*').eq('id', userId)
        : supabase.from(table).select('*').eq('user_id', userId);

    const { data, error } = await query;
    if (error || !data) continue;

    const tableRef = getTableRef(userId, table);
    for (const row of data) {
      if (!pendingIds.has(`${table}:${row.id}`)) {
        await tableRef.put(row);
      }
    }
  }
}

export async function ensureCmsSeeded(): Promise<void> {
  const existingSections = await cmsDb.site_sections.count();
  if (existingSections === 0) {
    await cmsDb.site_sections.bulkPut(DEFAULT_SITE_SECTIONS);
  } else {
    const hasTestimonials = await cmsDb.site_sections
      .where('section_key')
      .equals('testimonials')
      .count();
    if (hasTestimonials === 0) {
      const testimonialDef = DEFAULT_SITE_SECTIONS.find((s) => s.section_key === 'testimonials');
      if (testimonialDef) {
        await cmsDb.site_sections.put(testimonialDef);
      }
    }
  }
  const existingFaqs = await cmsDb.site_faqs.count();
  if (existingFaqs === 0) {
    await cmsDb.site_faqs.bulkPut(DEFAULT_SITE_FAQS);
  }
  const existingSettings = await cmsDb.site_settings.toArray();
  if (existingSettings.length === 0) {
    await cmsDb.site_settings.put(DEFAULT_SITE_SETTINGS);
  } else {
    const current = existingSettings[0];
    if (
      current.contact_email === 'support@poultryprofitplanner.com' ||
      current.contact_phone === '+234 800 000 0000'
    ) {
      await cmsDb.site_settings.put({
        ...current,
        contact_email: DEFAULT_SITE_SETTINGS.contact_email,
        contact_phone: DEFAULT_SITE_SETTINGS.contact_phone,
      });
    }
  }
  const existingTemplates = await cmsDb.planner_templates.count();
  if (existingTemplates === 0) {
    await cmsDb.planner_templates.bulkPut(DEFAULT_PLANNER_TEMPLATES);
  }
}

export async function pullPublicCmsData(): Promise<{
  sections: SiteSection[];
  faqs: SiteFaq[];
  settings: SiteSettings;
  templates: PlannerTemplate[];
}> {
  await ensureCmsSeeded();

  if (isSupabaseConfigured && supabase && (typeof navigator === 'undefined' || navigator.onLine)) {
    const [secRes, faqRes, setRes, tplRes] = await Promise.all([
      supabase.from('site_sections').select('*').is('deleted_at', null).order('display_order'),
      supabase.from('site_faqs').select('*').is('deleted_at', null).order('display_order'),
      supabase.from('site_settings').select('*').is('deleted_at', null).limit(1),
      supabase.from('planner_templates').select('*').is('deleted_at', null),
    ]);

    if (!secRes.error && secRes.data && secRes.data.length > 0) {
      await cmsDb.site_sections.clear();
      await cmsDb.site_sections.bulkPut(secRes.data as SiteSection[]);
    }
    if (!faqRes.error && faqRes.data && faqRes.data.length > 0) {
      await cmsDb.site_faqs.clear();
      await cmsDb.site_faqs.bulkPut(faqRes.data as SiteFaq[]);
    }
    if (!setRes.error && setRes.data && setRes.data.length > 0) {
      await cmsDb.site_settings.clear();
      await cmsDb.site_settings.bulkPut(setRes.data as SiteSettings[]);
    }
    if (!tplRes.error && tplRes.data && tplRes.data.length > 0) {
      await cmsDb.planner_templates.clear();
      await cmsDb.planner_templates.bulkPut(tplRes.data as PlannerTemplate[]);
    }
  }

  const sections = (await cmsDb.site_sections.orderBy('display_order').toArray()).filter(
    (s) => !s.deleted_at
  );
  const faqs = (await cmsDb.site_faqs.orderBy('display_order').toArray()).filter(
    (f) => !f.deleted_at
  );
  const settingsArr = (await cmsDb.site_settings.toArray()).filter((s) => !s.deleted_at);
  const templates = (await cmsDb.planner_templates.toArray()).filter((t) => !t.deleted_at);

  return {
    sections: sections.length > 0 ? sections : DEFAULT_SITE_SECTIONS,
    faqs: faqs.length > 0 ? faqs : DEFAULT_SITE_FAQS,
    settings: settingsArr[0] ?? DEFAULT_SITE_SETTINGS,
    templates: templates.length > 0 ? templates : DEFAULT_PLANNER_TEMPLATES,
  };
}

export async function getGuestRecordCount(): Promise<number> {
  const guestDb = getUserDb('guest');
  const [plans, farms, cycles, scenarios] = await Promise.all([
    guestDb.production_plans.filter((r) => !r.deleted_at).count(),
    guestDb.farms.filter((r) => !r.deleted_at).count(),
    guestDb.production_cycles.filter((r) => !r.deleted_at).count(),
    guestDb.scenario_comparisons.filter((r) => !r.deleted_at).count(),
  ]);
  return plans + farms + cycles + scenarios;
}

export async function migrateGuestDataToUser(userId: string): Promise<number> {
  if (!userId || userId === 'guest') return 0;
  const guestDb = getUserDb('guest');
  const userDb = getUserDb(userId);
  let migrated = 0;

  const tablesToMigrate: Array<{
    name: SyncTableName;
    guestTable: Table<any, string>;
    userTable: Table<any, string>;
  }> = [
    { name: 'farms', guestTable: guestDb.farms, userTable: userDb.farms },
    { name: 'production_plans', guestTable: guestDb.production_plans, userTable: userDb.production_plans },
    { name: 'production_cycles', guestTable: guestDb.production_cycles, userTable: userDb.production_cycles },
    { name: 'flock_records', guestTable: guestDb.flock_records, userTable: userDb.flock_records },
    { name: 'feed_records', guestTable: guestDb.feed_records, userTable: userDb.feed_records },
    { name: 'egg_records', guestTable: guestDb.egg_records, userTable: userDb.egg_records },
    { name: 'financial_records', guestTable: guestDb.financial_records, userTable: userDb.financial_records },
    { name: 'calendar_activities', guestTable: guestDb.calendar_activities, userTable: userDb.calendar_activities },
    { name: 'scenario_comparisons', guestTable: guestDb.scenario_comparisons, userTable: userDb.scenario_comparisons },
  ];

  for (const item of tablesToMigrate) {
    const rows = await item.guestTable.filter((r) => !r.deleted_at).toArray();
    for (const row of rows) {
      const updated = {
        ...row,
        user_id: userId,
        updated_at: new Date().toISOString(),
      };
      await item.userTable.put(updated);
      await enqueueMutation({
        userId,
        table: item.name,
        operation: 'upsert',
        recordId: updated.id,
        payload: updated,
        baseUpdatedAt: null,
      });
      migrated += 1;
    }
    await item.guestTable.clear();
  }

  if (migrated > 0) {
    await processSyncQueue(userId);
  }
  return migrated;
}
