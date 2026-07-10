-- ============================================================================
-- RLS Policy: Initiator can update requests sent back for review
-- ============================================================================

CREATE POLICY "initiators_can_update_review_requests"
ON public.change_requests
FOR UPDATE
TO authenticated
USING (
  status = 'PENDING_INITIATOR_REVIEW'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('INITIATOR', 'REQUESTER')
    AND p.department = change_requests.initiated_by
  )
);
