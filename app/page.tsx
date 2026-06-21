'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useChangeRequests } from '@/hooks/useChangeRequests'
import ChangeRequestRow from '@/components/ChangeRequestRow'
import OnboardingModal from '@/components/OnboardingModal'
import { getUserProfile } from '@/app/actions'

export default function Dashboard() {
  const { data, loading, error, toast, updateStatus, calculateLagHours } = useChangeRequests()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<{ department: string | null; role: string | null } | null>(null)

useEffect(() => {
    getUserProfile().then(({ data }) => {
      if (data) setUserProfile(data)
    })
  }, [])

  const handleStatusChange = async (id: string, newStatus: string | null) => {
    await updateStatus(id, { status: newStatus })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50" suppressHydrationWarning={true}>
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Project Approvals</h1>
          <div className="mt-6 grid gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-200" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50" suppressHydrationWarning={true}>
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Project Approvals</h1>
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-center text-red-800">
            Error: {error}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50" suppressHydrationWarning={true}>
      <OnboardingModal />
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
<div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Project Approvals</h1>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-700">
              {data.length} {data.length === 1 ? 'request' : 'requests'}
            </span>
            {(userProfile?.role === 'INITIATOR' || userProfile?.role === 'REQUESTER') && (
              <Link
                href="/create-request"
                className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                + New Request
              </Link>
            )}
          </div>
        </div>

        {data.length === 0 ? (
          <div className="mt-10 rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
            No change requests found. New submissions will appear here automatically.
          </div>
        ) : (
          <div className="mt-6 grid gap-4">
            {data.map((req) => (
<ChangeRequestRow
                key={req.id}
                req={req}
                calculateLagHours={calculateLagHours}
                onStatusChange={handleStatusChange}
                expandedId={expandedId}
                setExpandedId={setExpandedId}
                userProfile={userProfile}
              />
            ))}
          </div>
        )}
        {toast && (
          <div className="fixed bottom-4 right-4 z-50 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-lg" suppressHydrationWarning={true}>
            <p className="text-sm font-medium text-gray-900">{toast}</p>
          </div>
        )}
      </div>
    </div>
  )
}


