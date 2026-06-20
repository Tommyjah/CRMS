'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { ChangeRequest } from '@/lib/supabase/client'
import { updateRequestStatus } from '@/app/actions' // 🔥 Connects to your sequential server action engine

export type RequestWithAudit = ChangeRequest

export const ROLE_ACCESS: Record<
  string,
  { department: string | null; canApprove: boolean; locked: boolean; label: string }
> = {
  DRAFT: { department: null, canApprove: false, locked: false, label: 'Initiator' },
  PENDING_DEPT_1: {
    department: 'Fixed Network',
    canApprove: true,
    locked: true,
    label: 'Fixed Network Review',
  },
  PENDING_DEPT_2: {
    department: 'Wire Line Planning',
    canApprove: true,
    locked: true,
    label: 'Wire Line Planning Review',
  },
  PENDING_DEPT_3: {
    department: 'Engineering',
    canApprove: true,
    locked: true,
    label: 'Engineering Review',
  },
  APPROVED: { department: null, canApprove: false, locked: true, label: 'Approved' },
  REJECTED: { department: null, canApprove: false, locked: true, label: 'Rejected' },
}

function calculateLagHours(request: RequestWithAudit): number {
  const baseTime = request.created_at ? new Date(request.created_at).getTime() : Date.now()

  return (
    (Date.now() - baseTime) /
    (1000 * 60 * 60)
  )
}

export function useChangeRequests() {
  const [data, setData] = useState<RequestWithAudit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const pendingApprovals = useRef<Set<string>>(new Set())

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 4000)
  }

  // 1. Clean, unfiltered select query leveraging global Option B visibility rules
  const fetchRequests = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: dbData, error: dbError } = await supabase
        .from('change_requests')
        .select('*')
        .order('created_at', { ascending: false })

      if (dbError) throw dbError
      
      // FIX: Changed from setRequests to the actual state setter setData
      setData((dbData as RequestWithAudit[]) || [])
    } catch (err) {
      console.error('[useChangeRequests] Error fetching requests:', err)
      setError(err instanceof Error ? err.message : 'Failed to load requests')
    } finally {
      setLoading(false)
    }
  }

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchRequests()
  }, [])

  // 2. Upgraded to call the secure sequential approval pipeline backend action
  const approve = async (id: string) => {
    if (pendingApprovals.current.has(id)) return

    const request = data.find((r) => r.id === id)
    if (!request) return

    const access = ROLE_ACCESS[request.status ?? '']
    if (!access?.canApprove) {
      showToast('This request cannot be approved from its current status')
      return
    }

    pendingApprovals.current.add(id)

    try {
      // Direct call to your sequential state engine action
      const result = await updateRequestStatus(id, 'APPROVE')

      if (result.error) {
        setError(result.error)
        showToast(result.error)
      } else {
        showToast('Request advanced to the next stage successfully')
        await fetchRequests() // Fresh pull of updated global statuses
      }
    } catch (err) {
      console.error('[useChangeRequests] Approval error:', err)
      setError('An unexpected error occurred during approval.')
    } finally {
      pendingApprovals.current.delete(id)
    }
  }

  // 3. Optional: Added clear pipeline rejection handler
  const reject = async (id: string) => {
    if (pendingApprovals.current.has(id)) return
    pendingApprovals.current.add(id)

    try {
      const result = await updateRequestStatus(id, 'REJECT')
      if (result.error) {
        setError(result.error)
        showToast(result.error)
      } else {
        showToast('Request rejected successfully.')
        await fetchRequests()
      }
    } catch (err) {
      console.error('[useChangeRequests] Rejection error:', err)
    } finally {
      pendingApprovals.current.delete(id)
    }
  }

  const updateStatus = async (
    id: string,
    updates: { status?: string | null },
  ) => {
    // Only allow DRAFT status edits for non-approvers
    // For approvals, use the approve() function which handles department checks
    if (updates.status && updates.status !== 'DRAFT') {
      showToast('Use the Approve button to advance requests through the workflow')
      return
    }

    const previous = data
    setData((prev) =>
      prev.map((req) => (req.id === id ? { ...req, ...updates } : req)),
    )

    const { error: dbError } = await supabase
      .from('change_requests')
      .update(updates)
      .eq('id', id)

    if (dbError) {
      setData(previous)
      setError(dbError.message)
    } else {
      const statusLabel = updates.status ?? 'DRAFT'
      showToast(`Status updated to ${statusLabel}`)
      await fetchRequests()
    }
  }

  return {
    data,
    loading,
    error,
    toast,
    refetch: fetchRequests,
    approve,
    reject, // Exposed for interface button bindings
    updateStatus,
    calculateLagHours: (request: RequestWithAudit) =>
      calculateLagHours(request),
    ROLE_ACCESS,
  }
}