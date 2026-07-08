-- migration: 0013_enable_rls_request_attachments.sql

ALTER TABLE public.request_attachments ENABLE ROW LEVEL SECURITY;
