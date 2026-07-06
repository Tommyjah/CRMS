-- migration: 0009_delegations_free_text.sql

ALTER TABLE public.delegations
  ALTER COLUMN to_user_id TYPE text,
  DROP CONSTRAINT IF EXISTS delegations_to_user_id_fkey;

COMMENT ON COLUMN public.delegations.to_user_id IS 'Delegatee name/email (free text for simplicity)';
