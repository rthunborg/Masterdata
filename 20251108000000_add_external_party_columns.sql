-- Migration: Add External Party Custom Columns
-- Description: Adds custom columns for Toplux, Payroll, and OMC external parties
-- Created: 2025-11-08
-- Purpose: Migrate custom columns from JSON definitions to real table columns with proper permissions
-- 
-- External Party Permissions:
--   - Toplux: 9 columns (view & edit rights)
--   - Payroll: 4 columns (view & edit rights)  
--   - OMC: 14 columns (view & edit rights)
-- 
-- All columns are also accessible by HR Admin with view & edit rights

BEGIN;

-- ============================================================================
-- TOPLUX COLUMNS (9 columns)
-- ============================================================================

-- Column: Stena ID- Origo nummer
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS stena_id_origo_nummer TEXT;

COMMENT ON COLUMN public.employees.stena_id_origo_nummer IS 
  'Stena ID- Origo nummer - Toplux field';

CREATE INDEX IF NOT EXISTS idx_employees_stena_id_origo_nummer 
ON public.employees(stena_id_origo_nummer);

INSERT INTO public.column_config (
  column_name, 
  db_column_name,
  column_type, 
  is_masterdata, 
  category,
  display_order,
  role_permissions
) VALUES (
  'Stena ID- Origo nummer',
  'stena_id_origo_nummer',
  'text',
  false,
  'Toplux',
  (SELECT COALESCE(MAX(display_order), 0) + 1 FROM public.column_config),
  '{"hr_admin":{"view":true,"edit":true},"sodexo":{"view":false,"edit":false},"omc":{"view":false,"edit":false},"payroll":{"view":false,"edit":false},"toplux":{"view":true,"edit":true}}'::jsonb
)
ON CONFLICT (db_column_name, is_masterdata) DO NOTHING;

-- Column: Beställning gjord
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS bestallning_gjord DATE;

COMMENT ON COLUMN public.employees.bestallning_gjord IS 
  'Beställning gjord - Toplux field';

CREATE INDEX IF NOT EXISTS idx_employees_bestallning_gjord 
ON public.employees(bestallning_gjord);

INSERT INTO public.column_config (
  column_name, 
  db_column_name,
  column_type, 
  is_masterdata, 
  category,
  display_order,
  role_permissions
) VALUES (
  'Beställning gjord',
  'bestallning_gjord',
  'date',
  false,
  'Toplux',
  (SELECT COALESCE(MAX(display_order), 0) + 1 FROM public.column_config),
  '{"hr_admin":{"view":true,"edit":true},"sodexo":{"view":false,"edit":false},"omc":{"view":false,"edit":false},"payroll":{"view":false,"edit":false},"toplux":{"view":true,"edit":true}}'::jsonb
)
ON CONFLICT (db_column_name, is_masterdata) DO NOTHING;

-- Column: Fartyg
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS fartyg TEXT;

COMMENT ON COLUMN public.employees.fartyg IS 
  'Fartyg - Toplux field';

CREATE INDEX IF NOT EXISTS idx_employees_fartyg 
ON public.employees(fartyg);

INSERT INTO public.column_config (
  column_name, 
  db_column_name,
  column_type, 
  is_masterdata, 
  category,
  display_order,
  role_permissions
) VALUES (
  'Fartyg',
  'fartyg',
  'text',
  false,
  'Toplux',
  (SELECT COALESCE(MAX(display_order), 0) + 1 FROM public.column_config),
  '{"hr_admin":{"view":true,"edit":true},"sodexo":{"view":false,"edit":false},"omc":{"view":false,"edit":false},"payroll":{"view":false,"edit":false},"toplux":{"view":true,"edit":true}}'::jsonb
)
ON CONFLICT (db_column_name, is_masterdata) DO NOTHING;

-- Column: Skickat beställning till Fartyg/Warehouse
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS skickat_bestallning_till_fartyg_warehouse DATE;

COMMENT ON COLUMN public.employees.skickat_bestallning_till_fartyg_warehouse IS 
  'Skickat beställning till Fartyg/Warehouse - Toplux field';

CREATE INDEX IF NOT EXISTS idx_employees_skickat_bestallning_till_fartyg_warehouse 
ON public.employees(skickat_bestallning_till_fartyg_warehouse);

INSERT INTO public.column_config (
  column_name, 
  db_column_name,
  column_type, 
  is_masterdata, 
  category,
  display_order,
  role_permissions
) VALUES (
  'Skickat beställning till Fartyg/Warehouse',
  'skickat_bestallning_till_fartyg_warehouse',
  'date',
  false,
  'Toplux',
  (SELECT COALESCE(MAX(display_order), 0) + 1 FROM public.column_config),
  '{"hr_admin":{"view":true,"edit":true},"sodexo":{"view":false,"edit":false},"omc":{"view":false,"edit":false},"payroll":{"view":false,"edit":false},"toplux":{"view":true,"edit":true}}'::jsonb
)
ON CONFLICT (db_column_name, is_masterdata) DO NOTHING;

-- Column: Mottaget
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS mottaget DATE;

COMMENT ON COLUMN public.employees.mottaget IS 
  'Mottaget - Toplux field';

CREATE INDEX IF NOT EXISTS idx_employees_mottaget 
ON public.employees(mottaget);

INSERT INTO public.column_config (
  column_name, 
  db_column_name,
  column_type, 
  is_masterdata, 
  category,
  display_order,
  role_permissions
) VALUES (
  'Mottaget',
  'mottaget',
  'date',
  false,
  'Toplux',
  (SELECT COALESCE(MAX(display_order), 0) + 1 FROM public.column_config),
  '{"hr_admin":{"view":true,"edit":true},"sodexo":{"view":false,"edit":false},"omc":{"view":false,"edit":false},"payroll":{"view":false,"edit":false},"toplux":{"view":true,"edit":true}}'::jsonb
)
ON CONFLICT (db_column_name, is_masterdata) DO NOTHING;

-- Column: Kontaktat medarbetare
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS kontaktat_medarbetare TEXT;

COMMENT ON COLUMN public.employees.kontaktat_medarbetare IS 
  'Kontaktat medarbetare - Toplux field';

CREATE INDEX IF NOT EXISTS idx_employees_kontaktat_medarbetare 
ON public.employees(kontaktat_medarbetare);

INSERT INTO public.column_config (
  column_name, 
  db_column_name,
  column_type, 
  is_masterdata, 
  category,
  display_order,
  role_permissions
) VALUES (
  'Kontaktat medarbetare',
  'kontaktat_medarbetare',
  'text',
  false,
  'Toplux',
  (SELECT COALESCE(MAX(display_order), 0) + 1 FROM public.column_config),
  '{"hr_admin":{"view":true,"edit":true},"sodexo":{"view":false,"edit":false},"omc":{"view":false,"edit":false},"payroll":{"view":false,"edit":false},"toplux":{"view":true,"edit":true}}'::jsonb
)
ON CONFLICT (db_column_name, is_masterdata) DO NOTHING;

-- Column: Uthämtat
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS uthamtat DATE;

COMMENT ON COLUMN public.employees.uthamtat IS 
  'Uthämtat - Toplux field';

CREATE INDEX IF NOT EXISTS idx_employees_uthamtat 
ON public.employees(uthamtat);

INSERT INTO public.column_config (
  column_name, 
  db_column_name,
  column_type, 
  is_masterdata, 
  category,
  display_order,
  role_permissions
) VALUES (
  'Uthämtat',
  'uthamtat',
  'date',
  false,
  'Toplux',
  (SELECT COALESCE(MAX(display_order), 0) + 1 FROM public.column_config),
  '{"hr_admin":{"view":true,"edit":true},"sodexo":{"view":false,"edit":false},"omc":{"view":false,"edit":false},"payroll":{"view":false,"edit":false},"toplux":{"view":true,"edit":true}}'::jsonb
)
ON CONFLICT (db_column_name, is_masterdata) DO NOTHING;

-- Column: Mottagit kort
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS mottagit_kort BOOLEAN;

COMMENT ON COLUMN public.employees.mottagit_kort IS 
  'Mottagit kort - Toplux field';

CREATE INDEX IF NOT EXISTS idx_employees_mottagit_kort 
ON public.employees(mottagit_kort);

INSERT INTO public.column_config (
  column_name, 
  db_column_name,
  column_type, 
  is_masterdata, 
  category,
  display_order,
  role_permissions
) VALUES (
  'Mottagit kort',
  'mottagit_kort',
  'boolean',
  false,
  'Toplux',
  (SELECT COALESCE(MAX(display_order), 0) + 1 FROM public.column_config),
  '{"hr_admin":{"view":true,"edit":true},"sodexo":{"view":false,"edit":false},"omc":{"view":false,"edit":false},"payroll":{"view":false,"edit":false},"toplux":{"view":true,"edit":true}}'::jsonb
)
ON CONFLICT (db_column_name, is_masterdata) DO NOTHING;

-- Column: Skickat kort till fartyg
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS skickat_kort_till_fartyg BOOLEAN;

COMMENT ON COLUMN public.employees.skickat_kort_till_fartyg IS 
  'Skickat kort till fartyg - Toplux field';

CREATE INDEX IF NOT EXISTS idx_employees_skickat_kort_till_fartyg 
ON public.employees(skickat_kort_till_fartyg);

INSERT INTO public.column_config (
  column_name, 
  db_column_name,
  column_type, 
  is_masterdata, 
  category,
  display_order,
  role_permissions
) VALUES (
  'Skickat kort till fartyg',
  'skickat_kort_till_fartyg',
  'boolean',
  false,
  'Toplux',
  (SELECT COALESCE(MAX(display_order), 0) + 1 FROM public.column_config),
  '{"hr_admin":{"view":true,"edit":true},"sodexo":{"view":false,"edit":false},"omc":{"view":false,"edit":false},"payroll":{"view":false,"edit":false},"toplux":{"view":true,"edit":true}}'::jsonb
)
ON CONFLICT (db_column_name, is_masterdata) DO NOTHING;

-- ============================================================================
-- PAYROLL COLUMNS (4 columns)
-- ============================================================================

-- Column: Ersatt
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS ersatt TEXT;

COMMENT ON COLUMN public.employees.ersatt IS 
  'Ersatt - Payroll field';

CREATE INDEX IF NOT EXISTS idx_employees_ersatt 
ON public.employees(ersatt);

INSERT INTO public.column_config (
  column_name, 
  db_column_name,
  column_type, 
  is_masterdata, 
  category,
  display_order,
  role_permissions
) VALUES (
  'Ersatt',
  'ersatt',
  'text',
  false,
  'Payroll',
  (SELECT COALESCE(MAX(display_order), 0) + 1 FROM public.column_config),
  '{"hr_admin":{"view":true,"edit":true},"sodexo":{"view":false,"edit":false},"omc":{"view":false,"edit":false},"payroll":{"view":true,"edit":true},"toplux":{"view":false,"edit":false}}'::jsonb
)
ON CONFLICT (db_column_name, is_masterdata) DO NOTHING;

-- Column: Fartyg
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS fartyg TEXT;

COMMENT ON COLUMN public.employees.fartyg IS 
  'Fartyg - Payroll field';

CREATE INDEX IF NOT EXISTS idx_employees_fartyg 
ON public.employees(fartyg);

INSERT INTO public.column_config (
  column_name, 
  db_column_name,
  column_type, 
  is_masterdata, 
  category,
  display_order,
  role_permissions
) VALUES (
  'Fartyg',
  'fartyg',
  'text',
  false,
  'Payroll',
  (SELECT COALESCE(MAX(display_order), 0) + 1 FROM public.column_config),
  '{"hr_admin":{"view":true,"edit":true},"sodexo":{"view":false,"edit":false},"omc":{"view":false,"edit":false},"payroll":{"view":true,"edit":true},"toplux":{"view":false,"edit":false}}'::jsonb
)
ON CONFLICT (db_column_name, is_masterdata) DO NOTHING;

-- Column: Klart/sign
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS klart_sign BOOLEAN;

COMMENT ON COLUMN public.employees.klart_sign IS 
  'Klart/sign - Payroll field';

CREATE INDEX IF NOT EXISTS idx_employees_klart_sign 
ON public.employees(klart_sign);

INSERT INTO public.column_config (
  column_name, 
  db_column_name,
  column_type, 
  is_masterdata, 
  category,
  display_order,
  role_permissions
) VALUES (
  'Klart/sign',
  'klart_sign',
  'boolean',
  false,
  'Payroll',
  (SELECT COALESCE(MAX(display_order), 0) + 1 FROM public.column_config),
  '{"hr_admin":{"view":true,"edit":true},"sodexo":{"view":false,"edit":false},"omc":{"view":false,"edit":false},"payroll":{"view":true,"edit":true},"toplux":{"view":false,"edit":false}}'::jsonb
)
ON CONFLICT (db_column_name, is_masterdata) DO NOTHING;

-- Column: Notering
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS notering TEXT;

COMMENT ON COLUMN public.employees.notering IS 
  'Notering - Payroll field';

CREATE INDEX IF NOT EXISTS idx_employees_notering 
ON public.employees(notering);

INSERT INTO public.column_config (
  column_name, 
  db_column_name,
  column_type, 
  is_masterdata, 
  category,
  display_order,
  role_permissions
) VALUES (
  'Notering',
  'notering',
  'text',
  false,
  'Payroll',
  (SELECT COALESCE(MAX(display_order), 0) + 1 FROM public.column_config),
  '{"hr_admin":{"view":true,"edit":true},"sodexo":{"view":false,"edit":false},"omc":{"view":false,"edit":false},"payroll":{"view":true,"edit":true},"toplux":{"view":false,"edit":false}}'::jsonb
)
ON CONFLICT (db_column_name, is_masterdata) DO NOTHING;

-- ============================================================================
-- OMC COLUMNS (14 columns)
-- ============================================================================

-- Column: Rotation 1 or 2
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS rotation INTEGER;

COMMENT ON COLUMN public.employees.rotation IS 
  'Rotation 1 or 2 - OMC field';

CREATE INDEX IF NOT EXISTS idx_employees_rotation 
ON public.employees(rotation);

INSERT INTO public.column_config (
  column_name, 
  db_column_name,
  column_type, 
  is_masterdata, 
  category,
  display_order,
  role_permissions
) VALUES (
  'Rotation 1 or 2',
  'rotation',
  'number',
  false,
  'OMC',
  (SELECT COALESCE(MAX(display_order), 0) + 1 FROM public.column_config),
  '{"hr_admin":{"view":true,"edit":true},"sodexo":{"view":false,"edit":false},"omc":{"view":true,"edit":true},"payroll":{"view":false,"edit":false},"toplux":{"view":false,"edit":false}}'::jsonb
)
ON CONFLICT (db_column_name, is_masterdata) DO NOTHING;

-- Column: Hotel Required?
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS hotel_required BOOLEAN;

COMMENT ON COLUMN public.employees.hotel_required IS 
  'Hotel Required? - OMC field';

CREATE INDEX IF NOT EXISTS idx_employees_hotel_required 
ON public.employees(hotel_required);

INSERT INTO public.column_config (
  column_name, 
  db_column_name,
  column_type, 
  is_masterdata, 
  category,
  display_order,
  role_permissions
) VALUES (
  'Hotel Required?',
  'hotel_required',
  'boolean',
  false,
  'OMC',
  (SELECT COALESCE(MAX(display_order), 0) + 1 FROM public.column_config),
  '{"hr_admin":{"view":true,"edit":true},"sodexo":{"view":false,"edit":false},"omc":{"view":true,"edit":true},"payroll":{"view":false,"edit":false},"toplux":{"view":false,"edit":false}}'::jsonb
)
ON CONFLICT (db_column_name, is_masterdata) DO NOTHING;

-- Column: Room Number (Shared)
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS room_number_shared INTEGER;

COMMENT ON COLUMN public.employees.room_number_shared IS 
  'Room Number (Shared) - OMC field';

CREATE INDEX IF NOT EXISTS idx_employees_room_number_shared 
ON public.employees(room_number_shared);

INSERT INTO public.column_config (
  column_name, 
  db_column_name,
  column_type, 
  is_masterdata, 
  category,
  display_order,
  role_permissions
) VALUES (
  'Room Number (Shared)',
  'room_number_shared',
  'number',
  false,
  'OMC',
  (SELECT COALESCE(MAX(display_order), 0) + 1 FROM public.column_config),
  '{"hr_admin":{"view":true,"edit":true},"sodexo":{"view":false,"edit":false},"omc":{"view":true,"edit":true},"payroll":{"view":false,"edit":false},"toplux":{"view":false,"edit":false}}'::jsonb
)
ON CONFLICT (db_column_name, is_masterdata) DO NOTHING;

-- Column: Dietary Requirement?
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS dietary_requirement TEXT;

COMMENT ON COLUMN public.employees.dietary_requirement IS 
  'Dietary Requirement? - OMC field';

CREATE INDEX IF NOT EXISTS idx_employees_dietary_requirement 
ON public.employees(dietary_requirement);

INSERT INTO public.column_config (
  column_name, 
  db_column_name,
  column_type, 
  is_masterdata, 
  category,
  display_order,
  role_permissions
) VALUES (
  'Dietary Requirement?',
  'dietary_requirement',
  'text',
  false,
  'OMC',
  (SELECT COALESCE(MAX(display_order), 0) + 1 FROM public.column_config),
  '{"hr_admin":{"view":true,"edit":true},"sodexo":{"view":false,"edit":false},"omc":{"view":true,"edit":true},"payroll":{"view":false,"edit":false},"toplux":{"view":false,"edit":false}}'::jsonb
)
ON CONFLICT (db_column_name, is_masterdata) DO NOTHING;

-- Column: Joining Instructions sent
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS joining_instructions_sent BOOLEAN;

COMMENT ON COLUMN public.employees.joining_instructions_sent IS 
  'Joining Instructions sent - OMC field';

CREATE INDEX IF NOT EXISTS idx_employees_joining_instructions_sent 
ON public.employees(joining_instructions_sent);

INSERT INTO public.column_config (
  column_name, 
  db_column_name,
  column_type, 
  is_masterdata, 
  category,
  display_order,
  role_permissions
) VALUES (
  'Joining Instructions sent',
  'joining_instructions_sent',
  'boolean',
  false,
  'OMC',
  (SELECT COALESCE(MAX(display_order), 0) + 1 FROM public.column_config),
  '{"hr_admin":{"view":true,"edit":true},"sodexo":{"view":false,"edit":false},"omc":{"view":true,"edit":true},"payroll":{"view":false,"edit":false},"toplux":{"view":false,"edit":false}}'::jsonb
)
ON CONFLICT (db_column_name, is_masterdata) DO NOTHING;

-- Column: Candidate Confirmed
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS candidate_confirmed BOOLEAN;

COMMENT ON COLUMN public.employees.candidate_confirmed IS 
  'Candidate Confirmed - OMC field';

CREATE INDEX IF NOT EXISTS idx_employees_candidate_confirmed 
ON public.employees(candidate_confirmed);

INSERT INTO public.column_config (
  column_name, 
  db_column_name,
  column_type, 
  is_masterdata, 
  category,
  display_order,
  role_permissions
) VALUES (
  'Candidate Confirmed',
  'candidate_confirmed',
  'boolean',
  false,
  'OMC',
  (SELECT COALESCE(MAX(display_order), 0) + 1 FROM public.column_config),
  '{"hr_admin":{"view":true,"edit":true},"sodexo":{"view":false,"edit":false},"omc":{"view":true,"edit":true},"payroll":{"view":false,"edit":false},"toplux":{"view":false,"edit":false}}'::jsonb
)
ON CONFLICT (db_column_name, is_masterdata) DO NOTHING;

-- Column: Seably
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS seably_status BOOLEAN;

COMMENT ON COLUMN public.employees.seably_status IS 
  'Seably - OMC field';

CREATE INDEX IF NOT EXISTS idx_employees_seably_status 
ON public.employees(seably_status);

INSERT INTO public.column_config (
  column_name, 
  db_column_name,
  column_type, 
  is_masterdata, 
  category,
  display_order,
  role_permissions
) VALUES (
  'Seably',
  'seably_status',
  'boolean',
  false,
  'OMC',
  (SELECT COALESCE(MAX(display_order), 0) + 1 FROM public.column_config),
  '{"hr_admin":{"view":true,"edit":true},"sodexo":{"view":false,"edit":false},"omc":{"view":true,"edit":true},"payroll":{"view":false,"edit":false},"toplux":{"view":false,"edit":false}}'::jsonb
)
ON CONFLICT (db_column_name, is_masterdata) DO NOTHING;

-- Column: Receipt C-17
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS receipt_c17 BOOLEAN;

COMMENT ON COLUMN public.employees.receipt_c17 IS 
  'Receipt C-17 - OMC field';

CREATE INDEX IF NOT EXISTS idx_employees_receipt_c17 
ON public.employees(receipt_c17);

INSERT INTO public.column_config (
  column_name, 
  db_column_name,
  column_type, 
  is_masterdata, 
  category,
  display_order,
  role_permissions
) VALUES (
  'Receipt C-17',
  'receipt_c17',
  'boolean',
  false,
  'OMC',
  (SELECT COALESCE(MAX(display_order), 0) + 1 FROM public.column_config),
  '{"hr_admin":{"view":true,"edit":true},"sodexo":{"view":false,"edit":false},"omc":{"view":true,"edit":true},"payroll":{"view":false,"edit":false},"toplux":{"view":false,"edit":false}}'::jsonb
)
ON CONFLICT (db_column_name, is_masterdata) DO NOTHING;

-- Column: C-17 Certificate
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS certificate_c17 BOOLEAN;

COMMENT ON COLUMN public.employees.certificate_c17 IS 
  'C-17 Certificate - OMC field';

CREATE INDEX IF NOT EXISTS idx_employees_certificate_c17 
ON public.employees(certificate_c17);

INSERT INTO public.column_config (
  column_name, 
  db_column_name,
  column_type, 
  is_masterdata, 
  category,
  display_order,
  role_permissions
) VALUES (
  'C-17 Certificate',
  'certificate_c17',
  'boolean',
  false,
  'OMC',
  (SELECT COALESCE(MAX(display_order), 0) + 1 FROM public.column_config),
  '{"hr_admin":{"view":true,"edit":true},"sodexo":{"view":false,"edit":false},"omc":{"view":true,"edit":true},"payroll":{"view":false,"edit":false},"toplux":{"view":false,"edit":false}}'::jsonb
)
ON CONFLICT (db_column_name, is_masterdata) DO NOTHING;

-- Column: Receipt C-18
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS receipt_c18 BOOLEAN;

COMMENT ON COLUMN public.employees.receipt_c18 IS 
  'Receipt C-18 - OMC field';

CREATE INDEX IF NOT EXISTS idx_employees_receipt_c18 
ON public.employees(receipt_c18);

INSERT INTO public.column_config (
  column_name, 
  db_column_name,
  column_type, 
  is_masterdata, 
  category,
  display_order,
  role_permissions
) VALUES (
  'Receipt C-18',
  'receipt_c18',
  'boolean',
  false,
  'OMC',
  (SELECT COALESCE(MAX(display_order), 0) + 1 FROM public.column_config),
  '{"hr_admin":{"view":true,"edit":true},"sodexo":{"view":false,"edit":false},"omc":{"view":true,"edit":true},"payroll":{"view":false,"edit":false},"toplux":{"view":false,"edit":false}}'::jsonb
)
ON CONFLICT (db_column_name, is_masterdata) DO NOTHING;

-- Column: C-18 Certificate
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS certificate_c18 BOOLEAN;

COMMENT ON COLUMN public.employees.certificate_c18 IS 
  'C-18 Certificate - OMC field';

CREATE INDEX IF NOT EXISTS idx_employees_certificate_c18 
ON public.employees(certificate_c18);

INSERT INTO public.column_config (
  column_name, 
  db_column_name,
  column_type, 
  is_masterdata, 
  category,
  display_order,
  role_permissions
) VALUES (
  'C-18 Certificate',
  'certificate_c18',
  'boolean',
  false,
  'OMC',
  (SELECT COALESCE(MAX(display_order), 0) + 1 FROM public.column_config),
  '{"hr_admin":{"view":true,"edit":true},"sodexo":{"view":false,"edit":false},"omc":{"view":true,"edit":true},"payroll":{"view":false,"edit":false},"toplux":{"view":false,"edit":false}}'::jsonb
)
ON CONFLICT (db_column_name, is_masterdata) DO NOTHING;

-- Column: ÖMC Certificate
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS omc_certificate BOOLEAN;

COMMENT ON COLUMN public.employees.omc_certificate IS 
  'ÖMC Certificate - OMC field';

CREATE INDEX IF NOT EXISTS idx_employees_omc_certificate 
ON public.employees(omc_certificate);

INSERT INTO public.column_config (
  column_name, 
  db_column_name,
  column_type, 
  is_masterdata, 
  category,
  display_order,
  role_permissions
) VALUES (
  'ÖMC Certificate',
  'omc_certificate',
  'boolean',
  false,
  'OMC',
  (SELECT COALESCE(MAX(display_order), 0) + 1 FROM public.column_config),
  '{"hr_admin":{"view":true,"edit":true},"sodexo":{"view":false,"edit":false},"omc":{"view":true,"edit":true},"payroll":{"view":false,"edit":false},"toplux":{"view":false,"edit":false}}'::jsonb
)
ON CONFLICT (db_column_name, is_masterdata) DO NOTHING;

-- Column: Uploaded in CrewSF
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS uploaded_in_crewsf BOOLEAN;

COMMENT ON COLUMN public.employees.uploaded_in_crewsf IS 
  'Uploaded in CrewSF - OMC field';

CREATE INDEX IF NOT EXISTS idx_employees_uploaded_in_crewsf 
ON public.employees(uploaded_in_crewsf);

INSERT INTO public.column_config (
  column_name, 
  db_column_name,
  column_type, 
  is_masterdata, 
  category,
  display_order,
  role_permissions
) VALUES (
  'Uploaded in CrewSF',
  'uploaded_in_crewsf',
  'boolean',
  false,
  'OMC',
  (SELECT COALESCE(MAX(display_order), 0) + 1 FROM public.column_config),
  '{"hr_admin":{"view":true,"edit":true},"sodexo":{"view":false,"edit":false},"omc":{"view":true,"edit":true},"payroll":{"view":false,"edit":false},"toplux":{"view":false,"edit":false}}'::jsonb
)
ON CONFLICT (db_column_name, is_masterdata) DO NOTHING;

-- Column: Completed
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS completed BOOLEAN;

COMMENT ON COLUMN public.employees.completed IS 
  'Completed - OMC field';

CREATE INDEX IF NOT EXISTS idx_employees_completed 
ON public.employees(completed);

INSERT INTO public.column_config (
  column_name, 
  db_column_name,
  column_type, 
  is_masterdata, 
  category,
  display_order,
  role_permissions
) VALUES (
  'Completed',
  'completed',
  'boolean',
  false,
  'OMC',
  (SELECT COALESCE(MAX(display_order), 0) + 1 FROM public.column_config),
  '{"hr_admin":{"view":true,"edit":true},"sodexo":{"view":false,"edit":false},"omc":{"view":true,"edit":true},"payroll":{"view":false,"edit":false},"toplux":{"view":false,"edit":false}}'::jsonb
)
ON CONFLICT (db_column_name, is_masterdata) DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  toplux_count INTEGER;
  payroll_count INTEGER;
  omc_count INTEGER;
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO toplux_count FROM public.column_config WHERE category = 'Toplux';
  SELECT COUNT(*) INTO payroll_count FROM public.column_config WHERE category = 'Payroll';
  SELECT COUNT(*) INTO omc_count FROM public.column_config WHERE category = 'OMC';
  SELECT COUNT(*) INTO total_count FROM public.column_config WHERE is_masterdata = false;
  
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Toplux columns added: %', toplux_count;
  RAISE NOTICE 'Payroll columns added: %', payroll_count;
  RAISE NOTICE 'OMC columns added: %', omc_count;
  RAISE NOTICE 'Total custom columns: %', total_count;
  RAISE NOTICE '============================================';
  RAISE NOTICE 'All columns have been added to:';
  RAISE NOTICE '  1. employees table (with indexes)';
  RAISE NOTICE '  2. column_config table (with permissions)';
  RAISE NOTICE '============================================';
END $$;

COMMIT;
