-- migration: 0010_rls_delegations.sql

-- ============================================================================
-- DELEGATIONS TABLE ROW LEVEL SECURITY POLICIES
-- ============================================================================
-- Security Model:
-- - ALL authenticated users can view delegations (transparency)
-- - ONLY approvers can create delegations
-- - ADMIN role has full bypass access
-- ============================================================================

ALTER TABLE public.delegations ENABLE ROW LEVEL SECURITY;

-- Everyone can view delegations for transparency
CREATE POLICY "authenticated_can_view_delegations"
ON public.delegations
FOR SELECT
TO authenticated
USING (true);

-- Only approvers can create delegations
CREATE POLICY "approvers_can_insert_delegations"
ON public.delegations
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'APPROVER'
  )
);

-- Admin can bypass all operations on delegations
CREATE POLICY "admin_full_bypass_delegations"
ON public.delegations
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'ADMIN'
  )
);
