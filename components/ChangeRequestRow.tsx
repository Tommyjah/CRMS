'use client'
import { generatePdf, RequestData, Activity } from '@/lib/generatePdf';
import { supabase } from '@/lib/supabase/client';
import { useState } from 'react'
import type { ChangeRequest, RequestAuditLog } from '@/lib/supabase/client.ts'
import type { RequestWithAudit } from '@/hooks/useChangeRequests'
import { ROLE_ACCESS } from '@/hooks/useChangeRequests'
import { STATUS_STYLES, STATUS_DOT_COLORS, STAGE_STEPS, STAGE_LABELS, isStatus } from '@/lib/constants'
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
  const resolvedStatus = isStatus(status) ? status : 'DRAFT'
  const styles = STATUS_STYLES[resolvedStatus]
  const dotColors = STATUS_DOT_COLORS[resolvedStatus]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${styles}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotColors}`} />
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
  const steps = STAGE_STEPS
  const completed = auditLogs?.map((entry) => entry.new_status).filter(Boolean) as string[] ?? []
  const stageLabels = STAGE_LABELS

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
  expandedId: string | null
  setExpandedId: (id: string | null) => void
  userProfile: { department: string | null; role: string | null; email?: string | null } | null
}

export default function ChangeRequestRow({
  req,
  calculateLagHours,
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
      const { data, error } = await supabase
        .from('request_audit_log')
        .select('*')
        .eq('request_id', id)
        .order('timestamp', { ascending: false })

      if (error) {
        throw new Error(error.message || 'Failed to load audit history')
      }

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

      if (error) {
        throw new Error(error)
      }

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

      const activitiesForPdf: Activity[] = typedActivities.map((activity) => ({
        activity: activity.activity,
        unit: activity.unit ?? '—',
        contract_qty: Number(activity.contract_qty) || 0,
        executed_qty: Number(activity.executed_qty) || 0,
        reason: activity.reason ?? '—',
      }))

      await generatePdf(requestForPdf, activitiesForPdf)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate PDF'
      setPdfError(message)
      console.error('Failed to generate PDF:', err)
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  return (
    <>
      <div className={`group rounded-xl border bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:border-teal-500/30 dark:bg-zinc-900 dark:border-zinc-800/80 ${stale ? 'border-rose-300 dark:border-rose-800/50' : 'border-slate-200/80'}`} suppressHydrationWarning={true}>
        <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-12 md:p-6">
        <div className="md:col-span-12 flex flex-wrap items-center gap-3">
          <h2 className="truncate text-base font-bold text-slate-900 dark:text-zinc-100 group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
            {req.project_name}
          </h2>
          <StatusBadge status={req.status} />
          <LagBadge hours={lagHours} />
        </div>

        <div className="md:col-span-5 text-sm text-slate-600 dark:text-zinc-300">
          <dl className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div className="rounded-lg bg-slate-50/60 dark:bg-zinc-800/40 px-3 py-2">
              <dt className="text-xs font-medium text-slate-500 dark:text-zinc-400">Project Number</dt>
              <dd className="mt-0.5 font-mono text-xs text-slate-900 dark:text-zinc-100">{projectNumber}</dd>
            </div>
            <div className="rounded-lg bg-slate-50/60 dark:bg-zinc-800/40 px-3 py-2">
              <dt className="text-xs font-medium text-slate-500 dark:text-zinc-400">Initiated By</dt>
              <dd className="mt-0.5 text-xs text-slate-900 dark:text-zinc-100">{initiator ?? '—'}</dd>
            </div>
            <div className="rounded-lg bg-slate-50/60 dark:bg-zinc-800/40 px-3 py-2">
              <dt className="text-xs font-medium text-slate-500 dark:text-zinc-400">Priority</dt>
              <dd className="mt-0.5 text-xs text-slate-900 dark:text-zinc-100">{priority}</dd>
            </div>
            <div className="rounded-lg bg-slate-50/60 dark:bg-zinc-800/40 px-3 py-2">
              <dt className="text-xs font-medium text-slate-500 dark:text-zinc-400">Current Stage</dt>
              <dd className="mt-0.5 text-xs text-slate-900 dark:text-zinc-100">{access.department || '—'}</dd>
            </div>
          </dl>
        </div>

        <div className="md:col-span-7 text-sm text-slate-700 dark:text-zinc-300">
          <div className="rounded-lg border border-slate-200/80 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-800/30 p-3.5">
            {description && (
              <>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
                  Change Description
                </p>
                <p className="text-sm text-slate-700 dark:text-zinc-200 line-clamp-3">{description}</p>
              </>
            )}
          </div>
        </div>

        <div className="md:col-span-12 flex flex-wrap items-center gap-2">
          <time className="mr-auto text-xs text-slate-500 dark:text-zinc-500">
            Created {formatDate(req.created_at)}
          </time>
          <button
            type="button"
            onClick={() => toggleAuditLog(req.id)}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {isLoading ? 'Loading...' : expandedId === req.id ? 'Hide audit log' : 'Audit log'}
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            {isGeneratingPdf ? 'Generating...' : 'PDF'}
          </button>
          {pdfError && (
            <span className="text-xs text-rose-600 dark:text-rose-400 self-center">{pdfError}</span>
          )}
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Details
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
        <div className="mx-5 mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800 dark:bg-rose-950/20 dark:text-rose-400">
          {pdfError}
        </div>
      )}

      <div className="border-t border-slate-200/50 dark:border-zinc-800 px-5 pb-5">
        <h3 className="mb-3 text-xs font-semibold text-slate-900 dark:text-zinc-100 uppercase tracking-wider">Approval Timeline</h3>
        <DepartmentTimeline status={req.status} auditLogs={auditLogs ?? undefined} />
        {expandedId === req.id && (
          <div className="mt-4">
            <h3 className="mb-3 text-xs font-semibold text-slate-900 dark:text-zinc-100 uppercase tracking-wider">Audit History</h3>
            <AuditTimeline logs={auditLogs ?? undefined} />
          </div>
        )}
      </div>
    </div>
      <ChangeRequestDrawer
        request={req}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </>
  )
}
