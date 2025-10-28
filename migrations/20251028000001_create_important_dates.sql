-- Create important_dates table
CREATE TABLE IF NOT EXISTS public.important_dates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_number INTEGER,
  year INTEGER NOT NULL,
  category TEXT NOT NULL,
  date_description TEXT NOT NULL,
  date_value TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_important_dates_week ON public.important_dates(week_number, year);
CREATE INDEX IF NOT EXISTS idx_important_dates_category ON public.important_dates(category);

-- Add updated_at trigger
CREATE TRIGGER update_important_dates_updated_at
  BEFORE UPDATE ON public.important_dates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.important_dates ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Everyone can read important dates
CREATE POLICY "Everyone can read important dates" ON public.important_dates
  FOR SELECT USING (true);

-- RLS Policy: HR Admin can manage important dates
CREATE POLICY "HR Admin can manage important dates" ON public.important_dates
  FOR ALL USING (get_user_role() = 'hr_admin');
