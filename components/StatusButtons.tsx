'use client'

import { useState } from 'react'
import { updateRequestStatus } from '@/app/actions'

type StatusButtonsProps = {
  requestId: string
  status: string | null
  userProfile: {
    department: string | null
    role: string | null
  } | null
  onRejected?: () => void
}

export default function StatusButtons({ requestId, status, userProfile, onRejected }: StatusButtonsProps) {
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
  const isTargetApprover =
    currentUserRole === 'APPROVER' &&
    !!currentUserDept &&
    !!targetDept &&
    currentUserDept === targetDept

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
        disabled={loading || !isTargetApprover}
        className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          isTargetApprover && !loading
            ? 'bg-green-600 text-white hover:bg-green-700'
            : 'cursor-not-allowed bg-gray-100 text-gray-400'
        }`}
      >
        {loading ? 'Processing…' : 'Approve'}
      </button>
      <button
        type="button"
        onClick={() => handleStatusUpdate('REJECT')}
        disabled={loading}
        className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Reject
      </button>
    </div>
  )
}