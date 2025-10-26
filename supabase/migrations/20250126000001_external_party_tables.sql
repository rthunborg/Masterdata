-- External Party Custom Data Tables
-- Migration: 20250126000001_external_party_tables.sql
-- Description: Create party-specific tables (sodexo_data, omc_data, payroll_data, toplux_data)

-- Sodexo data table
CREATE TABLE IF NOT EXISTS public.sodexo_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id)
);

CREATE INDEX IF NOT EXISTS idx_sodexo_data_employee ON public.sodexo_data(employee_id);
CREATE INDEX IF NOT EXISTS idx_sodexo_data_jsonb ON public.sodexo_data USING GIN(data);

CREATE TRIGGER update_sodexo_data_updated_at
  BEFORE UPDATE ON public.sodexo_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ÖMC data table
CREATE TABLE IF NOT EXISTS public.omc_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id)
);

CREATE INDEX IF NOT EXISTS idx_omc_data_employee ON public.omc_data(employee_id);
CREATE INDEX IF NOT EXISTS idx_omc_data_jsonb ON public.omc_data USING GIN(data);

CREATE TRIGGER update_omc_data_updated_at
  BEFORE UPDATE ON public.omc_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Payroll data table
CREATE TABLE IF NOT EXISTS public.payroll_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id)
);

CREATE INDEX IF NOT EXISTS idx_payroll_data_employee ON public.payroll_data(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_data_jsonb ON public.payroll_data USING GIN(data);

CREATE TRIGGER update_payroll_data_updated_at
  BEFORE UPDATE ON public.payroll_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Toplux data table
CREATE TABLE IF NOT EXISTS public.toplux_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id)
);

CREATE INDEX IF NOT EXISTS idx_toplux_data_employee ON public.toplux_data(employee_id);
CREATE INDEX IF NOT EXISTS idx_toplux_data_jsonb ON public.toplux_data USING GIN(data);

CREATE TRIGGER update_toplux_data_updated_at
  BEFORE UPDATE ON public.toplux_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
