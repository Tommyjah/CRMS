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

  // Hide buttons for final states
  if (status === 'APPROVED' || status === 'REJECTED' || status === 'DRAFT') return null

  // Defensive department matching logic
  const currentUserRole = userProfile?.role?.trim().toUpperCase()
  const currentUserDept = userProfile?.department?.trim().toUpperCase()

  const allowedDeptMap: Record<string, string> = {
    PENDING_DEPT_1: 'FIXED NETWORK',
    PENDING_DEPT_2: 'WIRE LINE PLANNING',
    PENDING_DEPT_3: 'ENGINEERING',
  }

  const targetDept = allowedDeptMap[status ?? '']
  const isAuthorizedApprover =
    currentUserRole === 'APPROVER' &&
    !!currentUserDept &&
    !!targetDept &&
    currentUserDept === targetDept

  const isAssignedApprover = approverEmail && userProfile?.email === approverEmail

  const canTakeAction = isAuthorizedApprover || isAssignedApprover

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
        className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
      >
        Reject
      </button>
    </div>
  )
}