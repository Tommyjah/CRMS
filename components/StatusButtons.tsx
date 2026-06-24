'use client'

import { useState, useCallback } from 'react'
import { updateRequestStatus } from '@/app/actions'
import { isDepartmentResponsible } from '@/lib/security-constants'
import { isStatus, isRole } from '@/lib/constants'

type StatusButtonsProps = {
  requestId: string
  status: string | null
  userProfile: {
    department: string | null
    role: string | null
    email?: string | null
  } | null
  onSuccess?: () => void
  onRejected?: () => void
  approverEmail?: string | null
}

const FINAL_STATUSES: readonly string[] = ['APPROVED', 'REJECTED', 'DRAFT']

export default function StatusButtons({ requestId, status, userProfile, onSuccess, onRejected, approverEmail }: StatusButtonsProps) {
  const [loading, setLoading] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const handleStatusUpdate = useCallback(async (action: 'APPROVE' | 'REJECT') => {
    setLoading(true)
    setLocalError(null)

    try {
      const result = await updateRequestStatus(requestId, action)

      if (result?.error) {
        setLocalError(result.error)
        return
      }

      if (action === 'REJECT') {
        onRejected?.()
      }

      onSuccess?.()
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setLoading(false)
    }
  }, [requestId, onSuccess, onRejected])

  if (FINAL_STATUSES.includes(status ?? '')) return null

  const isApprover = isRole(userProfile?.role) && userProfile.role === 'APPROVER'

  const safeStatus = isStatus(status) ? status : null
  const isResponsible = safeStatus !== null && isDepartmentResponsible(safeStatus, userProfile?.department ?? null)
  const isAssignedApprover =
    !!userProfile?.email?.trim().toLowerCase() &&
    !!approverEmail?.trim().toLowerCase() &&
    userProfile.email.trim().toLowerCase() === approverEmail.trim().toLowerCase()

  const canTakeAction = isApprover && (isResponsible || isAssignedApprover)

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleStatusUpdate('APPROVE')}
          disabled={loading || !canTakeAction}
          title={!canTakeAction ? 'You are not authorized to approve this request' : undefined}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
            canTakeAction && !loading
              ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
              : 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-zinc-800/50 dark:text-zinc-500'
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          {loading ? 'Processing…' : 'Approve'}
        </button>
        <button
          type="button"
          onClick={() => handleStatusUpdate('REJECT')}
          disabled={loading || !canTakeAction}
          title={!canTakeAction ? 'You are not authorized to reject this request' : undefined}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
            canTakeAction && !loading
              ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm'
              : 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-zinc-800/50 dark:text-zinc-500'
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Reject
        </button>
      </div>
      {localError && (
        <span className="text-xs text-rose-600 dark:text-rose-400">{localError}</span>
      )}
    </div>
  )
}
