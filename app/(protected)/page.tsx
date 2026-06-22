'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useChangeRequests } from '@/hooks/useChangeRequests'
import ChangeRequestRow from '@/components/ChangeRequestRow'
import OnboardingModal from '@/components/OnboardingModal'
import { getUserProfile } from '@/app/actions'

const INITIATING_DEPARTMENTS = ['Wire Line Planning', 'Fixed Network', 'Engineering']
const AUTHORIZED_ROLES = ['INITIATOR', 'REQUESTER']

function NewRequestButton({ userProfile }: { userProfile: { department: string | null; role: string | null; email?: string | null } | null }) {
  const isAuthorizedDept = !!userProfile?.department && INITIATING_DEPARTMENTS.includes(userProfile.department)
  const isAuthorizedRole = !!userProfile?.role && AUTHORIZED_ROLES.includes(userProfile.role)
  const canInitiate = isAuthorizedDept || isAuthorizedRole

  if (!canInitiate) {
    return (
      <button
        type="button"
        disabled
        title="Only authorized planning departments can initiate new requests."
        className="rounded-lg bg-slate-100 px-6 py-2 text-sm font-medium text-slate-400 cursor-not-allowed border border-slate-200/60 dark:bg-zinc-800/50 dark:text-zinc-500 dark:border-zinc-700/50"
      >
        + New Request
      </button>
    )
  }

  return (
    <Link
      href="/create-request"
      className="rounded-lg bg-teal-600 px-6 py-2 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
    >
      + New Request
    </Link>
  )
}

export default function Dashboard() {
  const { data, loading, error, toast, updateStatus, calculateLagHours } = useChangeRequests()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<{ department: string | null; role: string | null; email?: string | null } | null>(null)

  useEffect(() => {
    async function loadProfile() {
      const { data: profileData } = await getUserProfile()
      if (profileData) setUserProfile(profileData)
    }
    loadProfile()
  }, [])

  const handleStatusChange = async (id: string, newStatus: string | null) => {
    await updateStatus(id, { status: newStatus })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 dark:bg-zinc-950" suppressHydrationWarning={true}>
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-50 sm:text-3xl">Project Approvals</h1>
            <NewRequestButton userProfile={userProfile} />
          </div>
          <div className="mt-6 grid gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-200 dark:bg-zinc-800" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50/50 dark:bg-zinc-950" suppressHydrationWarning={true}>
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-50 sm:text-3xl">Project Approvals</h1>
            <NewRequestButton userProfile={userProfile} />
          </div>
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-center text-rose-800 dark:bg-rose-950/20 dark:text-rose-400">
            Error: {error}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-slate-50/50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-50 transition-colors duration-200">
      <OnboardingModal />
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-50 sm:text-3xl">Project Approvals</h1>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-slate-200/50 dark:bg-zinc-800/50 px-3 py-1 text-xs font-medium text-slate-700 dark:text-zinc-300">
              {data.length} {data.length === 1 ? 'request' : 'requests'}
            </span>
            <NewRequestButton userProfile={userProfile} />
          </div>
        </div>

        {data.length === 0 ? (
          <div className="mt-10 rounded-xl border border-dashed border-slate-300/50 dark:border-zinc-700/50 bg-white dark:bg-zinc-900 p-10 text-center text-slate-500 dark:text-zinc-400">
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
          <div className="fixed bottom-4 right-4 z-50 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3 shadow-lg" suppressHydrationWarning={true}>
            <p className="text-sm font-medium text-slate-900 dark:text-zinc-100">{toast}</p>
          </div>
        )}
      </div>
    </div>
  )
}
