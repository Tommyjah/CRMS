'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useChangeRequests } from '@/hooks/useChangeRequests'
import ChangeRequestRow from '@/components/ChangeRequestRow'
import OnboardingModal from '@/components/OnboardingModal'
import { getUserProfile } from '@/app/actions'
import { DEPARTMENTS, STATUS_OPTIONS, PRIORITY_OPTIONS } from '@/lib/constants'
import type { RequestFilters } from '@/app/actions'

const PAGE_SIZE = 10

function PaginationControls({
  page,
  totalPages,
  totalCount,
  goToPage,
}: {
  page: number
  totalPages: number
  totalCount: number
  goToPage: (page: number) => void
}) {
  if (totalPages <= 1) return null

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 5
    const half = Math.floor(maxVisible / 2)
    let start = Math.max(1, page - half)
    const end = Math.min(totalPages, start + maxVisible - 1)
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1)
    }
    if (start > 1) {
      pages.push(1)
      if (start > 2) pages.push('...')
    }
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    if (end < totalPages) {
      if (end < totalPages - 1) pages.push('...')
      pages.push(totalPages)
    }
    return pages
  }

  return (
    <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-600 dark:text-zinc-400">
        Showing{' '}
        <span className="font-medium text-slate-900 dark:text-zinc-100">
          {totalCount > 0 ? (page - 1) * PAGE_SIZE + 1 : 0}
        </span>{' '}
        to{' '}
        <span className="font-medium text-slate-900 dark:text-zinc-100">
          {Math.min(page * PAGE_SIZE, totalCount)}
        </span>{' '}
        of <span className="font-medium text-slate-900 dark:text-zinc-100">{totalCount}</span> results
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => goToPage(page - 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-zinc-700 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          <span className="hidden sm:inline">Previous</span>
        </button>
        {getPageNumbers().map((p, idx) => (
          <button
            key={`${p}-${idx}`}
            type="button"
            disabled={p === '...'}
            onClick={() => typeof p === 'number' && goToPage(p)}
            className={`min-w-[2.25rem] rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors ${
              p === page
                ? 'bg-teal-600 text-white shadow-sm'
                : p === '...'
                  ? 'cursor-default text-slate-400 dark:text-zinc-500'
                  : 'border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800'
            }`}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => goToPage(page + 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-zinc-700 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
        >
          <span className="hidden sm:inline">Next</span>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>
    </div>
  )
}

function NewRequestButton({ userProfile }: { userProfile: { department: string | null; role: string | null; email?: string | null } | null }) {
  const role = userProfile?.role
  const canCreate = role === 'REQUESTER' || role === 'INITIATOR'

  if (!canCreate) {
    return (
      <button
        type="button"
        disabled
        title="Approvers cannot create new requests."
        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-400 cursor-not-allowed border border-slate-200/60 dark:bg-zinc-800/50 dark:text-zinc-500 dark:border-zinc-700/50"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        New Request
      </button>
    )
  }
  return (
    <Link
      href="/create-request"
      className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 shadow-sm transition-colors"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
      New Request
    </Link>
  )
}

export default function Dashboard() {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<{ department: string | null; role: string | null; email?: string | null } | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)
  const retryCountRef = useRef(0)
  const hasShownLoadingRef = useRef(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [priorityFilter, setPriorityFilter] = useState('All')
  const [departmentFilter, setDepartmentFilter] = useState('All')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  const loadProfile = useCallback(async () => {
    const isRetry = retryCountRef.current > 0
    retryCountRef.current += 1

    setProfileLoading(true)
    setProfileError(null)
    try {
      const result = await getUserProfile()
      if (result.data) {
        setUserProfile(result.data)
        retryCountRef.current = 0
      } else {
        const authMissing = result.error?.toLowerCase().includes('session') || result.error?.toLowerCase().includes('auth')
        if (!isRetry && authMissing) {
          setProfileLoading(true)
          setProfileError(null)
          await new Promise(resolve => setTimeout(resolve, 350))
          retryCountRef.current += 1
          loadProfile()
          return
        }
        setProfileError(result.error ?? 'Failed to load profile')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load profile'
      setProfileError(message)
    } finally {
      setProfileLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProfile()
  }, [loadProfile])

  const filters: RequestFilters = useMemo(
    () => ({
      search: searchQuery,
      status: statusFilter,
      priority: priorityFilter,
      department: departmentFilter,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page,
      limit: PAGE_SIZE,
    }),
    [searchQuery, statusFilter, priorityFilter, departmentFilter, dateFrom, dateTo, page]
  )

  const {
    data,
    loading,
    error,
    toast,
    totalCount,
    totalPages,
    calculateLagHours,
  } = useChangeRequests(filters)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1)
  }, [searchQuery, statusFilter, priorityFilter, departmentFilter, dateFrom, dateTo])

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-slate-50/50 dark:bg-zinc-950" suppressHydrationWarning={true}>
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-50 sm:text-3xl">Project Approvals</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">Loading...</p>
            </div>
          </div>
          <div className="mt-6 grid gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (profileError) {
    return (
      <div className="min-h-screen bg-slate-50/50 dark:bg-zinc-950" suppressHydrationWarning={true}>
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-50 sm:text-3xl">Project Approvals</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">Manage and track change request approvals</p>
            </div>
          </div>
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-6 text-center dark:bg-rose-950/20 dark:border-rose-800/50">
            <svg className="mx-auto h-12 w-12 text-rose-500 mb-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.375 0h18.75c.621 0 1.125-.504 1.125-1.125V6.375c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0 1.125.504 1.125 1.125v5.625c0 .621.504 1.125 1.125 1.125zm9.375 0v3.75m-9.375 0v3.75m-9.375 0V15m18.75 0v-3.75M3.375 9v3.75" />
            </svg>
            <h2 className="text-lg font-semibold text-rose-900 dark:text-rose-300 mb-2">Unable to load profile</h2>
            <p className="text-sm text-rose-700 dark:text-rose-400 mb-4 max-w-md mx-auto">{profileError}</p>
            <button
              type="button"
              onClick={loadProfile}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loading && data.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50/50 dark:bg-zinc-950" suppressHydrationWarning={true}>
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-50 sm:text-3xl">Project Approvals</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">Manage and track change request approvals</p>
            </div>
            <NewRequestButton userProfile={userProfile} />
          </div>
          <div className="mt-6 grid gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error && data.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50/50 dark:bg-zinc-950" suppressHydrationWarning={true}>
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-50 sm:text-3xl">Project Approvals</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">Manage and track change request approvals</p>
            </div>
            <NewRequestButton userProfile={userProfile} />
          </div>
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-6 text-center dark:bg-rose-950/20 dark:border-rose-800/50">
            <svg className="mx-auto h-12 w-12 text-rose-500 mb-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.375 0h18.75c.621 0 1.125-.504 1.125-1.125V6.375c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v5.625c0 .621.504 1.125 1.125 1.125zm9.375 0v3.75m-9.375 0v3.75m-9.375 0V15m18.75 0v-3.75M3.375 9v3.75" />
            </svg>
            <h2 className="text-lg font-semibold text-rose-900 dark:text-rose-300 mb-2">Unable to load requests</h2>
            <p className="text-sm text-rose-700 dark:text-rose-400 mb-4 max-w-md mx-auto">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-slate-50/50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-50 transition-colors duration-200">
      <OnboardingModal />
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-50 sm:text-3xl">Project Approvals</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
              Manage and track change request approvals
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:text-zinc-300">
              <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-teal-400" />
              {totalCount} {totalCount === 1 ? 'request' : 'requests'}
            </span>
            <NewRequestButton userProfile={userProfile} />
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="flex-1">
              <label htmlFor="search" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-zinc-300">
                Search
              </label>
              <div className="relative">
                <input
                  id="search"
                  type="text"
                  placeholder="Search by project name, number, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:focus:ring-teal-500/10 transition-all outline-none"
                />
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-zinc-500 pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 14A7 7 0 0112 12z" />
                </svg>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label htmlFor="status-filter" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-zinc-300">
                  Status
                </label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:focus:ring-teal-500/10 transition-all outline-none"
                >
                  <option value="All">All Statuses</option>
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="priority-filter" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-zinc-300">
                  Priority
                </label>
                <select
                  id="priority-filter"
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:focus:ring-teal-500/10 transition-all outline-none"
                >
                  <option value="All">All Priorities</option>
                  {PRIORITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="department-filter" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-zinc-300">
                  Department
                </label>
                <select
                  id="department-filter"
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:focus:ring-teal-500/10 transition-all outline-none"
                >
                  <option value="All">All Departments</option>
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-end gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300">
                  Date Range
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="h-[38px] w-36 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-2 text-sm text-slate-900 dark:text-zinc-100 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:focus:ring-teal-500/10 transition-all outline-none"
                  />
                  <span className="text-sm text-slate-400 dark:text-zinc-500 select-none shrink-0">to</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="h-[38px] w-36 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-2 text-sm text-slate-900 dark:text-zinc-100 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:focus:ring-teal-500/10 transition-all outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {data.length === 0 ? (
          <div className="mt-10 rounded-xl border border-dashed border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-10 text-center">
            <svg className="mx-auto h-16 w-16 text-slate-300 dark:text-zinc-600 mb-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0 1.125.504 1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-zinc-100 mb-2">No change requests found</h3>
            <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-md mx-auto">
              {searchQuery || statusFilter !== 'All' || priorityFilter !== 'All' || departmentFilter !== 'All' || dateFrom || dateTo
                ? 'No requests match your current filters. Try adjusting your search criteria.'
                : 'There are no change requests in the system yet. Create one to get started.'}
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4">
            {data.map((req) => (
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

        <PaginationControls
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          goToPage={setPage}
        />

        {toast && (
          <div className="fixed bottom-4 right-4 z-50 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3 shadow-lg" suppressHydrationWarning={true}>
            <p className="text-sm font-medium text-slate-900 dark:text-zinc-100">{toast}</p>
          </div>
        )}
      </div>
    </div>
  )
}
