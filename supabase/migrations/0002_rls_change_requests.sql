-- ============================================================================
-- CRMS SECURITY MODEL: Row Level Security Policies v2
-- ============================================================================
-- Security Model:
-- - ALL authenticated users can SELECT * FROM change_requests (transparency)
-- - ONLY responsible department can APPROVE (status-specific check)
-- - ANY APPROVER can REJECT (immediate pipeline stop)
-- - ADMIN role has full bypass access
-- - DRAFT status is special: only creator/department can set
-- ============================================================================

-- Enable Row Level Security on all tables
ALTER TABLE public.change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CHANGE_REQUESTS TABLE POLICIES
-- ============================================================================

-- Allow all authenticated users to view all change requests (transparency/accountability)
CREATE POLICY "authenticated_can_view_all_requests" 
ON public.change_requests 
FOR SELECT 
TO authenticated 
USING (true);

-- Allow only the responsible department to advance requests through approval stages
-- PENDING_DEPT_1 -> Fixed Network approvers
CREATE POLICY "fixed_network_can_approve" 
ON public.change_requests 
FOR UPDATE 
TO authenticated 
USING (
  status = 'PENDING_DEPT_1' 
  AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.department = 'Fixed Network' 
    AND p.role = 'APPROVER'
  )
);

-- PENDING_DEPT_2 -> Wire Line Planning approvers  
CREATE POLICY "wire_line_planning_can_approve" 
ON public.change_requests 
FOR UPDATE 
TO authenticated 
USING (
  status = 'PENDING_DEPT_2' 
  AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.department = 'Wire Line Planning' 
    AND p.role = 'APPROVER'
  )
);

-- PENDING_DEPT_3 -> Engineering approvers
CREATE POLICY "engineering_can_approve" 
ON public.change_requests 
FOR UPDATE 
TO authenticated 
USING (
  status = 'PENDING_DEPT_3' 
  AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.department = 'Engineering' 
    AND p.role = 'APPROVER'
  )
);

-- Allow any approver to reject (documented accountability - stops pipeline immediately)
CREATE POLICY "approvers_can_reject_active" 
ON public.change_requests 
FOR UPDATE 
TO authenticated 
USING (
  status IN ('PENDING_DEPT_1', 'PENDING_DEPT_2', 'PENDING_DEPT_3')
  AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'APPROVER'
  )
);

-- ADMIN override: Full access to all tables
CREATE POLICY "admin_full_bypass_change_requests" 
ON public.change_requests 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'ADMIN'
  )
);

-- Allow Initiators/Requesters to create new change requests
CREATE POLICY "initiators_can_insert" 
ON public.change_requests 
FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('INITIATOR', 'REQUESTER')
  )
);

-- ============================================================================
-- REQUEST_ACTIVITIES TABLE POLICIES
-- ============================================================================

-- Everyone can view activities for transparency
CREATE POLICY "authenticated_can_view_activities" 
ON public.request_activities 
FOR SELECT 
TO authenticated 
USING (true);

-- Only the request creator can add activities
CREATE POLICY "creator_can_insert_activities" 
ON public.request_activities 
FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.change_requests cr 
    WHERE cr.id = request_id 
    AND cr.user_id = auth.uid()
  )
);

-- Admin can insert any activities
CREATE POLICY "admin_full_bypass_activities" 
ON public.request_activities 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'ADMIN'
  )
);

-- ============================================================================
-- REQUEST_AUDIT_LOG TABLE POLICIES
-- ============================================================================

-- Everyone can view audit logs for transparency
CREATE POLICY "authenticated_can_view_audit_logs" 
ON public.request_audit_log 
FOR SELECT 
TO authenticated 
USING (true);

-- Only service_role (server-side) can insert - clients cannot write directly
-- This is enforced via Supabase service_role key in server actions

-- Admin can bypass (via service_role in practice, but having this for completeness)
CREATE POLICY "admin_full_bypass_audit_logs" 
ON public.request_audit_log 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'ADMIN'
  )
);

-- ============================================================================
-- DEPARTMENTS TABLE POLICIES
-- ============================================================================

-- Everyone can view departments
CREATE POLICY "authenticated_can_view_departments" 
ON public.departments 
FOR SELECT 
TO authenticated 
USING (true);

-- ============================================================================
-- PROFILES TABLE POLICIES
-- ============================================================================

-- Everyone can view profiles (for accountability/contact)
CREATE POLICY "authenticated_can_view_profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (true);

-- Users can update their own profile
CREATE POLICY "user_can_update_own_profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated 
USING (id = auth.uid());

-- Users can insert their own profile (handled by signup flow)
CREATE POLICY "user_can_insert_own_profile" 
ON public.profiles 
FOR INSERT 
TO authenticated 
WITH CHECK (id = auth.uid());

-- Admin can update any profile
CREATE POLICY "admin_can_update_profiles" 
ON public.profiles 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'ADMIN'
  )
);

-- ============================================================================
-- EDGE CASE NOTES:
-- ============================================================================
-- 1. APPROVED/REJECTED status: No UPDATE policies match these, so they cannot be 
--    modified after finalization (implicit security via policy absence)
-- 2. REJECTION: Any APPROVER can reject from any active stage - this is intentional
--    for documented accountability and immediate pipeline stop
-- 3. ADMIN bypass: Admin role has FOR ALL access to critical tables for emergency fixes
-- 4. Service role bypass: Server actions use service_role key for audit log writes,
--    bypassing these RLS policies entirely