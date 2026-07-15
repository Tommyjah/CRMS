-- migration: 0015_add_coordinates_to_attachments.sql

ALTER TABLE public.request_attachments
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7);

CREATE INDEX IF NOT EXISTS idx_request_attachments_latitude
  ON public.request_attachments(latitude);

CREATE INDEX IF NOT EXISTS idx_request_attachments_longitude
  ON public.request_attachments(longitude);
