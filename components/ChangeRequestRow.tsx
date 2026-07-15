'use client'
import { generatePdf, RequestData, Activity } from '@/lib/generatePdf';
import { supabase } from '@/lib/supabase/client';
import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { ChangeRequest, RequestAuditLog } from '@/lib/supabase/client.ts'
import type { RequestWithAudit } from '@/hooks/useChangeRequests'
import { ROLE_ACCESS } from '@/hooks/useChangeRequests'
import { STATUS_STYLES, STATUS_DOT_COLORS, STAGE_STEPS, STAGE_LABELS, APPROVER_FIELD, isStatus } from '@/lib/constants'
import StatusButtons from '@/components/StatusButtons'
import ChangeRequestDrawer from '@/components/ChangeRequestDrawer'

import { getRequestActivities, getRequestAttachments } from '@/app/actions'

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
  length: number | null
  width: number | null
  depth: number | null
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

function getLatestAuditTarget(
  stage: string,
  logs: RequestAuditLog[] | undefined,
  action: 'DELEGATE' | 'ESCALATE',
  commentPattern: RegExp
): string | null {
  if (!logs?.length) return null

  const matching = logs.filter(
    (log) =>
      log.action === action &&
      (log.previous_status === stage || log.new_status === stage)
  )
  if (matching.length === 0) return null

  const latest = [...matching].sort((a, b) => {
    const aTime = new Date(a.timestamp || a.created_at || 0).getTime()
    const bTime = new Date(b.timestamp || b.created_at || 0).getTime()
    return bTime - aTime
  })[0]

  return latest.comment?.match(commentPattern)?.[1]?.trim() || null
}

function getDelegatedToForStage(stage: string, logs: RequestAuditLog[] | undefined): string | null {
  return getLatestAuditTarget(stage, logs, 'DELEGATE', /Delegated approval to\s+(.+)/i)
}

function getEscalatedToForStage(stage: string, logs: RequestAuditLog[] | undefined): string | null {
  return getLatestAuditTarget(stage, logs, 'ESCALATE', /Escalated to\s+(.+)/i)
}

function DepartmentTimeline({ status, auditLogs, approvers }: { status: string | null; auditLogs: RequestAuditLog[] | undefined; approvers: { fixed_network_approver: string | null; wire_line_approver: string | null; engineering_approver: string | null } }) {
  const steps = STAGE_STEPS
  const completed = auditLogs?.map((entry) => entry.new_status).filter(Boolean) as string[] ?? []
  const stageLabels = STAGE_LABELS

  return (
    <ol className="mt-4 space-y-2">
      {steps.map((step) => {
        const isComplete = completed.includes(step)
        const isCurrent = step === status
        const approverField = APPROVER_FIELD[step] as keyof typeof approvers | undefined
        const approverName = approverField ? approvers[approverField] : null
        const delegatedTo = getDelegatedToForStage(step, auditLogs)
        const escalatedTo = getEscalatedToForStage(step, auditLogs)
        const timelineLabel = [
          stageLabels[step] || step,
          approverName ? `- ${approverName}` : null,
          delegatedTo ? `(Delegated to ${delegatedTo})` : null,
          escalatedTo ? `(Escalated to ${escalatedTo})` : null,
        ]
          .filter(Boolean)
          .join(' ')

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
            <div className="flex-1 min-w-0">
              <span
                className={
                  isCurrent
                    ? 'text-sm font-semibold text-teal-900 dark:text-teal-300'
                    : isComplete
                      ? 'text-sm font-medium text-emerald-800 dark:text-emerald-300'
                      : 'text-sm text-slate-500 dark:text-zinc-400'
                }
              >
                {timelineLabel}
              </span>
            </div>
            {isCurrent && <span className="text-xs text-slate-500 dark:text-zinc-400 shrink-0">(current)</span>}
          </li>
        )
      })}
    </ol>
  )
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('en-US')
  } catch {
    return '—'
  }
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

    // Fetch audit logs
    useEffect(() => {
      let isMounted = true;
  
      const fetchAuditLogs = async () => {
        if (!req.id) return;
  
        setIsLoading(true);
  
        try {
          const { data: { user } } = await supabase.auth.getUser();
  
          if (!user) {
            console.warn('User not authenticated for audit logs');
            if (isMounted) setAuditLogs([]);
            return;
          }
  
          const { data, error } = await supabase
            .from('request_audit_log')
            .select('*')
            .eq('request_id', req.id)
            .order('timestamp', { ascending: false });
  
          if (!isMounted) return;
  
          if (error) {
            console.error('Failed to fetch audit logs:', error);
            setAuditLogs([]);
          } else {
            setAuditLogs(data ?? []);
          }
        } catch (err) {
          console.error('Failed to fetch audit logs:', err);
          if (isMounted) setAuditLogs([]);
        } finally {
          if (isMounted) setIsLoading(false);
        }
      };
  
      fetchAuditLogs();
  
      return () => {
        isMounted = false;
      };
    }, [req.id]);

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true)
    setPdfError(null)

    try {
      const { data: activities, error } = await getRequestActivities(req.id)

      if (error) {
        throw new Error(error)
      }

      const { data: attachments } = await getRequestAttachments(req.id)
      const sitePhotos = (attachments ?? [])
        .filter((a) => a.mime_type.startsWith('image/'))
        .map((a) => ({
          url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/request-attachments/${a.file_path}`,
          latitude: a.latitude ?? null,
          longitude: a.longitude ?? null,
        }))

      const regularAttachments = (attachments ?? [])
        .filter((a) => !a.mime_type.startsWith('image/'))
        .map((a) => ({
          original_filename: a.original_filename,
          file_size: a.file_size,
          mime_type: a.mime_type,
          file_path: a.file_path,
        }))

      const imageAttachmentsForPdf = (attachments ?? [])
        .filter((a) => a.mime_type.startsWith('image/'))
        .map((a) => ({
          original_filename: a.original_filename,
          file_size: a.file_size,
          mime_type: a.mime_type,
          file_path: a.file_path,
          latitude: a.latitude ?? null,
          longitude: a.longitude ?? null,
        }))

      const requestForPdf: RequestData = {
        project_name: req.project_name ?? '—',
        project_number: projectNumber,
        change_number: req.change_number ?? null,
        change_type: req.change_type ?? null,
        initiator_name: req.initiator_name ?? '—',
        change_description: description ?? '',
        description: req.description ?? '',
        priority_level: priority,
        status: req.status ?? '',
        created_at: req.created_at ?? new Date().toISOString(),
        updated_at: req.updated_at ?? new Date().toISOString(),
        site_coordinates: req.site_coordinates ?? '',
        latitude: (() => {
          const raw = req.site_coordinates || ''
          const parts = raw.split(',').map((s) => s.trim()).filter(Boolean)
          const lat = parts[0]
          return lat ? Number(lat) : null
        })(),
        longitude: (() => {
          const raw = req.site_coordinates || ''
          const parts = raw.split(',').map((s) => s.trim()).filter(Boolean)
          const lng = parts[1]
          return lng ? Number(lng) : null
        })(),
        route_impact: req.route_impact ?? '',
        duct_sizes: req.duct_sizes ?? '',
        material_cost_variation: req.material_cost_variation ?? '',
        route_deviations: req.route_deviations ?? '',
        estimated_downtime: req.estimated_downtime ?? '',
        technical_reason: req.technical_reason ?? '',
        target_segments: req.target_segments ?? '',
        fixed_network_approver: req.fixed_network_approver ?? '',
        wire_line_approver: req.wire_line_approver ?? '',
        engineering_approver: req.engineering_approver ?? '',
        attachments: [...regularAttachments, ...imageAttachmentsForPdf],
        site_photos: sitePhotos,
      }

      const typedActivities = (activities ?? []) as RequestActivityForPdf[]

      const activitiesForPdf: Activity[] = typedActivities.map((activity) => ({
        serial_number: activity.serial_number,
        activity: activity.activity,
        unit: activity.unit ?? '—',
        length: activity.length ?? null,
        width: activity.width ?? null,
        depth: activity.depth ?? null,
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
          <Link
            href={`/requests/${req.id}/audit`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#00A651] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#008C4A] transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v12.75c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V13.5" />
            </svg>
            Audit Log
          </Link>
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
        <DepartmentTimeline status={req.status} auditLogs={auditLogs ?? undefined} approvers={{ fixed_network_approver: req.fixed_network_approver, wire_line_approver: req.wire_line_approver, engineering_approver: req.engineering_approver }} />
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
