'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { ChangeRequest, RequestAuditLog, RequestAttachment } from '@/lib/supabase/client'
import { supabase } from '@/lib/supabase/client'
import { STAGE_STEPS, STAGE_LABELS, APPROVER_FIELD } from '@/lib/constants'
import AuditTimeline from './AuditTimeline'
import AttachmentUpload from './AttachmentUpload'
import AttachmentList from './AttachmentList'
import SitePhotoCapture from './SitePhotoCapture'
import { getRequestActivities, getRequestAttachments, getAttachmentPreviewUrl } from '@/app/actions'

interface ChangeRequestDrawerProps {
  request: ChangeRequest | null
  isOpen: boolean
  onClose: () => void
}

export default function ChangeRequestDrawer({ request, isOpen, onClose }: ChangeRequestDrawerProps) {
const [isAnimating, setIsAnimating] = useState(false)
   const [auditLogs, setAuditLogs] = useState<Record<string, RequestAuditLog[]>>({})
   const [activities, setActivities] = useState<{ serial_number: number; activity: string; unit: string | null; length: number | null; width: number | null; depth: number | null; contract_qty: string | null; executed_qty: string | null; reason: string | null }[]>([])
   const [isLoadingActivities, setIsLoadingActivities] = useState(false)
   const [sitePhotos, setSitePhotos] = useState<RequestAttachment[]>([])
   const [isLoadingPhotos, setIsLoadingPhotos] = useState(false)
   const [attachmentListVersion, setAttachmentListVersion] = useState(0)

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsAnimating(true)
    }
  }, [isOpen])

  useEffect(() => {
    if (request?.id) {
      const fetchAuditLogs = async () => {
        const { data } = await supabase
          .from('request_audit_log')
          .select('*')
          .eq('request_id', request.id)
          .order('timestamp', { ascending: false })

        setAuditLogs(prev => ({
          ...prev,
          [request.id]: data || []
        }))
      }
      fetchAuditLogs()
    }
  }, [request?.id])

  useEffect(() => {
    if (!request?.id) return
    let isMounted = true
    const fetchActivities = async () => {
      setIsLoadingActivities(true)
      try {
        const { data, error } = await getRequestActivities(request.id)
        if (!isMounted) return
        if (error) {
          console.error('Failed to fetch activities:', error)
          setActivities([])
        } else {
          setActivities(data ?? [])
        }
      } catch {
        if (isMounted) setActivities([])
      } finally {
        if (isMounted) setIsLoadingActivities(false)
      }
    }
    fetchActivities()
    return () => {
      isMounted = false
    }
  }, [request?.id])

  useEffect(() => {
    if (!request?.id) return
    let isMounted = true
    const fetchSitePhotos = async () => {
      setIsLoadingPhotos(true)
      try {
        const { data, error } = await getRequestAttachments(request.id)
        if (!isMounted) return
        if (error) {
          setSitePhotos([])
        } else {
          const images = (data ?? []).filter(
            (a) => a.mime_type.startsWith('image/') && (a.description || '').toLowerCase().includes('site photo')
          )
          setSitePhotos(images)
        }
      } catch {
        if (isMounted) setSitePhotos([])
      } finally {
        if (isMounted) setIsLoadingPhotos(false)
      }
    }
    fetchSitePhotos()
    return () => {
      isMounted = false
    }
  }, [request?.id])

  const handleClose = () => {
    setIsAnimating(false)
    setTimeout(onClose, 300)
  }

  const formatDate = (value: string | null) => {
    if (!value) return '—'
    try {
      return new Date(value).toLocaleString('en-US')
    } catch {
      return '—'
    }
  }

  /** Latest target name for a stage action from audit logs. */
  const getLatestAuditTarget = (
    stage: string,
    logs: RequestAuditLog[],
    action: 'DELEGATE' | 'ESCALATE',
    commentPattern: RegExp
  ): string | null => {
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

  const getDelegatedToForStage = (stage: string, logs: RequestAuditLog[]): string | null =>
    getLatestAuditTarget(stage, logs, 'DELEGATE', /Delegated approval to\s+(.+)/i)

  const getEscalatedToForStage = (stage: string, logs: RequestAuditLog[]): string | null =>
    getLatestAuditTarget(stage, logs, 'ESCALATE', /Escalated to\s+(.+)/i)

  if (!request) return null

  return (
    <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${isAnimating ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} aria-hidden="true">
      <div className="absolute inset-0 bg-slate-900/50 dark:bg-zinc-900/70" onClick={onClose} />

      <div className={`absolute bottom-0 right-0 top-0 w-full max-w-2xl transform transition-transform duration-300 ${isAnimating ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex h-full flex-col bg-white dark:bg-zinc-900 shadow-xl">
          <div className="flex min-h-0 flex-1 flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-emerald-200 dark:border-emerald-900/70 bg-[#00ab4e] dark:bg-[#008C4A] px-4 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <img
                  src="/logo.png"
                  alt="Ethio Telecom"
                  className="h-10 w-10 rounded-md object-contain bg-white dark:bg-emerald-950/40 p-0.5 shadow-sm"
                />
                <div>
                  <h2 className="text-lg font-semibold text-white dark:text-emerald-50">Request Details</h2>
                  <p className="mt-1 text-sm text-emerald-100 dark:text-emerald-200">#{request?.project_number || request?.id?.slice(0, 8)}</p>
                </div>
              </div>
              <button
                type="button"
                className="rounded-md bg-white/90 dark:bg-emerald-950/60 text-[#008C4A] dark:text-emerald-100 hover:bg-white dark:hover:bg-emerald-900"
                onClick={handleClose}
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="space-y-6">
                 {/* Header Information */}
                 <section className="space-y-4">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Header Information</h3>
                    {request.change_number && (
                      <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/20 p-3">
                        <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Change Number</span>
                        <p className="mt-1 font-mono text-lg font-bold text-emerald-900 dark:text-emerald-100">{request.change_number}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200/80 dark:border-zinc-800/80 bg-slate-50/30 dark:bg-zinc-800/20 p-4">
                     <div>
                      <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">Project Name</span>
                      <p className="mt-1 text-sm font-medium text-slate-900 dark:text-zinc-100">{request.project_name}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">Project Number</span>
                      <p className="mt-1 text-sm font-medium text-slate-900 dark:text-zinc-100">{request.project_number || '—'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">Initiator</span>
                      <p className="mt-1 text-sm text-slate-700 dark:text-zinc-300">{request.initiator_name || request.initiated_by || '—'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">Priority Level</span>
                      <p className="mt-1 text-sm text-slate-700 dark:text-zinc-300">{request.priority_level || '—'}</p>
                    </div>
                    {request.change_type && (
                      <div>
                        <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">Type of Change</span>
                        <p className="mt-1 text-sm text-slate-700 dark:text-zinc-300">{request.change_type}</p>
                      </div>
                    )}
                    {request.work_order && (
                      <div className="sm:col-span-2">
                        <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">Work Order (WO)</span>
                        <p className="mt-1 text-sm font-medium text-slate-900 dark:text-zinc-100">{request.work_order}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">Status</span>
                      <p className="mt-1">
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-800">
                          {(request.status || '').replace(/_/g, ' ')}
                        </span>
                      </p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">Created</span>
                      <p className="mt-1 text-sm text-slate-700 dark:text-zinc-300">{formatDate(request.created_at)}</p>
                    </div>
                  </div>
                </section>

                {/* Workflow Route Assignment */}
                <section className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Workflow Route Assignment</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-lg border border-slate-200/80 dark:border-zinc-800/80 bg-slate-50/30 dark:bg-zinc-800/20 p-3">
                      <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">Fixed Network Approver</span>
                      <p className="mt-1 text-sm text-slate-900 dark:text-zinc-100">{request.fixed_network_approver || '—'}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200/80 dark:border-zinc-800/80 bg-slate-50/30 dark:bg-zinc-800/20 p-3">
                      <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">Wire Line Planning Approver</span>
                      <p className="mt-1 text-sm text-slate-900 dark:text-zinc-100">{request.wire_line_approver || '—'}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200/80 dark:border-zinc-800/80 bg-slate-50/30 dark:bg-zinc-800/20 p-3">
                      <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">Engineering Approver</span>
                      <p className="mt-1 text-sm text-slate-900 dark:text-zinc-100">{request.engineering_approver || '—'}</p>
                    </div>
                  </div>
                </section>

                 {/* Location & Route Details */}
                 <section className="space-y-4">
                   <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Location & Route Details</h3>
                    <div className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200/80 dark:border-zinc-800/80 bg-slate-50/30 dark:bg-zinc-800/20 p-4">
                      {(() => {
                        let lat = ''
                        let lng = ''
                        const raw = request.site_coordinates || ''
                        const parts = raw.split(',').map((s) => s.trim()).filter(Boolean)
                        if (parts.length >= 2) {
                          lat = parts[0]
                          lng = parts[1]
                        } else if (sitePhotos.length > 0 && sitePhotos[0].latitude != null && sitePhotos[0].longitude != null) {
                          lat = String(sitePhotos[0].latitude)
                          lng = String(sitePhotos[0].longitude)
                        }
                        const hasCoords = lat.length > 0 && lng.length > 0
                        if (!hasCoords) return null
                        return (
                          <>
                            <div>
                              <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">Latitude:</span>
                              <p className="mt-1 text-sm text-slate-700 dark:text-zinc-300">{lat}</p>
                            </div>
                            <div>
                              <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">Longitude:</span>
                              <p className="mt-1 text-sm text-slate-700 dark:text-zinc-300">{lng}</p>
                            </div>
                          </>
                        )
                      })()}
                     <div>
                       <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">Target Segments</span>
                       <p className="mt-1 text-sm text-slate-700 dark:text-zinc-300">{request.target_segments || '—'}</p>
                     </div>
                     <div className="col-span-2">
                       <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">Route Impact</span>
                       <p className="mt-1 text-sm text-slate-700 dark:text-zinc-300">{request.route_impact || '—'}</p>
                     </div>
                     <div className="col-span-2">
                       <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">Route Deviations</span>
                       <p className="mt-1 text-sm text-slate-700 dark:text-zinc-300">{request.route_deviations || '—'}</p>
                     </div>
                   </div>

                   {/* Site Photos */}
                   <div className="rounded-lg border border-slate-200/80 dark:border-zinc-800/80 bg-slate-50/30 dark:bg-zinc-800/20 p-4 space-y-4">
                     <h4 className="text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Site Photos</h4>
                     {isLoadingPhotos ? (
                       <p className="text-sm text-slate-500 dark:text-zinc-400">Loading photos...</p>
                     ) : sitePhotos.length === 0 ? (
                       <p className="text-sm text-slate-500 dark:text-zinc-400 italic">No site photos captured yet.</p>
                     ) : (
                       <div className="grid grid-cols-2 gap-3">
                         {sitePhotos.map((photo) => (
                           <div key={photo.id} className="overflow-hidden rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                             <img
                               src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/request-attachments/${photo.file_path}`}
                               alt={photo.original_filename}
                               className="w-full h-40 object-cover"
                               onClick={async () => {
                                 const { url } = await getAttachmentPreviewUrl(photo.file_path)
                                 if (url) window.open(url, '_blank')
                               }}
                             />
                             <div className="p-2 space-y-1">
                               <p className="text-xs font-medium text-slate-900 dark:text-zinc-100 truncate">{photo.original_filename}</p>
                               {photo.latitude != null && photo.longitude != null ? (
                                 <p className="text-[10px] text-slate-500 dark:text-zinc-400">
                                   GPS: {Number(photo.latitude).toFixed(6)}, {Number(photo.longitude).toFixed(6)}
                                 </p>
                               ) : (
                                 <p className="text-[10px] text-slate-400 dark:text-zinc-500">No GPS data</p>
                               )}
                             </div>
                           </div>
                         ))}
                       </div>
                     )}
                     <SitePhotoCapture
                       requestId={request.id}
                       onPhotoUploaded={(attachment) => {
                         setSitePhotos((prev) => {
                           if (prev.some((p) => p.id === attachment.id)) return prev
                           return [attachment, ...prev]
                         })
                       }}
                     />
                   </div>
                 </section>

                {/* Technical Specifications */}
                <section className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Technical Specifications</h3>
                  <div className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200/80 dark:border-zinc-800/80 bg-slate-50/30 dark:bg-zinc-800/20 p-4">
                    <div>
                      <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">Duct Sizes</span>
                      <p className="mt-1 text-sm text-slate-700 dark:text-zinc-300">{request.duct_sizes || '—'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">Estimated Downtime</span>
                      <p className="mt-1 text-sm text-slate-700 dark:text-zinc-300">{request.estimated_downtime || '—'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">Material Cost Variation</span>
                      <p className="mt-1 text-sm text-slate-700 dark:text-zinc-300">{request.material_cost_variation || '—'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">Priority Level</span>
                      <p className="mt-1 text-sm text-slate-700 dark:text-zinc-300">{request.priority_level || '—'}</p>
                    </div>
                    {request.technical_reason && (
                      <div className="col-span-2">
                        <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">Technical Reason</span>
                        <p className="mt-1 text-sm text-slate-700 dark:text-zinc-300">{request.technical_reason}</p>
                      </div>
                    )}
                  </div>
                 </section>

                 {/* Main Activities */}
                 <section className="space-y-4">
                   <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Main Activities</h3>
                   <div className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-zinc-800/80">
                     {isLoadingActivities ? (
                       <div className="p-4 text-sm text-slate-500 dark:text-zinc-400">Loading activities...</div>
                     ) : activities.length === 0 ? (
                       <div className="p-4 text-sm text-slate-500 dark:text-zinc-400 italic">No activities recorded.</div>
                     ) : (
                       <div className="overflow-x-auto">
                         <table className="min-w-full divide-y divide-slate-200/80 dark:divide-zinc-800/80">
                           <thead className="bg-slate-50/50 dark:bg-zinc-800/30">
                             <tr>
                               <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-zinc-400">S/No</th>
                               <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-zinc-400">Activity</th>
                               <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-zinc-400">Unit</th>
                               <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-zinc-400">L (m)</th>
                               <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-zinc-400">W (m)</th>
                               <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-zinc-400">D (m)</th>
                               <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-zinc-400">Contract Qty</th>
                               <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-zinc-400">Executed Qty</th>
                               <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-zinc-400">Reason</th>
                             </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-200/50 dark:divide-zinc-800/50 bg-white dark:bg-zinc-900">
                             {activities.map((act) => (
                               <tr key={act.serial_number}>
                                 <td className="whitespace-nowrap px-3 py-2 text-sm text-slate-600 dark:text-zinc-300">{act.serial_number}</td>
                                 <td className="px-3 py-2 text-sm text-slate-700 dark:text-zinc-300">{act.activity || '—'}</td>
                                 <td className="px-3 py-2 text-sm text-slate-700 dark:text-zinc-300">{act.unit || '—'}</td>
                                 <td className="px-3 py-2 text-sm text-slate-700 dark:text-zinc-300">{act.length != null ? act.length : '—'}</td>
                                 <td className="px-3 py-2 text-sm text-slate-700 dark:text-zinc-300">{act.width != null ? act.width : '—'}</td>
                                 <td className="px-3 py-2 text-sm text-slate-700 dark:text-zinc-300">{act.depth != null ? act.depth : '—'}</td>
                                 <td className="px-3 py-2 text-sm text-slate-700 dark:text-zinc-300">{act.contract_qty || '—'}</td>
                                 <td className="px-3 py-2 text-sm text-slate-700 dark:text-zinc-300">{act.executed_qty || '—'}</td>
                                 <td className="px-3 py-2 text-sm text-slate-700 dark:text-zinc-300">{act.reason || '—'}</td>
                               </tr>
                             ))}
                           </tbody>
                         </table>
                       </div>
                     )}
                   </div>
                 </section>

                 {/* Business Impact & Justification */}
                <section className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Business Impact & Justification</h3>
                  <div className="rounded-lg border border-slate-200/80 dark:border-zinc-800/80 bg-slate-50/30 dark:bg-zinc-800/20 p-4 space-y-4">
                    {request.description && (
                      <div>
                        <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">Description</span>
                        <p className="mt-1 text-sm text-slate-700 dark:text-zinc-300 whitespace-pre-wrap">{request.description}</p>
                      </div>
                    )}
                    {request.change_description && (
                      <div>
                        <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">Change Description</span>
                        <p className="mt-1 text-sm text-slate-700 dark:text-zinc-300 whitespace-pre-wrap">{request.change_description}</p>
                      </div>
                    )}
                    {!request.description && !request.change_description && (
                      <p className="text-sm text-slate-500 dark:text-zinc-400 italic">No business impact details provided.</p>
                    )}
                  </div>
                </section>

{/* Attachments */}
                  <section className="space-y-4">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Attachments</h3>
                    <AttachmentList 
                      key={`attachment-list-${attachmentListVersion}`} 
                      requestId={request.id} 
                      hideHeading
                      excludeSitePhotos
                    />
                    <AttachmentUpload 
                      requestId={request.id} 
                      hideHeading
                      onUploaded={() => setAttachmentListVersion(v => v + 1)} 
                    />
                  </section>

                {/* Approval Progress Tracker */}
                <section className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Approval Progress Tracker</h3>
                  <div className="rounded-lg border border-slate-200/80 dark:border-zinc-800/80 bg-slate-50/30 dark:bg-zinc-800/20 p-4">
                    <ol className="relative ml-4 space-y-6 border-l border-slate-300 dark:border-zinc-700">
                      {STAGE_STEPS.map((stage, idx) => {
                        const isActive = request.status === stage
                        const isComplete = stage === 'DRAFT' || (request.status === 'APPROVED' && stage === 'APPROVED') || (request.status !== 'APPROVED' && stage !== request.status && stage !== 'APPROVED')
                        const approverField = APPROVER_FIELD[stage]
                        const approverName = approverField ? (request as Record<string, string | null | undefined>)?.[approverField] : null
                        const logs = auditLogs[request.id] ?? []
                        const delegatedTo = getDelegatedToForStage(stage, logs)
                        const escalatedTo = getEscalatedToForStage(stage, logs)
                        const stageLabel = STAGE_LABELS[stage]
                        const timelineLabel = [
                          stageLabel,
                          approverName ? `- ${approverName}` : null,
                          delegatedTo ? `(Delegated to ${delegatedTo})` : null,
                          escalatedTo ? `(Escalated to ${escalatedTo})` : null,
                        ]
                          .filter(Boolean)
                          .join(' ')

                        return (
                          <li key={stage} className="relative">
                            <div className={`absolute -left-5 flex h-8 w-8 items-center justify-center rounded-full border-2 ${isActive ? 'border-teal-600 bg-teal-600' : isComplete ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900'}`}>
                              <span className={`text-xs font-medium ${isActive || isComplete ? 'text-white' : 'text-slate-500 dark:text-zinc-400'}`}>{idx + 1}</span>
                            </div>
                            <div className="ml-6">
                              <p className={`text-sm font-medium ${isActive ? 'text-teal-900 dark:text-teal-300' : isComplete ? 'text-emerald-900 dark:text-emerald-300' : 'text-slate-500 dark:text-zinc-400'}`}>
                                {timelineLabel}
                              </p>
                              {approverField && !approverName && (
                                <p className="text-xs mt-0.5 text-slate-400 dark:text-zinc-500 italic">
                                  Unassigned
                                </p>
                              )}
                            </div>
                          </li>
                        )
                      })}
                    </ol>
                  </div>
                </section>

                {/* Audit History */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Audit History</h3>
                    <Link
                      href={`/requests/${request.id}/audit`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#00A651] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#008C4A] transition-colors"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v12.75c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V13.5" />
                      </svg>
                      Open Audit Log
                    </Link>
                  </div>
                  <AuditTimeline logs={auditLogs[request?.id] ?? []} />
                </section>
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-shrink-0 justify-end border-t border-slate-200/80 dark:border-zinc-800 px-4 py-4 sm:px-6">
              <button type="button" className="rounded-lg bg-white dark:bg-zinc-800 px-3 py-2 text-sm font-medium text-slate-700 dark:text-zinc-300" onClick={handleClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
