'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getRequestAuditLogs } from '@/app/actions'
import type { Database } from '@/types_db'
import { STATUS_LABELS } from '@/lib/constants'

type EnrichedAuditLog = Database['public']['Tables']['request_audit_log']['Row'] & {
  changed_by_name: string | null
  changed_by_email: string | null
}

type ActionType = 'ALL' | 'CREATE' | 'APPROVE' | 'REJECT'

export default function AuditLogPage() {
  const params = useParams()
  const router = useRouter()
  const requestId = params.id as string

  const [logs, setLogs] = useState<EnrichedAuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionFilter, setActionFilter] = useState<ActionType>('ALL')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    let isMounted = true

    const fetchLogs = async () => {
      setLoading(true)
      setError(null)
      const result = await getRequestAuditLogs(requestId)
      if (!isMounted) return

      if (result.error) {
        setError(result.error)
        setLogs([])
      } else {
        setLogs(result.data ?? [])
      }
      setLoading(false)
    }

    fetchLogs()
    return () => {
      isMounted = false
    }
  }, [requestId])

  const filteredLogs = useMemo(() => {
    let result = logs

    if (actionFilter !== 'ALL') {
      result = result.filter(log => log.action === actionFilter)
    }

    if (dateFrom) {
      const from = new Date(dateFrom)
      result = result.filter(log => {
        if (!log.timestamp) return false
        return new Date(log.timestamp) >= from
      })
    }

    if (dateTo) {
      const to = new Date(dateTo)
      result = result.filter(log => {
        if (!log.timestamp) return false
        return new Date(log.timestamp) <= to
      })
    }

    return result
  }, [logs, actionFilter, dateFrom, dateTo])

  const formatDateTime = (value: string | null | undefined) => {
    if (!value) return 'N/A'
    try {
      return new Date(value).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return 'Invalid date'
    }
  }

  const handleExportPdf = async () => {
    setExporting(true)
    try {
      const { generateAuditPdf } = await import('@/lib/generateAuditPdf')
      await generateAuditPdf({
        logs: filteredLogs,
        requestId,
        exportedAt: new Date().toISOString(),
      })
    } catch (err) {
      console.error('Failed to export audit PDF:', err)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-50 transition-colors duration-200" suppressHydrationWarning={true}>
      {/* Header */}
      <div className="border-b border-emerald-200 dark:border-emerald-900/70 bg-[#00ab4e] dark:bg-[#008C4A]">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Ethio Telecom"
                className="h-10 w-10 rounded-md object-contain bg-white dark:bg-emerald-950/40 p-0.5 shadow-sm"
              />
              <div>
                <h1 className="text-lg font-semibold text-white dark:text-emerald-50">Audit History</h1>
                <p className="text-sm text-emerald-100 dark:text-emerald-200">
                  Request #{requestId.slice(0, 8)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={exporting || filteredLogs.length === 0}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/90 dark:bg-emerald-950/60 px-3 py-2 text-sm font-medium text-[#008C4A] dark:text-emerald-100 hover:bg-white dark:hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v12.75c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V13.5" />
                </svg>
                {exporting ? 'Exporting...' : 'Export PDF'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-md bg-white/90 dark:bg-emerald-950/60 px-3 py-2 text-sm font-medium text-[#008C4A] dark:text-emerald-100 hover:bg-white dark:hover:bg-emerald-900 transition-colors"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Filters */}
        <div className="rounded-xl border border-slate-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="flex items-center gap-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300">Action</label>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value as ActionType)}
                className="rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:focus:ring-teal-500/10 transition-all outline-none"
              >
                <option value="ALL">All Actions</option>
                <option value="CREATE">Create</option>
                <option value="APPROVE">Approve</option>
                <option value="REJECT">Reject</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300">Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:focus:ring-teal-500/10 transition-all outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300">Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:focus:ring-teal-500/10 transition-all outline-none"
              />
            </div>
          </div>
        </div>

        {/* Audit Log */}
        <div className="mt-6">
          {loading ? (
            <div className="rounded-xl border border-slate-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-10 text-center">
              <p className="text-sm text-slate-500 dark:text-zinc-400">Loading audit history...</p>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center dark:bg-rose-950/20 dark:border-rose-800/50">
              <p className="text-sm text-rose-700 dark:text-rose-400">{error}</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-10 text-center">
              <svg className="mx-auto h-16 w-16 text-slate-300 dark:text-zinc-600 mb-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v12.75c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V13.5" />
              </svg>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-zinc-100 mb-2">No audit logs found</h3>
              <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-md mx-auto">
                {actionFilter !== 'ALL' || dateFrom || dateTo
                  ? 'No logs match your current filters. Try adjusting your search criteria.'
                  : 'There are no audit logs for this request yet.'}
              </p>
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-slate-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-300">
                    <tr>
                      <th className="px-4 py-3 font-medium">#</th>
                      <th className="px-4 py-3 font-medium">Date & Time</th>
                      <th className="px-4 py-3 font-medium">User</th>
                      <th className="px-4 py-3 font-medium">Action</th>
                      <th className="px-4 py-3 font-medium">Status Transition</th>
                      <th className="px-4 py-3 font-medium">Comment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
                    {filteredLogs.map((log, idx) => {
                      const prevLabel = log.previous_status
                        ? STATUS_LABELS[log.previous_status as keyof typeof STATUS_LABELS] || log.previous_status
                        : 'N/A'
                      const nextLabel = log.new_status
                        ? STATUS_LABELS[log.new_status as keyof typeof STATUS_LABELS] || log.new_status
                        : 'N/A'

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/60 transition-colors">
                          <td className="px-4 py-3 text-slate-500 dark:text-zinc-400">{idx + 1}</td>
                          <td className="px-4 py-3 text-slate-700 dark:text-zinc-300 whitespace-nowrap">{formatDateTime(log.timestamp)}</td>
                          <td className="px-4 py-3 text-slate-700 dark:text-zinc-300">
                            {(log as EnrichedAuditLog).changed_by_name ||
                              (log as EnrichedAuditLog).changed_by_email ||
                              log.changed_by ||
                              'SYSTEM'}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                log.action === 'APPROVE'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400'
                                  : log.action === 'REJECT'
                                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-400'
                                    : 'bg-slate-100 text-slate-800 dark:bg-zinc-800 dark:text-zinc-300'
                              }`}
                            >
                              {log.action}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-700 dark:text-zinc-300">
                            {log.previous_status || log.new_status ? `${prevLabel} → ${nextLabel}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-zinc-400 italic max-w-xs truncate">
                            {log.comment || '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
