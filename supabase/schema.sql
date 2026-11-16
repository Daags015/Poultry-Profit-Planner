-- ============================================================================
-- POULTRY PROFIT PLANNER — SUPABASE POSTGRESQL SCHEMA & ROW LEVEL SECURITY
-- ============================================================================
-- Idempotent migration script. Safe to run in Supabase SQL Editor.
--
-- HOW TO PROMOTE YOUR FIRST ADMIN USER:
-- 1. Register an account in the app (or create a user in Supabase Auth).
-- 2. Find their UUID in Supabase Dashboard -> Authentication -> Users.
-- 3. Run the following SQL in the Supabase SQL Editor (which runs as postgres):
--
--    UPDATE public.profiles
--    SET role = 'admin'
--    WHERE id = '00000000-0000-0000-0000-000000000000';
--
--    -- Or by email from auth.users:
--    UPDATE public.profiles p
--    SET role = 'admin'
--    FROM auth.users u
--    WHERE p.id = u.id AND u.email = 'admin@yourfarm.com';
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- UTILITY FUNCTIONS & TRIGGERS
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 1. PROFILES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  default_currency TEXT NOT NULL DEFAULT '₦',
  default_bag_weight_kg NUMERIC(10, 2) NOT NULL DEFAULT 25,
  default_crate_size INTEGER NOT NULL DEFAULT 30,
  weight_unit TEXT NOT NULL DEFAULT 'kg' CHECK (weight_unit IN ('kg', 'lb')),
  client_mutation_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Security helper: check whether the authenticated user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND deleted_at IS NULL
  );
$$;

-- Prevent non-admins from escalating their own role via client UPDATE
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF current_setting('role', true) NOT IN ('postgres', 'service_role', 'supabase_admin')
       AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'Only administrators or database operators can modify user roles.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_profiles_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_profiles_prevent_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();

-- Auto-create profile row when a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 2. SITE SECTIONS (Admin CMS Controlled)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT NOT NULL UNIQUE,
  section_type TEXT NOT NULL CHECK (section_type IN ('hero', 'value_props', 'how_it_works', 'feature_grid', 'testimonials', 'preview', 'cta', 'custom')),
  heading TEXT NOT NULL DEFAULT '',
  subheading TEXT NOT NULL DEFAULT '',
  body_text TEXT NOT NULL DEFAULT '',
  primary_cta_label TEXT NOT NULL DEFAULT '',
  primary_cta_link TEXT NOT NULL DEFAULT '',
  secondary_cta_label TEXT NOT NULL DEFAULT '',
  secondary_cta_link TEXT NOT NULL DEFAULT '',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  client_mutation_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_site_sections_order ON public.site_sections (display_order, is_visible);
DROP TRIGGER IF EXISTS trg_site_sections_updated_at ON public.site_sections;
CREATE TRIGGER trg_site_sections_updated_at
  BEFORE UPDATE ON public.site_sections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. SITE FAQS (Admin CMS Controlled)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  client_mutation_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_site_faqs_order ON public.site_faqs (display_order, is_visible);
DROP TRIGGER IF EXISTS trg_site_faqs_updated_at ON public.site_faqs;
CREATE TRIGGER trg_site_faqs_updated_at
  BEFORE UPDATE ON public.site_faqs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 4. SITE SETTINGS (Admin CMS Global Config)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_name TEXT NOT NULL DEFAULT 'Poultry Profit Planner',
  tagline TEXT NOT NULL DEFAULT 'Plan Better. Calculate Smarter. Farm Profitably.',
  footer_about TEXT NOT NULL DEFAULT '',
  contact_email TEXT NOT NULL DEFAULT '',
  contact_phone TEXT NOT NULL DEFAULT '',
  disclaimer_text TEXT NOT NULL DEFAULT 'Estimates depend on your inputs, bird genetics, and farm management; results are projections, not guaranteed profits.',
  navigation_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  footer_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  client_mutation_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

DROP TRIGGER IF EXISTS trg_site_settings_updated_at ON public.site_settings;
CREATE TRIGGER trg_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 5. PLANNER TEMPLATES (Admin Editable Starter Presets)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.planner_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bird_type TEXT NOT NULL CHECK (bird_type IN ('broiler', 'layer')),
  template_name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  default_assumptions JSONB NOT NULL DEFAULT '{}'::jsonb,
  client_mutation_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_planner_templates_bird_type ON public.planner_templates (bird_type, is_active);
DROP TRIGGER IF EXISTS trg_planner_templates_updated_at ON public.planner_templates;
CREATE TRIGGER trg_planner_templates_updated_at
  BEFORE UPDATE ON public.planner_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 6. FARMS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_name TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  farm_type TEXT NOT NULL DEFAULT 'Mixed Poultry',
  notes TEXT NOT NULL DEFAULT '',
  client_mutation_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_farms_user_id ON public.farms (user_id, updated_at);
DROP TRIGGER IF EXISTS trg_farms_updated_at ON public.farms;
CREATE TRIGGER trg_farms_updated_at
  BEFORE UPDATE ON public.farms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 7. PRODUCTION PLANS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.production_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES public.farms(id) ON DELETE SET NULL,
  plan_name TEXT NOT NULL,
  bird_type TEXT NOT NULL CHECK (bird_type IN ('broiler', 'layer')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'converted')),
  assumptions JSONB NOT NULL DEFAULT '{}'::jsonb,
  feed_stages JSONB NOT NULL DEFAULT '[]'::jsonb,
  expense_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  client_mutation_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_production_plans_user ON public.production_plans (user_id, updated_at);
DROP TRIGGER IF EXISTS trg_production_plans_updated_at ON public.production_plans;
CREATE TRIGGER trg_production_plans_updated_at
  BEFORE UPDATE ON public.production_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 8. PRODUCTION CYCLES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.production_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES public.farms(id) ON DELETE SET NULL,
  source_plan_id UUID REFERENCES public.production_plans(id) ON DELETE SET NULL,
  cycle_name TEXT NOT NULL,
  bird_type TEXT NOT NULL CHECK (bird_type IN ('broiler', 'layer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  start_date DATE NOT NULL,
  expected_end_date DATE,
  initial_birds INTEGER NOT NULL DEFAULT 0,
  bird_unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tracking_mode TEXT NOT NULL DEFAULT 'bag_inventory' CHECK (tracking_mode IN ('simple_expense', 'bag_inventory')),
  assumptions JSONB NOT NULL DEFAULT '{}'::jsonb,
  feed_stages JSONB NOT NULL DEFAULT '[]'::jsonb,
  client_mutation_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_production_cycles_user ON public.production_cycles (user_id, status, updated_at);
DROP TRIGGER IF EXISTS trg_production_cycles_updated_at ON public.production_cycles;
CREATE TRIGGER trg_production_cycles_updated_at
  BEFORE UPDATE ON public.production_cycles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 9. FLOCK RECORDS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.flock_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES public.production_cycles(id) ON DELETE CASCADE,
  record_date DATE NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('mortality', 'culling', 'weight_sample')),
  bird_count INTEGER NOT NULL DEFAULT 0,
  average_weight_kg NUMERIC(10, 3),
  cause_or_notes TEXT NOT NULL DEFAULT '',
  client_mutation_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_flock_records_cycle ON public.flock_records (user_id, cycle_id, record_date);
DROP TRIGGER IF EXISTS trg_flock_records_updated_at ON public.flock_records;
CREATE TRIGGER trg_flock_records_updated_at
  BEFORE UPDATE ON public.flock_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 10. FEED RECORDS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.feed_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES public.production_cycles(id) ON DELETE CASCADE,
  record_date DATE NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'consumption', 'adjustment')),
  stage_name TEXT NOT NULL DEFAULT '',
  bags_count NUMERIC(10, 2) NOT NULL DEFAULT 0,
  bag_weight_kg NUMERIC(10, 2) NOT NULL DEFAULT 25,
  cost_per_bag NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_cost NUMERIC(14, 2) NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  client_mutation_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_feed_records_cycle ON public.feed_records (user_id, cycle_id, record_date);
DROP TRIGGER IF EXISTS trg_feed_records_updated_at ON public.feed_records;
CREATE TRIGGER trg_feed_records_updated_at
  BEFORE UPDATE ON public.feed_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 11. EGG RECORDS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.egg_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES public.production_cycles(id) ON DELETE CASCADE,
  record_date DATE NOT NULL,
  crates_collected INTEGER NOT NULL DEFAULT 0,
  loose_eggs INTEGER NOT NULL DEFAULT 0,
  cracked_eggs INTEGER NOT NULL DEFAULT 0,
  eggs_per_crate INTEGER NOT NULL DEFAULT 30,
  notes TEXT NOT NULL DEFAULT '',
  client_mutation_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_egg_records_cycle ON public.egg_records (user_id, cycle_id, record_date);
DROP TRIGGER IF EXISTS trg_egg_records_updated_at ON public.egg_records;
CREATE TRIGGER trg_egg_records_updated_at
  BEFORE UPDATE ON public.egg_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 12. FINANCIAL RECORDS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.financial_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES public.production_cycles(id) ON DELETE CASCADE,
  record_date DATE NOT NULL,
  record_type TEXT NOT NULL CHECK (record_type IN ('expense', 'sale')),
  category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  quantity NUMERIC(12, 2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid', 'outstanding')),
  is_capex BOOLEAN NOT NULL DEFAULT FALSE,
  amortization_cycles INTEGER NOT NULL DEFAULT 1,
  client_mutation_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_financial_records_cycle ON public.financial_records (user_id, cycle_id, record_date);
DROP TRIGGER IF EXISTS trg_financial_records_updated_at ON public.financial_records;
CREATE TRIGGER trg_financial_records_updated_at
  BEFORE UPDATE ON public.financial_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 13. CALENDAR ACTIVITIES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.calendar_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_id UUID REFERENCES public.production_cycles(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('vaccination', 'medication', 'feed_change', 'weighing', 'egg_milestone', 'market_date', 'general')),
  title TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  client_mutation_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_calendar_activities_user ON public.calendar_activities (user_id, scheduled_date, is_completed);
DROP TRIGGER IF EXISTS trg_calendar_activities_updated_at ON public.calendar_activities;
CREATE TRIGGER trg_calendar_activities_updated_at
  BEFORE UPDATE ON public.calendar_activities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 14. SCENARIO COMPARISONS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scenario_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  base_plan_id UUID REFERENCES public.production_plans(id) ON DELETE SET NULL,
  scenario_name TEXT NOT NULL,
  bird_type TEXT NOT NULL CHECK (bird_type IN ('broiler', 'layer')),
  modified_assumptions JSONB NOT NULL DEFAULT '{}'::jsonb,
  calculated_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  client_mutation_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_scenario_comparisons_user ON public.scenario_comparisons (user_id, updated_at);
DROP TRIGGER IF EXISTS trg_scenario_comparisons_updated_at ON public.scenario_comparisons;
CREATE TRIGGER trg_scenario_comparisons_updated_at
  BEFORE UPDATE ON public.scenario_comparisons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flock_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.egg_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenario_comparisons ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Public CMS policies (read visible for anon + authenticated, write for admins only)
DROP POLICY IF EXISTS "site_sections_public_read" ON public.site_sections;
CREATE POLICY "site_sections_public_read" ON public.site_sections
  FOR SELECT USING ((is_visible = TRUE AND deleted_at IS NULL) OR public.is_admin());

DROP POLICY IF EXISTS "site_sections_admin_write" ON public.site_sections;
CREATE POLICY "site_sections_admin_write" ON public.site_sections
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "site_faqs_public_read" ON public.site_faqs;
CREATE POLICY "site_faqs_public_read" ON public.site_faqs
  FOR SELECT USING ((is_visible = TRUE AND deleted_at IS NULL) OR public.is_admin());

DROP POLICY IF EXISTS "site_faqs_admin_write" ON public.site_faqs;
CREATE POLICY "site_faqs_admin_write" ON public.site_faqs
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "site_settings_public_read" ON public.site_settings;
CREATE POLICY "site_settings_public_read" ON public.site_settings
  FOR SELECT USING (deleted_at IS NULL OR public.is_admin());

DROP POLICY IF EXISTS "site_settings_admin_write" ON public.site_settings;
CREATE POLICY "site_settings_admin_write" ON public.site_settings
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "planner_templates_public_read" ON public.planner_templates;
CREATE POLICY "planner_templates_public_read" ON public.planner_templates
  FOR SELECT USING ((is_active = TRUE AND deleted_at IS NULL) OR public.is_admin());

DROP POLICY IF EXISTS "planner_templates_admin_write" ON public.planner_templates;
CREATE POLICY "planner_templates_admin_write" ON public.planner_templates
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- User-owned tables policies (strictly auth.uid() = user_id)
DROP POLICY IF EXISTS "farms_user_crud" ON public.farms;
CREATE POLICY "farms_user_crud" ON public.farms
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "production_plans_user_crud" ON public.production_plans;
CREATE POLICY "production_plans_user_crud" ON public.production_plans
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "production_cycles_user_crud" ON public.production_cycles;
CREATE POLICY "production_cycles_user_crud" ON public.production_cycles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "flock_records_user_crud" ON public.flock_records;
CREATE POLICY "flock_records_user_crud" ON public.flock_records
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "feed_records_user_crud" ON public.feed_records;
CREATE POLICY "feed_records_user_crud" ON public.feed_records
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "egg_records_user_crud" ON public.egg_records;
CREATE POLICY "egg_records_user_crud" ON public.egg_records
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "financial_records_user_crud" ON public.financial_records;
CREATE POLICY "financial_records_user_crud" ON public.financial_records
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "calendar_activities_user_crud" ON public.calendar_activities;
CREATE POLICY "calendar_activities_user_crud" ON public.calendar_activities
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "scenario_comparisons_user_crud" ON public.scenario_comparisons;
CREATE POLICY "scenario_comparisons_user_crud" ON public.scenario_comparisons
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 15. FEATURE SUGGESTIONS (Public Submit, Admin Manage)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.feature_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT '',
  contact TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'General',
  suggestion TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'planned', 'completed')),
  client_mutation_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

DROP TRIGGER IF EXISTS trg_feature_suggestions_updated_at ON public.feature_suggestions;
CREATE TRIGGER trg_feature_suggestions_updated_at
  BEFORE UPDATE ON public.feature_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.feature_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feature_suggestions_public_insert" ON public.feature_suggestions;
CREATE POLICY "feature_suggestions_public_insert" ON public.feature_suggestions
  FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "feature_suggestions_admin_all" ON public.feature_suggestions;
CREATE POLICY "feature_suggestions_admin_all" ON public.feature_suggestions
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================================
-- SEED DATA (IDEMPOTENT)
-- ============================================================================

INSERT INTO public.site_settings (
  id, site_name, tagline, footer_about, contact_email, contact_phone, disclaimer_text, navigation_links, footer_links
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Poultry Profit Planner',
  'Plan Better. Calculate Smarter. Farm Profitably.',
  'Built for commercial and emerging broiler and layer farmers who want clear unit economics, accurate feed stage budgets, and offline-ready daily farm records.',
  'daagsdigitalconcept@gmail.com',
  '08168779732',
  'Estimates depend on your inputs, bird genetics, feed quality, and farm management; results are projections, not guaranteed profits.',
  '[
    {"label": "Estimator", "href": "/#estimator"},
    {"label": "Broiler Planner", "href": "/planner/broiler"},
    {"label": "Layer Planner", "href": "/planner/layer"},
    {"label": "Scenarios", "href": "/scenarios"},
    {"label": "Dashboard", "href": "/dashboard"}
  ]'::jsonb,
  '[
    {"label": "Broiler Planner", "href": "/planner/broiler"},
    {"label": "Layer Planner", "href": "/planner/layer"},
    {"label": "What-If Comparator", "href": "/scenarios"},
    {"label": "Production Calendar", "href": "/calendar"},
    {"label": "Reports & Exports", "href": "/reports"}
  ]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.site_sections (
  id, section_key, section_type, heading, subheading, body_text,
  primary_cta_label, primary_cta_link, secondary_cta_label, secondary_cta_link,
  items, display_order, is_visible
)
VALUES
(
  '22222222-2222-2222-2222-222222222201',
  'hero',
  'hero',
  'Know your exact feed bags, break-even price, and flock profit before the chicks arrive.',
  'Built for field-ready poultry farming',
  'Model broiler batches and multi-month layer flocks with stage-adjusted mortality, amortized equipment costs, and offline-first daily records that work right inside your poultry house.',
  'Open Full Planner',
  '/planner/broiler',
  'Try Quick Estimator',
  '#estimator',
  '[
    {"title": "Stage-Adjusted Feed", "description": "Accounts for early flock mortality so starter and finisher bag counts reflect real consumption.", "badge": "Broiler & Layer"},
    {"title": "Rearing Amortization", "description": "Spreads day-old rearing costs cleanly across laying months without distorting monthly P&L.", "badge": "Layer Math"},
    {"title": "Offline-First Records", "description": "Log mortality, feed bags, and egg crates with zero signal; syncs automatically later.", "badge": "IndexedDB"}
  ]'::jsonb,
  1,
  TRUE
),
(
  '22222222-2222-2222-2222-222222222202',
  'value_props',
  'value_props',
  'Engineered around real poultry house math, not generic spreadsheets.',
  'Why farmers replace guesswork',
  'Feed typically makes up 65–75% of total poultry production cost. A small miscalculation in bag counts or break-even crate price wipes out margins. Every formula inside Poultry Profit Planner exposes its exact calculation.',
  'Compare What-If Scenarios',
  '/scenarios',
  '',
  '',
  '[
    {"title": "01. Whole Bags + Exact Kg", "description": "See exact kilogram feed demand alongside rounded-up whole 25 kg or 50 kg bags to purchase from the feed mill.", "icon": "scale"},
    {"title": "02. Zero Double-Counting", "description": "Choose per-bird or per-kg selling mode for broilers, and cleanly separate capitalized rearing from monthly layer expenses.", "icon": "shield"},
    {"title": "03. One-Tap Cycle Conversion", "description": "Turn any approved budget into an active production cycle with pre-scheduled vaccination and feed-switch milestones.", "icon": "calendar"}
  ]'::jsonb,
  2,
  TRUE
),
(
  '22222222-2222-2222-2222-222222222203',
  'how_it_works',
  'how_it_works',
  'From pre-stocking budget to final harvest ledger in four steps.',
  'Workflow',
  'Start immediately with zero registration, save drafts to your device, and convert winning plans into live farm cycles.',
  'Launch Layer Planner',
  '/planner/layer',
  '',
  '',
  '[
    {"title": "1. Load a Starter Template", "description": "Start with editable Broiler (3-stage or 2-stage) or Layer (Day-Old or Point-of-Lay) assumptions and adjust to your local market prices.", "badge": "Step 01"},
    {"title": "2. Stress-Test Your Margins", "description": "Run side-by-side What-If scenarios for feed price spikes, mortality changes, or market price dips before buying stock.", "badge": "Step 02"},
    {"title": "3. Convert to Active Cycle", "description": "Lock in your budget baseline, select Simple Expense or Bag Inventory feed tracking, and auto-generate farm milestones.", "badge": "Step 03"},
    {"title": "4. Track Variance & Export", "description": "Log daily crates, mortality, and expenses offline in the pen, then print clean PDF or Excel reports anytime.", "badge": "Step 04"}
  ]'::jsonb,
  3,
  TRUE
),
(
  '22222222-2222-2222-2222-222222222204',
  'feature_grid',
  'feature_grid',
  'Everything needed across planning, daily pens, and financial reporting.',
  'Platform capabilities',
  'Designed for outdoor sunlit legibility on mobile phones and full analytical clarity on desktop screens.',
  'View Sample Dashboard',
  '/dashboard',
  '',
  '',
  '[
    {"title": "Multi-Farm & Multi-Cycle Tracking", "description": "Filter KPIs, flock counts, and cashflow across all farms or isolate a single poultry house.", "icon": "layers"},
    {"title": "Bag Inventory & Simple Expense Modes", "description": "Track every bag purchased vs. consumed in store, or record direct feed expenses per batch.", "icon": "package"},
    {"title": "Period Laying Curve Modeling", "description": "Model onset, peak, and late-lay egg percentages month by month instead of a flat unrealistic average.", "icon": "trending"},
    {"title": "OpEx vs. Amortized CapEx", "description": "Amortize drinkers, feeders, cages, and housing repairs across multiple production cycles.", "icon": "calculator"}
  ]'::jsonb,
  4,
  TRUE
),
(
  '22222222-2222-2222-2222-222222222206',
  'testimonials',
  'testimonials',
  'Trusted by poultry farmers managing real flock budgets.',
  'Farmer Stories',
  'See how commercial broiler growers and layer farms use stage-adjusted feed modeling and offline daily logs to protect batch margins.',
  '',
  '',
  '',
  '',
  '[
    {"title": "Chinedu Okafor", "author_role": "Managing Farmer", "farm_name": "Greenfield Broilers, Ogun State", "metric": "Saved 14 bags of finisher feed across 1,500 birds", "description": "Before using Poultry Profit Planner, our paper estimates always over-ordered finisher feed by 10–15 bags. Accounting for early mortality across each feed stage cut dead feed capital on our very next 42-day cycle."},
    {"title": "Amina Bello", "author_role": "Operations Lead", "farm_name": "Kano Crest Layer Farms", "metric": "Clear break-even crate pricing across 12 laying months", "description": "Separating our 18-week rearing cost from monthly layer mash showed our true break-even price per 30-egg crate. Adjusting our wholesale pricing kept every month profitable even when maize prices shifted."},
    {"title": "Tunde Adeyemi", "author_role": "Farm Supervisor", "farm_name": "Cedar Valley Poultry", "metric": "100% daily pen logging with zero mobile signal", "description": "Network inside our deep-litter pens is unreliable. Attendants log daily mortality, bag consumption, and egg crates offline on their phones, and everything syncs cleanly to my dashboard once back at the office."}
  ]'::jsonb,
  5,
  TRUE
),
(
  '22222222-2222-2222-2222-222222222205',
  'cta',
  'cta',
  'Ready to model your next broiler batch or layer house?',
  'Start free — works offline on your device',
  'Run unlimited broiler and layer budgets right now. Create a free account anytime to sync plans and daily logs across devices.',
  'Create Broiler Plan',
  '/planner/broiler',
  'Create Layer Plan',
  '/planner/layer',
  '[]'::jsonb,
  6,
  TRUE
)
ON CONFLICT (section_key) DO NOTHING;

INSERT INTO public.site_faqs (id, question, answer, category, display_order, is_visible)
VALUES
(
  '33333333-3333-3333-3333-333333333301',
  'Does Poultry Profit Planner work without internet inside the poultry house?',
  'Yes. Your plans, daily mortality, feed logs, egg collections, and financial entries save immediately to your device via IndexedDB and sync automatically to your cloud account whenever connectivity returns.',
  'Offline & Sync',
  1,
  TRUE
),
(
  '33333333-3333-3333-3333-333333333302',
  'How does the Broiler engine avoid overestimating feed when birds die early?',
  'Expected mortality is distributed proportionally across each feed stage midpoint. Birds lost in the starter phase are not counted as consuming full grower and finisher rations, giving you realistic kilogram and whole-bag totals.',
  'Calculations',
  2,
  TRUE
),
(
  '33333333-3333-3333-3333-333333333303',
  'How are Day-Old Layer rearing costs handled during laying months?',
  'When starting from day-old chicks, chick cost, starter/grower/pre-layer feed, and rearing medications are capitalized into a Rearing Cost total and amortized evenly across your laying months so monthly egg P&L remains accurate.',
  'Calculations',
  3,
  TRUE
),
(
  '33333333-3333-3333-3333-333333333304',
  'Can I try the planner before creating an account?',
  'Yes. You can use the Quick Estimator on the homepage or the full Broiler and Layer Planners immediately. Plans saved as a guest stay on your device and can be migrated into your account as soon as you sign in.',
  'Account',
  4,
  TRUE
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.planner_templates (id, bird_type, template_name, description, is_active, default_assumptions)
VALUES
(
  '44444444-4444-4444-4444-444444444401',
  'broiler',
  'Standard 3-Stage Broiler (500 Birds · 42 Days)',
  'Sample Estimate — Adjust chick, feed bag, and selling prices to your local farm market.',
  TRUE,
  '{
    "startingBirds": 500,
    "pricePerChick": 950,
    "durationDays": 42,
    "mortalityRatePercent": 5,
    "targetAvgWeightKg": 2.3,
    "sellingMethod": "per_bird",
    "sellingPricePerBird": 8500,
    "sellingPricePerKg": 3800,
    "feedStages": [
      {"id": "st-1", "stageName": "Starter", "durationDays": 14, "feedPerBirdKg": 0.65, "bagWeightKg": 25, "pricePerBag": 22500},
      {"id": "st-2", "stageName": "Grower", "durationDays": 14, "feedPerBirdKg": 1.45, "bagWeightKg": 25, "pricePerBag": 21500},
      {"id": "st-3", "stageName": "Finisher", "durationDays": 14, "feedPerBirdKg": 1.95, "bagWeightKg": 25, "pricePerBag": 21000}
    ],
    "expenseItems": [
      {"id": "ex-1", "category": "Vaccination", "description": "Gumboro & Newcastle vaccines", "amount": 45000, "isCapex": false, "amortizationCycles": 1},
      {"id": "ex-2", "category": "Medication", "description": "Vitamins, anticoccidials & brooding boosters", "amount": 55000, "isCapex": false, "amortizationCycles": 1},
      {"id": "ex-3", "category": "Litter", "description": "Wood shavings & disinfectants", "amount": 35000, "isCapex": false, "amortizationCycles": 1},
      {"id": "ex-4", "category": "Electricity & Water", "description": "Brooding heat, charcoal/gas & water", "amount": 65000, "isCapex": false, "amortizationCycles": 1},
      {"id": "ex-5", "category": "Labour", "description": "Pen attendant allowance (6 weeks)", "amount": 90000, "isCapex": false, "amortizationCycles": 1},
      {"id": "ex-6", "category": "Equipment", "description": "Feeders & bell drinkers (amortized over 6 cycles)", "amount": 180000, "isCapex": true, "amortizationCycles": 6}
    ]
  }'::jsonb
),
(
  '44444444-4444-4444-4444-444444444402',
  'broiler',
  'Fast 2-Stage Broiler (500 Birds · 38 Days)',
  'Sample Estimate — Starter + Finisher program for fast commercial turnaround.',
  TRUE,
  '{
    "startingBirds": 500,
    "pricePerChick": 950,
    "durationDays": 38,
    "mortalityRatePercent": 4.5,
    "targetAvgWeightKg": 2.05,
    "sellingMethod": "per_kg",
    "sellingPricePerBird": 7800,
    "sellingPricePerKg": 3850,
    "feedStages": [
      {"id": "st-1", "stageName": "Super Starter", "durationDays": 18, "feedPerBirdKg": 1.05, "bagWeightKg": 25, "pricePerBag": 22500},
      {"id": "st-2", "stageName": "Finisher", "durationDays": 20, "feedPerBirdKg": 2.55, "bagWeightKg": 25, "pricePerBag": 21200}
    ],
    "expenseItems": [
      {"id": "ex-1", "category": "Vaccination", "description": "Core vaccine schedule", "amount": 45000, "isCapex": false, "amortizationCycles": 1},
      {"id": "ex-2", "category": "Medication", "description": "Brooding vitamins & water sanitizers", "amount": 48000, "isCapex": false, "amortizationCycles": 1},
      {"id": "ex-3", "category": "Electricity & Water", "description": "Heating & water supply", "amount": 55000, "isCapex": false, "amortizationCycles": 1},
      {"id": "ex-4", "category": "Labour", "description": "Attendant & litter management", "amount": 80000, "isCapex": false, "amortizationCycles": 1}
    ]
  }'::jsonb
),
(
  '44444444-4444-4444-4444-444444444403',
  'layer',
  'Day-Old Layer Flock (500 Birds · 12 Laying Months)',
  'Sample Estimate — Models 18-week rearing capitalization plus 12 months of graded egg production.',
  TRUE,
  '{
    "startingBirds": 500,
    "entryType": "day_old_chicks",
    "purchasePricePerBird": 1150,
    "rearingMortalityPercent": 5,
    "ageAtFirstLayWeeks": 18,
    "layingDurationMonths": 12,
    "eggsPerCrate": 30,
    "eggPricePerCrate": 5200,
    "spentLayerPricePerBird": 4800,
    "estimatedManureRevenue": 180000,
    "feedStages": [
      {"id": "ls-1", "stageName": "Chick Starter", "phase": "rearing", "durationDays": 56, "consumptionMode": "total_kg", "dailyGramsPerBird": 38, "totalKgPerBird": 2.1, "bagWeightKg": 25, "pricePerBag": 21000},
      {"id": "ls-2", "stageName": "Grower Mash", "phase": "rearing", "durationDays": 56, "consumptionMode": "total_kg", "dailyGramsPerBird": 65, "totalKgPerBird": 3.6, "bagWeightKg": 25, "pricePerBag": 18500},
      {"id": "ls-3", "stageName": "Pre-Layer", "phase": "rearing", "durationDays": 14, "consumptionMode": "daily_grams", "dailyGramsPerBird": 90, "totalKgPerBird": 1.26, "bagWeightKg": 25, "pricePerBag": 19200},
      {"id": "ls-4", "stageName": "Layer Mash", "phase": "laying", "durationDays": 365, "consumptionMode": "daily_grams", "dailyGramsPerBird": 115, "totalKgPerBird": 41.975, "bagWeightKg": 25, "pricePerBag": 19500}
    ],
    "layingPeriods": [
      {"id": "lp-1", "periodName": "Month 1 (Onset)", "days": 30, "layingPercent": 35, "mortalityPercent": 0.5},
      {"id": "lp-2", "periodName": "Month 2 (Ramp-Up)", "days": 30, "layingPercent": 74, "mortalityPercent": 0.4},
      {"id": "lp-3", "periodName": "Month 3 (Peak)", "days": 30, "layingPercent": 90, "mortalityPercent": 0.4},
      {"id": "lp-4", "periodName": "Month 4 (Peak)", "days": 30, "layingPercent": 91, "mortalityPercent": 0.4},
      {"id": "lp-5", "periodName": "Month 5 (Peak)", "days": 30, "layingPercent": 89, "mortalityPercent": 0.4},
      {"id": "lp-6", "periodName": "Month 6", "days": 30, "layingPercent": 87, "mortalityPercent": 0.4},
      {"id": "lp-7", "periodName": "Month 7", "days": 30, "layingPercent": 84, "mortalityPercent": 0.4},
      {"id": "lp-8", "periodName": "Month 8", "days": 30, "layingPercent": 81, "mortalityPercent": 0.5},
      {"id": "lp-9", "periodName": "Month 9", "days": 30, "layingPercent": 78, "mortalityPercent": 0.5},
      {"id": "lp-10", "periodName": "Month 10", "days": 30, "layingPercent": 75, "mortalityPercent": 0.5},
      {"id": "lp-11", "periodName": "Month 11", "days": 30, "layingPercent": 72, "mortalityPercent": 0.5},
      {"id": "lp-12", "periodName": "Month 12 (Late Lay)", "days": 35, "layingPercent": 68, "mortalityPercent": 0.6}
    ],
    "expenseItems": [
      {"id": "lex-1", "category": "Vaccination", "description": "Full rearing vaccine series", "amount": 110000, "phase": "rearing", "isCapex": false, "amortizationCycles": 1},
      {"id": "lex-2", "category": "Medication", "description": "Brooding & grower health support", "amount": 85000, "phase": "rearing", "isCapex": false, "amortizationCycles": 1},
      {"id": "lex-3", "category": "Labour", "description": "Rearing phase attendant (18 weeks)", "amount": 220000, "phase": "rearing", "isCapex": false, "amortizationCycles": 1},
      {"id": "lex-4", "category": "Labour", "description": "Laying house labour (12 months)", "amount": 720000, "phase": "laying", "isCapex": false, "amortizationCycles": 1},
      {"id": "lex-5", "category": "Medication", "description": "Deworming, calcium & routine boosters", "amount": 140000, "phase": "laying", "isCapex": false, "amortizationCycles": 1},
      {"id": "lex-6", "category": "Equipment", "description": "Battery cages / nest boxes (amortized 4 cycles)", "amount": 900000, "phase": "laying", "isCapex": true, "amortizationCycles": 4}
    ]
  }'::jsonb
),
(
  '44444444-4444-4444-4444-444444444404',
  'layer',
  'Point-of-Lay Pullets (500 Birds · 12 Laying Months)',
  'Sample Estimate — Immediate egg production starting at 16–18 weeks old.',
  TRUE,
  '{
    "startingBirds": 500,
    "entryType": "point_of_lay",
    "purchasePricePerBird": 6800,
    "rearingMortalityPercent": 1,
    "ageAtFirstLayWeeks": 18,
    "layingDurationMonths": 12,
    "eggsPerCrate": 30,
    "eggPricePerCrate": 5200,
    "spentLayerPricePerBird": 4800,
    "estimatedManureRevenue": 150000,
    "feedStages": [
      {"id": "ls-3", "stageName": "Pre-Layer Transition", "phase": "rearing", "durationDays": 14, "consumptionMode": "daily_grams", "dailyGramsPerBird": 95, "totalKgPerBird": 1.33, "bagWeightKg": 25, "pricePerBag": 19200},
      {"id": "ls-4", "stageName": "Layer Mash", "phase": "laying", "durationDays": 365, "consumptionMode": "daily_grams", "dailyGramsPerBird": 115, "totalKgPerBird": 41.975, "bagWeightKg": 25, "pricePerBag": 19500}
    ],
    "layingPeriods": [
      {"id": "lp-1", "periodName": "Month 1 (Onset)", "days": 30, "layingPercent": 42, "mortalityPercent": 0.4},
      {"id": "lp-2", "periodName": "Month 2 (Ramp-Up)", "days": 30, "layingPercent": 78, "mortalityPercent": 0.4},
      {"id": "lp-3", "periodName": "Month 3 (Peak)", "days": 30, "layingPercent": 90, "mortalityPercent": 0.4},
      {"id": "lp-4", "periodName": "Month 4 (Peak)", "days": 30, "layingPercent": 91, "mortalityPercent": 0.4},
      {"id": "lp-5", "periodName": "Month 5 (Peak)", "days": 30, "layingPercent": 89, "mortalityPercent": 0.4},
      {"id": "lp-6", "periodName": "Month 6", "days": 30, "layingPercent": 87, "mortalityPercent": 0.4},
      {"id": "lp-7", "periodName": "Month 7", "days": 30, "layingPercent": 84, "mortalityPercent": 0.4},
      {"id": "lp-8", "periodName": "Month 8", "days": 30, "layingPercent": 81, "mortalityPercent": 0.5},
      {"id": "lp-9", "periodName": "Month 9", "days": 30, "layingPercent": 78, "mortalityPercent": 0.5},
      {"id": "lp-10", "periodName": "Month 10", "days": 30, "layingPercent": 75, "mortalityPercent": 0.5},
      {"id": "lp-11", "periodName": "Month 11", "days": 30, "layingPercent": 72, "mortalityPercent": 0.5},
      {"id": "lp-12", "periodName": "Month 12 (Late Lay)", "days": 35, "layingPercent": 68, "mortalityPercent": 0.6}
    ],
    "expenseItems": [
      {"id": "lex-1", "category": "Transportation", "description": "Pullet haulage & crate transport", "amount": 95000, "phase": "rearing", "isCapex": false, "amortizationCycles": 1},
      {"id": "lex-2", "category": "Labour", "description": "Laying house attendant (12 months)", "amount": 720000, "phase": "laying", "isCapex": false, "amortizationCycles": 1},
      {"id": "lex-3", "category": "Medication", "description": "Anti-stress, deworming & calcium", "amount": 135000, "phase": "laying", "isCapex": false, "amortizationCycles": 1},
      {"id": "lex-4", "category": "Electricity & Water", "description": "Lighting & borehole pumping", "amount": 160000, "phase": "laying", "isCapex": false, "amortizationCycles": 1}
    ]
  }'::jsonb
)
ON CONFLICT (id) DO NOTHING;
