-- migration: 0008_add_delegations.sql

CREATE TABLE IF NOT EXISTS public.delegations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.change_requests(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL REFERENCES public.profiles(id),
  to_user_id uuid NOT NULL REFERENCES public.profiles(id),
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delegations_request_id ON public.delegations(request_id);
CREATE INDEX IF NOT EXISTS idx_delegations_from_user_id ON public.delegations(from_user_id);
CREATE INDEX IF NOT EXISTS idx_delegations_to_user_id ON public.delegations(to_user_id);
CREATE INDEX IF NOT EXISTS idx_delegations_status ON public.delegations(status);
