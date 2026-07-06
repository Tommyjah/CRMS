-- migration: 0007_add_change_type.sql

ALTER TABLE public.change_requests
  ADD COLUMN IF NOT EXISTS change_type TEXT;

COMMENT ON COLUMN public.change_requests.change_type IS 'Type of change: Route Change, Scope Change, Soil Type Change, Damage Change, Additional Work, Rework, Others';
