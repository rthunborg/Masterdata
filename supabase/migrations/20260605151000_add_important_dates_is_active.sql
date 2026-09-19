-- Add archive/restore flag expected by important date APIs and E2E fixtures.
ALTER TABLE public.important_dates
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

UPDATE public.important_dates
SET is_active = true
WHERE is_active IS NULL;

ALTER TABLE public.important_dates
ALTER COLUMN is_active SET DEFAULT true,
ALTER COLUMN is_active SET NOT NULL;

COMMENT ON COLUMN public.important_dates.is_active IS
  'Soft-archive flag for important dates. false means archived/hidden from active date pickers.';

CREATE INDEX IF NOT EXISTS idx_important_dates_is_active
ON public.important_dates(is_active);
