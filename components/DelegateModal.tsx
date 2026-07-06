'use client'

import { useState, useCallback } from 'react'
import { delegateApproval } from '@/app/actions'

interface DelegateModalProps {
  isOpen: boolean
  onClose: () => void
  requestId: string
  onSuccess?: () => void
}

export default function DelegateModal({ isOpen, onClose, requestId, onSuccess }: DelegateModalProps) {
  const [delegateTo, setDelegateTo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetState = useCallback(() => {
    setDelegateTo('')
    setError(null)
    setSubmitting(false)
  }, [])

  const handleOpenChange = useCallback((next: boolean) => {
    if (!next) {
      resetState()
    }
    onClose()
  }, [onClose, resetState])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!delegateTo.trim() || submitting) return

    setSubmitting(true)
    setError(null)

    try {
      const result = await delegateApproval(requestId, delegateTo.trim())

      if (result?.error) {
        setError(result.error)
        return
      }

      onSuccess?.()
      resetState()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delegate approval')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">Delegate Approval</h3>
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-sm text-slate-600 dark:text-zinc-400 mb-4">
          Enter the name or email of the person you want to delegate this approval to:
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1">
              Delegate to
            </label>
            <input
              type="text"
              value={delegateTo}
              onChange={(e) => setDelegateTo(e.target.value)}
              placeholder="Name or email (e.g. John Doe / john@example.com)"
              className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              disabled={submitting}
              className="rounded-lg border border-slate-300 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !delegateTo.trim()}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Delegating...' : 'Delegate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
