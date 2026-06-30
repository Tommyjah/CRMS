'use client'

import { useState, useEffect } from 'react'
import type { ChangeRequest } from '@/lib/supabase/client'
import { STAGE_STEPS, STAGE_LABELS, APPROVER_FIELD, isStatus } from '@/lib/constants'

interface ChangeRequestDrawerProps {
  request: ChangeRequest | null
  isOpen: boolean
  onClose: () => void
}

export default function ChangeRequestDrawer({ request, isOpen, onClose }: ChangeRequestDrawerProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true)
    }
  }, [isOpen])

  const handleClose = () => {
    setIsAnimating(false)
    setTimeout(onClose, 300)
  }

  const formatDate = (value: string | null) => {
    if (!value) return '—'
    return new Date(value).toLocaleString()
  }

  if (!request) return null

return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-300 ${
        isAnimating ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-slate-900/50 dark:bg-zinc-900/70" onClick={onClose} />
      
      <div
        className={`absolute bottom-0 right-0 top-0 w-full max-w-2xl transform transition-transform duration-300 ${
          isAnimating ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col bg-white dark:bg-zinc-900 shadow-xl">
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30 px-4 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">Request Details</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
                  #{request?.project_number || request?.id?.slice(0, 8)}
                </p>
              </div>
              <button
                type="button"
                className="rounded-md bg-white dark:bg-zinc-800 text-slate-400 dark:text-zinc-400 hover:text-slate-600 dark:hover:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-colors"
                onClick={handleClose}
              >
                <span className="sr-only">Close panel</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="space-y-6">
                <section className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Header Information</h3>
                  <div className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200/80 dark:border-zinc-800/80 bg-slate-50/30 dark:bg-zinc-800/20 p-4">
                    <div>
                      <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">Title</span>
                      <p className="mt-1 text-sm font-medium text-slate-900 dark:text-zinc-100">{request?.project_name || '—'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">Created</span>
                      <p className="mt-1 text-sm text-slate-700 dark:text-zinc-300">{formatDate(request?.created_at)}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">Initiator</span>
                      <p className="mt-1 text-sm text-slate-700 dark:text-zinc-300">{request?.initiated_by || request?.initiator_name || '—'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">Status</span>
                      <p className="mt-1">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          request?.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400' :
                          request?.status === 'REJECTED' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-400' :
                          isStatus(request?.status) && request.status.startsWith('PENDING') ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400' :
                          'bg-slate-100 text-slate-800 dark:bg-zinc-800/50 dark:text-zinc-300'
                        }`}>
                          {request?.status?.replace(/_/g, ' ') || '—'}
                        </span>
                      </p>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Location & Route Details</h3>
                  <div className="grid grid-cols-3 gap-4 rounded-lg border border-slate-200/80 dark:border-zinc-800/80 bg-slate-50/30 dark:bg-zinc-800/20 p-4">
                    <div>
                      <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">Target Segments</span>
                      <p className={`mt-1 text-sm text-slate-700 dark:text-zinc-300 ${!request?.target_segments ? 'italic text-slate-400 dark:text-zinc-500' : ''}`}>{request?.target_segments || 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">Site Coordinates</span>
                      <p className={`mt-1 text-sm text-slate-700 dark:text-zinc-300 ${!request?.site_coordinates ? 'italic text-slate-400 dark:text-zinc-500' : ''}`}>{request?.site_coordinates || 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">Route Impact</span>
                      <p className={`mt-1 text-sm text-slate-700 dark:text-zinc-300 ${!request?.route_impact ? 'italic text-slate-400 dark:text-zinc-500' : ''}`}>{request?.route_impact || 'Not specified'}</p>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Technical Specifications</h3>
                  <div className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200/80 dark:border-zinc-800/80 bg-slate-50/30 dark:bg-zinc-800/20 p-4">
                    <div>
                      <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">Duct Sizes</span>
                      <p className={`mt-1 text-sm text-slate-700 dark:text-zinc-300 ${!request?.duct_sizes ? 'italic text-slate-400 dark:text-zinc-500' : ''}`}>{request?.duct_sizes || 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">Material Cost Variation</span>
                      <p className={`mt-1 text-sm text-slate-700 dark:text-zinc-300 ${!request?.material_cost_variation ? 'italic text-slate-400 dark:text-zinc-500' : ''}`}>{request?.material_cost_variation || 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">Route Deviations</span>
                      <p className={`mt-1 text-sm text-slate-700 dark:text-zinc-300 ${!request?.route_deviations ? 'italic text-slate-400 dark:text-zinc-500' : ''}`}>{request?.route_deviations || 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">Estimated Downtime</span>
                      <p className={`mt-1 text-sm text-slate-700 dark:text-zinc-300 ${!request?.estimated_downtime ? 'italic text-slate-400 dark:text-zinc-500' : ''}`}>{request?.estimated_downtime || 'Not specified'}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">Proposed Change</span>
                      <p className="mt-1 text-sm text-slate-700 dark:text-zinc-300 whitespace-pre-wrap">{request?.change_description || '—'}</p>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Business Impact & Justification</h3>
                  <div className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200/80 dark:border-zinc-800/80 bg-slate-50/30 dark:bg-zinc-800/20 p-4">
                    <div>
                      <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">Technical Engineering Reason / Justification</span>
                      <div className="mt-1 rounded-r-lg border-l-2 border-teal-500 bg-slate-50 dark:bg-zinc-800/40 p-3">
                        <p className={`text-sm text-slate-700 dark:text-zinc-300 whitespace-pre-wrap ${!request?.technical_reason ? 'italic text-slate-400 dark:text-zinc-500' : ''}`}>{request?.technical_reason || 'Not specified'}</p>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">Priority Level</span>
                      <p className="mt-1 text-sm text-slate-700 dark:text-zinc-300">{request?.priority_level || '—'}</p>
                    </div>
                  </div>
                </section>

                 <section className="space-y-4">
                   <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Approval Progress Tracker</h3>
                   <div className="rounded-lg border border-slate-200/80 dark:border-zinc-800/80 bg-slate-50/30 dark:bg-zinc-800/20 p-4">
                     <ol className="relative ml-4 space-y-6 border-l border-slate-300 dark:border-zinc-700">
                       {STAGE_STEPS.map((stage, idx) => {
                         const isActive = request?.status === stage
                         const isComplete = stage === 'DRAFT' || (request?.status === 'APPROVED' && stage === 'APPROVED') || (request?.status !== 'APPROVED' && stage !== request?.status && stage !== 'APPROVED')
                         const approverField = APPROVER_FIELD[stage]
                         const approverName = approverField ? (request as Record<string, string | null | undefined>)?.[approverField] : null
                         return (
                           <li key={stage} className="relative">
                             <div className={`absolute -left-5 flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                               isActive ? 'border-teal-600 bg-teal-600 ring-4 ring-teal-500/20 animate-pulse' : isComplete ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900'
                             }`}>
                               <span className={`text-xs font-medium ${isActive || isComplete ? 'text-white' : 'text-slate-500 dark:text-zinc-400'}`}>
                                 {idx + 1}
                               </span>
                             </div>
                             <div className="ml-6">
                               <p className={`text-sm font-medium ${isActive ? 'text-teal-900 dark:text-teal-300' : isComplete ? 'text-emerald-900 dark:text-emerald-300' : 'text-slate-500 dark:text-zinc-400'}`}>
                                 {STAGE_LABELS[stage]}
                               </p>
                               {approverField && (
                                 <p className={`text-xs mt-0.5 ${approverName ? 'text-teal-600 dark:text-teal-400 font-medium' : 'text-slate-400 dark:text-zinc-500 italic'}`}>
                                   {approverName ? `Assigned: ${approverName}` : 'Unassigned'}
                                 </p>
                               )}
                             </div>
                           </li>
                         )
                       })}
                     </ol>
                   </div>
                 </section>
              </div>
            </div>

            <div className="flex flex-shrink-0 justify-end border-t border-slate-200/80 dark:border-zinc-800 px-4 py-4 sm:px-6">
              <button
                type="button"
                className="rounded-lg bg-white dark:bg-zinc-800 px-3 py-2 text-sm font-medium text-slate-700 dark:text-zinc-300 shadow-sm ring-1 ring-slate-300 dark:ring-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors"
                onClick={handleClose}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}