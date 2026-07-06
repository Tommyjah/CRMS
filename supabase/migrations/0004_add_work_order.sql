-- migration: 0004_add_work_order.sql

ALTER TABLE public.change_requests
  ADD COLUMN IF NOT EXISTS work_order TEXT;

COMMENT ON COLUMN public.change_requests.work_order IS 'Optional Work Order (WO) reference number';
