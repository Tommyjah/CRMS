'use client'
import { generatePdf, RequestData, Activity } from '@/lib/generatePdf';
// 1. Add this import at the top
import { supabase } from '@/lib/supabase/client';
import { useState } from 'react'
import type { ChangeRequest, RequestAuditLog } from '@/lib/supabase/client.ts'
import type { RequestWithAudit } from '@/hooks/useChangeRequests'
import { ROLE_ACCESS } from '@/hooks/useChangeRequests'
import StatusButtons from '@/components/StatusButtons'
import ChangeRequestDrawer from '@/components/ChangeRequestDrawer'

import { getRequestActivities } from '@/app/actions'

type ChangeRequestWithDetails = ChangeRequest & {
  project_number?: string | null
  initiated_by?: string | null
  change_description?: string | null
  priority_level?: string | null
}

type RequestActivityForPdf = {
  serial_number: number
  activity: string
  unit: string | null
  contract_qty: string | null
  executed_qty: string | null
  reason: string | null
  difference?: string
}

function StatusBadge({ status }: { status: string | null }) {
  const access = ROLE_ACCESS[status ?? ''] ?? ROLE_ACCESS.DRAFT
  const styles: Record<string, string> = {
    DRAFT: 'bg-slate-50 text-slate-700 border border-slate-200 dark:bg-zinc-800/50 dark:text-zinc-300 dark:border-zinc-700',
    PENDING_DEPT_1: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800/50',
    PENDING_DEPT_2: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800/50',
    PENDING_DEPT_3: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800/50',
    APPROVED: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800/50',
    REJECTED: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-800/50',
  }
  const dotColors: Record<string, string> = {
    DRAFT: 'bg-slate-400 dark:bg-zinc-500',
    PENDING_DEPT_1: 'bg-amber-400 dark:bg-amber-400',
    PENDING_DEPT_2: 'bg-amber-400 dark:bg-amber-400',
    PENDING_DEPT_3: 'bg-amber-400 dark:bg-amber-400',
    APPROVED: 'bg-emerald-400 dark:bg-emerald-400',
    REJECTED: 'bg-rose-400 dark:bg-rose-400',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${styles[status ?? ''] ?? 'bg-slate-50 text-slate-700 border border-slate-200 dark:bg-zinc-800/50 dark:text-zinc-300 dark:border-zinc-700'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotColors[status ?? ''] ?? 'bg-slate-400 dark:bg-zinc-500'}`} />
      {access?.label || 'UNKNOWN'}
    </span>
  )
}

function LagBadge({ hours }: { hours: number }) {
  if (hours <= 48) return null
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700 border border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-800/50">
      <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
      Lagging · {Math.round(hours)}h
    </span>
  )
}

function DepartmentTimeline({ status, auditLogs }: { status: string | null; auditLogs: RequestAuditLog[] | undefined }) {
  const steps = ['DRAFT', 'PENDING_DEPT_1', 'PENDING_DEPT_2', 'PENDING_DEPT_3', 'APPROVED']
  const completed = auditLogs?.map((entry) => entry.new_status).filter(Boolean) as string[] ?? []

  const stageLabels: Record<string, string> = {
    DRAFT: 'Initiator',
    PENDING_DEPT_1: 'Fixed Network Review',
    PENDING_DEPT_2: 'Wire Line Planning Review',
    PENDING_DEPT_3: 'Engineering Review',
    APPROVED: 'Approved',
  }

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
                  ? 'h-3 w-3 rounded-full border-2 border-teal-600 bg-teal-600'
                  : isComplete
                    ? 'h-3 w-3 rounded-full border-2 border-emerald-600 bg-emerald-600'
                    : 'h-3 w-3 rounded-full border-2 border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900'
              }
            />
            <span
              className={
                isCurrent
                  ? 'text-sm font-semibold text-teal-900 dark:text-teal-300'
                  : isComplete
                    ? 'text-sm font-medium text-emerald-800 dark:text-emerald-300'
                    : 'text-sm text-slate-500 dark:text-zinc-400'
              }
            >
              {stageLabels[step] || step}
            </span>
            {isCurrent && <span className="text-xs text-slate-500 dark:text-zinc-400">(current)</span>}
          </li>
        )
      })}
    </ol>
  )
}

function AuditTimeline({ logs }: { logs: RequestAuditLog[] | undefined }) {
  if (!logs?.length) {
    return <p className="text-sm text-slate-500 dark:text-zinc-400 mt-2">No audit history available.</p>
  }

  return (
    <ol className="relative mt-3 space-y-3 border-l border-slate-300/50 dark:border-zinc-700/50 pl-4">
      {logs
        .slice()
        .sort((a, b) => new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime())
        .map((log) => (
          <li key={log.id} className="relative">
            <div className="absolute -left-[21px] mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-slate-400 dark:bg-zinc-500 shadow-sm" />
            <div className="rounded-lg border border-slate-200/80 dark:border-zinc-800/80 bg-slate-50/30 dark:bg-zinc-800/20 p-3 shadow-sm">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
                <span className="font-medium">{new Date(log.timestamp ?? '').toLocaleString()}</span>
                <span className="rounded bg-slate-200/50 dark:bg-zinc-700/50 px-1.5 py-0.5 font-mono">{log.action}</span>
                <span>by {log.changed_by}</span>
              </div>
              {(log.previous_status || log.new_status) && (
                <div className="mt-1 text-xs text-slate-600 dark:text-zinc-400">
                  <span className="rounded bg-slate-200/50 dark:bg-zinc-700/50 px-1.5 py-0.5 font-mono">{log.previous_status ?? 'null'}</span>
                  <span className="mx-1">→</span>
                  <span className="rounded bg-slate-200/50 dark:bg-zinc-700/50 px-1.5 py-0.5 font-mono">{log.new_status ?? 'null'}</span>
                </div>
              )}
              {log.comment && <p className="mt-1 text-xs text-slate-600 dark:text-zinc-400">{log.comment}</p>}
            </div>
          </li>
        ))}
    </ol>
  )
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

type ChangeRequestRowProps = {
  req: ChangeRequestWithDetails
  calculateLagHours: (req: RequestWithAudit) => number
  onStatusChange: (id: string, status: string | null) => void
  expandedId: string | null
  setExpandedId: (id: string | null) => void
  userProfile: { department: string | null; role: string | null; email?: string | null } | null
}

export default function ChangeRequestRow({
  req,
  calculateLagHours,
  onStatusChange,
  expandedId,
  setExpandedId,
  userProfile,
}: ChangeRequestRowProps) {
  const [auditLogs, setAuditLogs] = useState<RequestAuditLog[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const access = ROLE_ACCESS[req.status ?? ''] ?? ROLE_ACCESS.DRAFT
  
  const lagHours = calculateLagHours(req)
  const stale = lagHours > 48
  const projectNumber = req.project_number ?? '—'
  const initiator = req.initiated_by ?? req.initiator_name
  const description = req.change_description ?? req.description
  const priority = req.priority_level ?? '—'

  const toggleAuditLog = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null)
      return
    }

    setExpandedId(id)
    if (auditLogs) return

    setIsLoading(true)
    try {

 const { data } = await supabase
        .from('request_audit_log')
        .select('*')
        .eq('request_id', id)
        .order('timestamp', { ascending: false })

      setAuditLogs(data ?? [])
    } catch (err) {
      console.error('Failed to fetch audit logs:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true)
    setPdfError(null)

    try {
      const { data: activities, error } = await getRequestActivities(req.id)

      // 👇 ADD THIS TEMPORARY DEBUG LOG
      console.log("PDF Debug - Request ID:", req.id, "Fetched Activities:", activities);
      
      if (error) {
        throw new Error(error)
      }

      // 1. Explicitly apply the RequestData type definition
      const requestForPdf: RequestData = {
        id: req.id,
        project_name: req.project_name ?? '—',
        project_number: projectNumber,
        initiated_by: initiator,
        change_description: description ?? '',
        priority_level: priority,
        status: req.status ?? '',
        created_at: req.created_at ?? new Date().toISOString(),
      }

      const typedActivities = (activities ?? []) as RequestActivityForPdf[]

      // 2. Map and cast data strictly to clear the types mismatch errors
      const activitiesForPdf: Activity[] = typedActivities.map((activity) => ({
        activity: activity.activity,
        unit: activity.unit ?? '—',                       // Handle potential null
        contract_qty: Number(activity.contract_qty) || 0, // Convert string/null to number
        executed_qty: Number(activity.executed_qty) || 0, // Convert string/null to number
        reason: activity.reason ?? '—',                   // Handle potential null
      }))

      // 3. Added 'await' here since generatePdf is an async function
      await generatePdf(requestForPdf, activitiesForPdf)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate PDF'
      setPdfError(message)
      console.error('Failed to generate PDF:', err)
    } finally {
      setIsGeneratingPdf(false)
    }
  }
  
  const statusOptions = [
    { value: 'PENDING_DEPT_1', label: 'Fixed Network Review' },
    { value: 'PENDING_DEPT_2', label: 'Wire Line Planning Review' },
    { value: 'PENDING_DEPT_3', label: 'Engineering Review' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
  ]

  return (
    <>
      <div className={`rounded-xl border bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:border-teal-500/30 dark:bg-zinc-900 dark:border-zinc-800/80 ${stale ? 'border-rose-300' : 'border-slate-200/80'}`} suppressHydrationWarning={true}>
<div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-bold text-slate-900 dark:text-zinc-100">{req.project_name}</h2>
              <StatusBadge status={req.status} />
              <LagBadge hours={lagHours} />
            </div>
            <div className="mt-3 grid gap-2 text-sm text-slate-600 dark:text-zinc-300 sm:grid-cols-2">
              <div>
                <span className="font-medium text-slate-500 dark:text-zinc-400">Project Number:</span>{' '}
                {projectNumber}
              </div>
              <div>
                <span className="font-medium text-slate-500 dark:text-zinc-400">Initiated By:</span>{' '}
                {initiator ?? '—'}
              </div>
              <div>
                <span className="font-medium text-slate-500 dark:text-zinc-400">Priority Level:</span>{' '}
                {priority}
              </div>
              <div>
                <span className="font-medium text-slate-500 dark:text-zinc-400">Current holder:</span>{' '}
                {access.department || '—'}
              </div>
            </div>
            {description && (
              <div className="mt-3 rounded-lg bg-slate-50/50 dark:bg-zinc-800/30 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                  Change Description
                </p>
                <p className="mt-1 text-sm text-slate-700 dark:text-zinc-200">{description}</p>
              </div>
            )}
            <time className="mt-2 block text-xs text-slate-500 dark:text-zinc-500">Created {formatDate(req.created_at)}</time>
          </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => toggleAuditLog(req.id)}
            disabled={isLoading}
            className="rounded-lg border border-slate-300 dark:border-zinc-700 px-3 py-2 text-sm font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Loading...' : expandedId === req.id ? 'Hide audit log' : 'View audit log'}
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="rounded-lg border border-slate-300 dark:border-zinc-700 px-3 py-2 text-sm font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
          >
            {isGeneratingPdf ? 'Generating...' : 'Download PDF'}
          </button>
          <select
            value={req.status ?? ''}
            onChange={(e) => onStatusChange(req.id, e.target.value || null)}
            disabled={access.locked}
            className="rounded-lg border border-slate-300 dark:border-zinc-700 px-3 py-2 text-sm font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
          >
            <option value="" disabled>Set status</option>
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={access.locked && !ROLE_ACCESS[opt.value].canApprove && opt.value !== 'DRAFT'}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="rounded-lg border border-slate-300 dark:border-zinc-700 px-3 py-2 text-sm font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
          >
            🔍 Details
          </button>
          <StatusButtons 
            requestId={req.id} 
            status={req.status} 
            userProfile={userProfile}
            approverEmail={req.status === 'PENDING_DEPT_1' ? req.fixed_network_approver : req.status === 'PENDING_DEPT_2' ? req.wire_line_approver : req.status === 'PENDING_DEPT_3' ? req.engineering_approver : null}
          />
        </div>
      </div>

      {pdfError && (
        <div className="mx-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:bg-rose-950/20 dark:text-rose-400">
          {pdfError}
        </div>
      )}

      <div className="border-t border-slate-200/50 dark:border-zinc-800 px-4 pb-4">
        <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-zinc-100">Approval Timeline</h3>
        <DepartmentTimeline status={req.status} auditLogs={auditLogs ?? undefined} />
        {expandedId === req.id && (
          <div className="mt-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-zinc-100">Audit History</h3>
            <AuditTimeline logs={auditLogs ?? undefined} />
          </div>
        )}
      </div>
    </div>

    <ChangeRequestDrawer request={req} isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </>
  )
}
