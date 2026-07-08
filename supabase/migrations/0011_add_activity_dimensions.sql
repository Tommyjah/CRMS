-- migration: 0011_add_activity_dimensions.sql

ALTER TABLE public.request_activities
  ADD COLUMN IF NOT EXISTS length NUMERIC,
  ADD COLUMN IF NOT EXISTS width NUMERIC,
  ADD COLUMN IF NOT EXISTS depth NUMERIC;

COMMENT ON COLUMN public.request_activities.length IS 'Length dimension for the activity (e.g., meters)';
COMMENT ON COLUMN public.request_activities.width IS 'Width dimension for the activity (e.g., meters)';
COMMENT ON COLUMN public.request_activities.depth IS 'Depth dimension for the activity (e.g., meters)';
