'use client'

import { useState, useCallback } from 'react'
import { updateRequestStatus } from '@/app/actions'
import { isDepartmentResponsible } from '@/lib/security-constants'
import { isStatus, isRole } from '@/lib/constants'
import DelegateModal from './DelegateModal'
import EscalateModal from './EscalateModal'

type StatusButtonsProps = {
  requestId: string
  status: string | null
  userProfile: {
    department: string | null
    role: string | null
    email?: string | null
    full_name?: string | null
    id?: string | null
  } | null
  onSuccess?: () => void
  onRejected?: () => void
  approverEmail?: string | null
  initiatorName?: string | null
}

const FINAL_STATUSES: readonly string[] = ['APPROVED', 'REJECTED', 'DRAFT']

export default function StatusButtons({ requestId, status, userProfile, onSuccess, onRejected, approverEmail, initiatorName }: StatusButtonsProps) {
  const [loading, setLoading] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [showRejectReason, setShowRejectReason] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showDelegateModal, setShowDelegateModal] = useState(false)
  const [showEscalateModal, setShowEscalateModal] = useState(false)

  const handleStatusUpdate = useCallback(async (action: 'APPROVE' | 'REJECT') => {
    setLoading(true)
    setLocalError(null)

    try {
      const comment = action === 'REJECT' ? rejectReason.trim() || null : undefined
      const result = await updateRequestStatus(requestId, action, comment)

      if (result?.error) {
        setLocalError(result.error)
        return
      }

      if (action === 'REJECT') {
        setShowRejectReason(false)
        setRejectReason('')
        onRejected?.()
      }

      onSuccess?.()
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setLoading(false)
    }
  }, [requestId, onSuccess, onRejected, rejectReason])

  const handleDelegateSuccess = useCallback(() => {
    onSuccess?.()
    setShowDelegateModal(false)
  }, [onSuccess])

  const handleEscalateSuccess = useCallback(() => {
    onSuccess?.()
    setShowEscalateModal(false)
  }, [onSuccess])

  if (FINAL_STATUSES.includes(status ?? '')) return null

  const isApprover = isRole(userProfile?.role) && userProfile.role === 'APPROVER'

  const isInitiator =
    !!initiatorName &&
    !!userProfile?.full_name &&
    initiatorName.trim().toLowerCase() === userProfile.full_name.trim().toLowerCase()

  const safeStatus = isStatus(status) ? status : null
  const isResponsible = safeStatus !== null && isDepartmentResponsible(safeStatus, userProfile?.department ?? null)
  const isAssignedApprover =
    !!userProfile?.email?.trim().toLowerCase() &&
    !!approverEmail?.trim().toLowerCase() &&
    userProfile.email.trim().toLowerCase() === approverEmail.trim().toLowerCase()

  const approverCanAct = isApprover && (isResponsible || isAssignedApprover)
  const initiatorCanAct = isInitiator && safeStatus === 'PENDING_INITIATOR_REVIEW'
  const canTakeAction = approverCanAct || initiatorCanAct
  const canDelegate = approverCanAct && userProfile?.id

  const approverCanReject = isApprover && (isResponsible || isAssignedApprover)
  const initiatorCanReject =
    isInitiator && safeStatus !== 'APPROVED' && safeStatus !== 'REJECTED' && safeStatus !== 'DRAFT'
  const canReject = approverCanReject || initiatorCanReject

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
          onClick={() => setShowRejectReason(prev => !prev)}
          disabled={loading || !canReject}
          title={!canReject ? 'You are not authorized to reject this request' : undefined}
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
        {canDelegate && (
          <button
            type="button"
            onClick={() => setShowDelegateModal(true)}
            disabled={loading}
            title="Delegate this approval to another approver"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all bg-amber-600 text-white hover:bg-amber-700 shadow-sm disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
            Delegate
          </button>
        )}
        {canDelegate && (
          <button
            type="button"
            onClick={() => setShowEscalateModal(true)}
            disabled={loading}
            title="Escalate this approval to a higher authority"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all bg-orange-600 text-white hover:bg-orange-700 shadow-sm disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19.5v-15m0 0l-6.75 6.75M12 4.5l6.75 6.75" />
            </svg>
            Escalate
          </button>
        )}
      </div>

      {showRejectReason && (
        <div className="rounded-lg border border-rose-200/80 dark:border-rose-900/60 bg-white dark:bg-zinc-900 p-3">
          <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
            Rejection Reason <span className="text-slate-400">(optional)</span>
          </label>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-3 py-2 text-sm focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 outline-none"
            placeholder="Enter reason for rejection..."
          />
          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowRejectReason(false)
                setRejectReason('')
              }}
              className="rounded-lg border border-slate-300 dark:border-zinc-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleStatusUpdate('REJECT')}
              disabled={loading}
              className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Submitting…' : 'Confirm Reject'}
            </button>
          </div>
        </div>
      )}

      {localError && (
        <span className="text-xs text-rose-600 dark:text-rose-400">{localError}</span>
      )}

      <DelegateModal
        isOpen={showDelegateModal}
        onClose={() => setShowDelegateModal(false)}
        requestId={requestId}
        onSuccess={handleDelegateSuccess}
      />
      <EscalateModal
        isOpen={showEscalateModal}
        onClose={() => setShowEscalateModal(false)}
        requestId={requestId}
        onSuccess={handleEscalateSuccess}
      />
    </div>
  )
}
