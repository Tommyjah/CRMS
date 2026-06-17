'use client'

import { useState } from 'react'
import { updateRequestStatus } from '@/app/actions'

type StatusButtonsProps = {
  requestId: string
  canApprove: boolean
  onRejected?: () => void
}

export default function StatusButtons({ requestId, canApprove, onRejected }: StatusButtonsProps) {
  const [loading, setLoading] = useState(false)

  const handleStatusUpdate = async (status: 'APPROVED' | 'REJECTED') => {
    setLoading(true)
    try {
      const result = await updateRequestStatus(requestId, status)

      if (result?.error) {
        alert(result.error)
        return
      }

      if (status === 'REJECTED') {
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
        onClick={() => handleStatusUpdate('APPROVED')}
        disabled={loading || !canApprove}
        className="rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Processing…' : 'Approve'}
      </button>
      <button
        type="button"
        onClick={() => handleStatusUpdate('REJECTED')}
        disabled={loading}
        className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Reject
      </button>
    </div>
  )
}
