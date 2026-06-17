import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { ChangeRequest, RequestAuditLog } from '@/lib/supabase'

export type RequestWithAudit = ChangeRequest

export const ROLE_ACCESS: Record<
  string,
  { department: string; canApprove: boolean; locked: boolean }
> = {
  DRAFT: { department: 'Initiator', canApprove: false, locked: false },
  PENDING_DEPT_1: {
    department: 'Fixed Network',
    canApprove: true,
    locked: true,
  },
  PENDING_DEPT_2: {
    department: 'Wire Line Planning',
    canApprove: true,
    locked: true,
  },
  PENDING_DEPT_3: {
    department: 'Engineering',
    canApprove: true,
    locked: true,
  },
  APPROVED: { department: 'Complete', canApprove: false, locked: true },
  REJECTED: { department: 'Complete', canApprove: false, locked: true },
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

  const fetchRequests = async () => {
    setLoading(true)
    setError(null)

    const { data, error: dbError } = await supabase
      .from('change_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (dbError) {
      setError(dbError.message)
      setData([])
    } else {
      setData((data as RequestWithAudit[]) ?? [])
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  const approve = async (id: string) => {
    if (pendingApprovals.current.has(id)) {
      return
    }

    const request = data.find((r) => r.id === id)
    if (!request) return

    const access = ROLE_ACCESS[request.status ?? '']
    if (!access?.canApprove) {
      showToast('This request cannot be approved from its current status')
      return
    }

    pendingApprovals.current.add(id)
    const previous = data
    setData((prev) => prev.filter((req) => req.id !== id))

    const { error: dbError } = await supabase
      .from('change_requests')
      .update({ status: 'APPROVED' })
      .eq('id', id)

    if (dbError) {
      setData(previous)
      setError(dbError.message)
      pendingApprovals.current.delete(id)
    } else {
      showToast('Request approved successfully')
      await fetchRequests()
      pendingApprovals.current.delete(id)
    }
  }

  const updateStatus = async (
    id: string,
    updates: { status?: string | null },
  ) => {
    const request = data.find((r) => r.id === id)
    const newStatus = updates.status ?? request?.status ?? 'DRAFT'
    const isLocked = request
      ? ROLE_ACCESS[request.status ?? '']?.locked
      : false

    if (request && isLocked && request.status !== newStatus) {
      const targetAccess = ROLE_ACCESS[newStatus]
      if (!targetAccess?.canApprove && newStatus !== 'DRAFT') {
        showToast(
          'Request is locked. Resetting to DRAFT for re-submission.',
        )
        updates.status = 'DRAFT'
      }
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
      const statusLabel = updates.status ?? newStatus
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
    updateStatus,
    calculateLagHours: (request: RequestWithAudit) =>
      calculateLagHours(request),
    ROLE_ACCESS,
  }
}
