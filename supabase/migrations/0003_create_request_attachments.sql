-- migration: 0003_create_request_attachments.sql

CREATE TABLE IF NOT EXISTS public.request_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.change_requests(id) ON DELETE CASCADE,
  original_filename TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL,
  version_number INTEGER NOT NULL DEFAULT 1,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_request_attachments_request_id
  ON public.request_attachments(request_id);

CREATE INDEX IF NOT EXISTS idx_request_attachments_request_filename
  ON public.request_attachments(request_id, original_filename);

ALTER TABLE public.request_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_can_view_attachments"
  ON public.request_attachments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated_can_insert_attachments"
  ON public.request_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated_can_update_own_attachments"
  ON public.request_attachments
  FOR UPDATE
  TO authenticated
  USING (uploaded_by = auth.uid());

CREATE POLICY "admin_can_manage_attachments"
  ON public.request_attachments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'ADMIN'
    )
  );
