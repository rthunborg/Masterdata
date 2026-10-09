-- Add room-assignment employee columns required by Story 8.20.
-- This fills the migration gap before the boolean hardening migration that
-- expects hotel_required to exist.
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS hotel_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS room_number_shared INTEGER;

COMMENT ON COLUMN public.employees.hotel_required IS
  'Whether the employee requires hotel accommodation for OMC training.';

COMMENT ON COLUMN public.employees.room_number_shared IS
  'Shared hotel room number assigned for OMC training accommodation.';

CREATE INDEX IF NOT EXISTS idx_employees_omc_hotel_required
ON public.employees(omc_date, hotel_required)
WHERE hotel_required = true;
