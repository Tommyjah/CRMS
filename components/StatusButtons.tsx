'use client'

import { useState } from 'react'
import { updateRequestStatus } from '@/app/actions'

type StatusButtonsProps = {
  requestId: string
  status: string | null
  userProfile: {
    department: string | null
    role: string | null
    email?: string | null
  } | null
  onRejected?: () => void
  approverEmail?: string | null
}

export default function StatusButtons({ requestId, status, userProfile, onRejected, approverEmail }: StatusButtonsProps) {
  const [loading, setLoading] = useState(false)

  if (status === 'APPROVED' || status === 'REJECTED' || status === 'DRAFT') return null

  const currentUserDept = userProfile?.department?.trim().toUpperCase()
  const currentUserEmail = userProfile?.email?.trim().toLowerCase() ?? null

  const allowedDeptMap: Record<string, string> = {
    PENDING_DEPT_1: 'FIXED NETWORK',
    PENDING_DEPT_2: 'WIRE LINE PLANNING',
    PENDING_DEPT_3: 'ENGINEERING',
  }

  const targetDept = allowedDeptMap[status ?? '']
  const isDepartmentMatch = !!currentUserDept && !!targetDept && currentUserDept === targetDept

  const normalizedApproverEmail = approverEmail?.trim().toLowerCase() ?? null
  const isAssignedApprover = !!currentUserEmail && !!normalizedApproverEmail && currentUserEmail === normalizedApproverEmail

  const canTakeAction = isDepartmentMatch || isAssignedApprover

  if (!userProfile) {
    return (
      <div className="flex gap-2">
        <button type="button" disabled className="h-9 w-24 animate-pulse rounded-lg bg-slate-100 dark:bg-zinc-800/50" />
        <button type="button" disabled className="h-9 w-16 animate-pulse rounded-lg bg-slate-100 dark:bg-zinc-800/50" />
      </div>
    )
  }

  const handleStatusUpdate = async (action: 'APPROVE' | 'REJECT') => {
    setLoading(true)
    try {
      const result = await updateRequestStatus(requestId, action)

      if (result?.error) {
        alert(result.error)
        return
      }

      if (action === 'REJECT') {
        onRejected?.()
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => handleStatusUpdate('APPROVE')}
        disabled={loading || !canTakeAction}
        className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          canTakeAction && !loading
            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
            : 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-zinc-800/50 dark:text-zinc-500'
        }`}
      >
        {loading ? 'Processing…' : 'Approve'}
      </button>
      <button
        type="button"
        onClick={() => handleStatusUpdate('REJECT')}
        disabled={loading || !canTakeAction}
        className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          canTakeAction && !loading
            ? 'bg-rose-600 text-white hover:bg-rose-700'
            : 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-zinc-800/50 dark:text-zinc-500'
        }`}
      >
        Reject
      </button>
    </div>
  )
}