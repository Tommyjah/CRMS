'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { ChangeRequest } from '@/lib/supabase/client'
import { updateRequestStatus, getFilteredChangeRequests, type RequestFilters } from '@/app/actions'

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
  PENDING_INITIATOR_REVIEW: {
    department: 'Initiator',
    canApprove: false,
    locked: false,
    label: 'Back to Initiator',
  },
  APPROVED: { department: null, canApprove: false, locked: true, label: 'Approved' },
  REJECTED: { department: null, canApprove: false, locked: true, label: 'Rejected' },
}

function calculateLagHours(request: RequestWithAudit): number {
  const baseTime = request.created_at ? new Date(request.created_at).getTime() : Date.now()
  return (Date.now() - baseTime) / (1000 * 60 * 60)
}

export function useChangeRequests(filters?: RequestFilters) {
  const [data, setData] = useState<RequestWithAudit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const pendingApprovals = useRef<Set<string>>(new Set())

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 4000)
  }

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (filters) {
        const params = { ...filters, page: filters.page ?? 1 }
        const result = await getFilteredChangeRequests(params)
        if (result?.error) {
          setError(result.error)
          setData([])
          setTotalCount(0)
          setTotalPages(0)
        } else {
          setData(result.data)
          setTotalCount(result.totalCount)
          setTotalPages(result.totalPages)
        }
      } else {
        const { data: dbData, error: dbError } = await supabase
          .from('change_requests')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })

        if (dbError) throw dbError
        setData((dbData as ChangeRequest[]) || [])
        setTotalCount(dbData?.length ?? 0)
        setTotalPages(0)
      }
    } catch (err) {
      console.error('[useChangeRequests] Error fetching requests:', err)
      setError(err instanceof Error ? err.message : 'Failed to load requests')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    // Data fetching pattern: intentionally triggers state updates on mount/dependency change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRequests()
  }, [fetchRequests])

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
      const result = await updateRequestStatus(id, 'APPROVE')
      if (result?.error) {
        setError(result.error)
        showToast(result.error)
      } else {
        showToast('Request approved and advanced to the next stage')
        await fetchRequests()
      }
    } catch (err) {
      console.error('[useChangeRequests] Approval error:', err)
      const message = err instanceof Error ? err.message : 'An unexpected error occurred during approval.'
      setError(message)
      showToast(message)
    } finally {
      pendingApprovals.current.delete(id)
    }
  }

  const reject = async (id: string) => {
    if (pendingApprovals.current.has(id)) return
    pendingApprovals.current.add(id)
    try {
      const result = await updateRequestStatus(id, 'REJECT')
      if (result?.error) {
        setError(result.error)
        showToast(result.error)
      } else {
        showToast('Request rejected successfully')
        await fetchRequests()
      }
    } catch (err) {
      console.error('[useChangeRequests] Rejection error:', err)
      const message = err instanceof Error ? err.message : 'An unexpected error occurred during rejection.'
      setError(message)
      showToast(message)
    } finally {
      pendingApprovals.current.delete(id)
    }
  }

  const updateStatus = async (
    id: string,
    updates: { status?: string | null },
  ) => {
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
    totalCount,
    totalPages,
    refetch: fetchRequests,
    approve,
    reject,
    updateStatus,
    calculateLagHours: (request: RequestWithAudit) =>
      calculateLagHours(request),
    ROLE_ACCESS,
  }
}
