-- migration: 0005_add_change_number.sql

CREATE TABLE IF NOT EXISTS public.change_number_counters (
  id TEXT PRIMARY KEY DEFAULT 'global',
  current_value INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.change_number_counters (id, current_value)
VALUES ('global', 0)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.change_requests
  ADD COLUMN IF NOT EXISTS change_number TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_change_requests_change_number
  ON public.change_requests(change_number)
  WHERE change_number IS NOT NULL;
