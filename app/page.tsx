'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useChangeRequests, type RequestWithAudit } from '@/hooks/useChangeRequests'
import type { RequestAuditLog } from '@/lib/supabase'
import ChangeRequestRow from '@/components/ChangeRequestRow'

function StatusBadge({ status }: { status: string | null }) {
  const base = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset'

  const styles: Record<string, string> = {
    DRAFT: `${base} bg-gray-50 text-gray-800 ring-gray-600/30`,
    PENDING_DEPT_1: `${base} bg-yellow-50 text-yellow-800 ring-yellow-600/30`,
    PENDING_DEPT_2: `${base} bg-yellow-50 text-yellow-800 ring-yellow-600/30`,
    PENDING_DEPT_3: `${base} bg-yellow-50 text-yellow-800 ring-yellow-600/30`,
    APPROVED: `${base} bg-green-50 text-green-800 ring-green-600/30`,
    REJECTED: `${base} bg-red-50 text-red-800 ring-red-600/30`,
  }

  return <span className={styles[status ?? ''] ?? `${base} bg-gray-50 text-gray-800 ring-gray-600/30`}>{status ?? 'UNKNOWN'}</span>
}

function LagBadge({ hours }: { hours: number }) {
  if (hours <= 48) return null

  return (
    <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-800 ring-1 ring-inset ring-red-600/30">
      Lagging · {Math.round(hours)}h
    </span>
  )
}

function DepartmentTimeline({ status, auditLogs }: { status: string | null; auditLogs: RequestAuditLog[] | undefined }) {
  const steps = ['DRAFT', 'PENDING_DEPT_1', 'PENDING_DEPT_2', 'PENDING_DEPT_3', 'APPROVED']
  const completed = auditLogs?.map((entry) => entry.new_status).filter(Boolean) as string[] ?? []

  return (
    <ol className="mt-4 space-y-2">
      {steps.map((step) => {
        const isComplete = completed.includes(step)
        const isCurrent = step === status
        return (
          <li key={step} className="flex items-center gap-2">
            <span
              className={
                isCurrent
                  ? 'h-3 w-3 rounded-full border-2 border-blue-600 bg-blue-600'
                  : isComplete
                    ? 'h-3 w-3 rounded-full border-2 border-green-600 bg-green-600'
                    : 'h-3 w-3 rounded-full border-2 border-gray-300 bg-white'
              }
            />
            <span
              className={
                isCurrent
                  ? 'text-sm font-semibold text-gray-900'
                  : isComplete
                    ? 'text-sm font-medium text-green-800'
                    : 'text-sm text-gray-500'
              }
            >
              {step.replace(/PENDING_/, '').replace(/DEPT_/, 'Dept ')}
            </span>
            {isCurrent && <span className="text-xs text-gray-500">(current)</span>}
          </li>
        )
      })}
    </ol>
  )
}

function AuditTimeline({ logs }: { logs: RequestAuditLog[] }) {
  if (!logs?.length) {
    return <p className="text-sm text-gray-500 mt-2">No audit history available.</p>
  }

  return (
    <ol className="relative mt-3 space-y-3 border-l border-gray-200 pl-4">
      {logs
        .slice()
        .sort((a, b) => new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime())
        .map((log) => (
          <li key={log.id} className="relative">
            <div className="absolute -left-[21px] mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-gray-300 shadow-sm" />
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 shadow-sm">
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <span className="font-medium">{new Date(log.timestamp ?? '').toLocaleString()}</span>
                <span className="rounded bg-gray-200 px-1.5 py-0.5 font-mono">{log.action}</span>
                <span>by {log.changed_by}</span>
              </div>
              {(log.previous_status || log.new_status) && (
                <div className="mt-1 text-xs text-gray-600">
                  <span className="rounded bg-gray-200 px-1.5 py-0.5 font-mono">{log.previous_status ?? 'null'}</span>
                  <span className="mx-1">→</span>
                  <span className="rounded bg-gray-200 px-1.5 py-0.5 font-mono">{log.new_status ?? 'null'}</span>
                </div>
              )}
              {log.comment && <p className="mt-1 text-xs text-gray-600">{log.comment}</p>}
            </div>
          </li>
        ))}
    </ol>
  )
}

export default function Dashboard() {
  const { data, loading, error, toast, updateStatus, calculateLagHours, ROLE_ACCESS } = useChangeRequests()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleToggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  const handleStatusChange = async (id: string, newStatus: string | null) => {
    await updateStatus(id, { status: newStatus })
  }

  const getAccess = (status: string | null) => ROLE_ACCESS[status ?? ''] ?? ROLE_ACCESS.DRAFT
  const canApprove = (status: string | null) => getAccess(status).canApprove
  const isLocked = (status: string | null) => getAccess(status).locked

  const statusOptions = [
    { value: 'PENDING_DEPT_1', label: 'Pending Dept 1' },
    { value: 'PENDING_DEPT_2', label: 'Pending Dept 2' },
    { value: 'PENDING_DEPT_3', label: 'Pending Dept 3' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
  ]

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
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Project Approvals</h1>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-700">
              {data.length} {data.length === 1 ? 'request' : 'requests'}
            </span>
            <Link
              href="/create-request"
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + New Request
            </Link>
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
