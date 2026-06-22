'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useChangeRequests } from '@/hooks/useChangeRequests'
import ChangeRequestRow from '@/components/ChangeRequestRow'
import OnboardingModal from '@/components/OnboardingModal'
import { getUserProfile } from '@/app/actions'

function NewRequestButton({ userProfile }: { userProfile: { department: string | null; role: string | null; email?: string | null } | null }) {
  const canInitiate = userProfile?.department === 'Initiator'

  if (!canInitiate) {
    return (
      <button
        type="button"
        disabled
        title="Only users in the Initiator department can create new requests."
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
  const { data, loading, error, toast, calculateLagHours } = useChangeRequests()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<{ department: string | null; role: string | null; email?: string | null } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [priorityFilter, setPriorityFilter] = useState('All')

  useEffect(() => {
    async function loadProfile() {
      const { data: profileData } = await getUserProfile()
      if (profileData) setUserProfile(profileData)
    }
    loadProfile()
  }, [])

  const filteredData = useMemo(() => {
    return data.filter((req) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        req.project_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.project_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.change_description?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = statusFilter === 'All' || req.status === statusFilter
      const matchesPriority = priorityFilter === 'All' || req.priority_level === priorityFilter

      return matchesSearch && matchesStatus && matchesPriority
    })
  }, [data, searchQuery, statusFilter, priorityFilter])

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
              {filteredData.length} {filteredData.length === 1 ? 'request' : 'requests'}
            </span>
            <NewRequestButton userProfile={userProfile} />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <label htmlFor="search" className="sr-only">Search change requests</label>
            <div className="relative">
              <input
                id="search"
                type="text"
                placeholder="Search by project name, number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 pl-10 pr-3 py-2 text-sm text-slate-900 dark:text-zinc-100 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:focus:ring-teal-500/10 transition-all outline-none"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-zinc-500 pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11 14 14A7 7 0 0012 12z" />
              </svg>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:focus:ring-teal-500/10 transition-all outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING_DEPT_1">Fixed Network Review</option>
              <option value="PENDING_DEPT_2">Wire Line Planning Review</option>
              <option value="PENDING_DEPT_3">Engineering Review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:focus:ring-teal-500/10 transition-all outline-none"
            >
              <option value="All">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
        </div>

        {filteredData.length === 0 ? (
          <div className="mt-10 rounded-xl border border-dashed border-slate-300/50 dark:border-zinc-700/50 bg-white dark:bg-zinc-900 p-10 text-center text-slate-500 dark:text-zinc-400">
            No change requests found matching your filters.
          </div>
        ) : (
          <div className="mt-6 grid gap-4">
            {filteredData.map((req) => (
              <ChangeRequestRow
                key={req.id}
                req={req}
                calculateLagHours={calculateLagHours}
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