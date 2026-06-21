'use client'

import { useState, useEffect } from 'react'

interface ChangeRequestDrawerProps {
  request: any
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
      <div className="absolute inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
      
      <div
        className={`absolute bottom-0 right-0 top-0 w-full max-w-2xl transform transition-transform duration-300 ${
          isAnimating ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col bg-white shadow-xl">
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between bg-gray-50 px-4 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-medium text-gray-900">Request Details</h2>
                <p className="mt-1 text-sm text-gray-500">
                  #{request?.project_number || request?.id?.slice(0, 8)}
                </p>
              </div>
              <button
                type="button"
                className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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
                  <h3 className="text-sm font-semibold text-gray-900">Header Information</h3>
                  <div className="grid grid-cols-2 gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div>
                      <span className="text-xs font-medium text-gray-500">Title</span>
                      <p className="mt-1 text-sm font-medium text-gray-900">{request?.project_name || '—'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-500">Created</span>
                      <p className="mt-1 text-sm text-gray-900">{formatDate(request?.created_at)}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-500">Initiator</span>
                      <p className="mt-1 text-sm text-gray-900">{request?.initiated_by || request?.initiator_name || '—'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-500">Status</span>
                      <p className="mt-1">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          request?.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                          request?.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {request?.status?.replace(/_/g, ' ') || '—'}
                        </span>
                      </p>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900">Location & Route</h3>
                  <div className="grid grid-cols-2 gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div className="col-span-2">
                      <span className="text-xs font-medium text-gray-500">Target Segments</span>
                      <p className="mt-1 text-sm text-gray-900">—</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-500">Route Impact</span>
                      <p className="mt-1 text-sm text-gray-900">—</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-500">Site Coordinates</span>
                      <p className="mt-1 text-sm text-gray-900">—</p>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900">Location & Route Details</h3>
                  <div className="grid grid-cols-2 gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div>
                      <span className="text-xs font-medium text-gray-500">Target Segments</span>
                      <p className="mt-1 text-sm text-gray-900">{request?.target_segments || '—'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-500">Site Coordinates</span>
                      <p className="mt-1 text-sm text-gray-900">{request?.site_coordinates || '—'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-500">Route Impact</span>
                      <p className="mt-1 text-sm text-gray-900">{request?.route_impact || '—'}</p>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900">Technical Specifications</h3>
                  <div className="grid grid-cols-2 gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div>
                      <span className="text-xs font-medium text-gray-500">Duct Sizes</span>
                      <p className="mt-1 text-sm text-gray-900">{request?.duct_sizes || '—'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-500">Material Cost Variation</span>
                      <p className="mt-1 text-sm text-gray-900">{request?.material_cost_variation || '—'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-500">Route Deviations</span>
                      <p className="mt-1 text-sm text-gray-900">{request?.route_deviations || '—'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-500">Estimated Downtime</span>
                      <p className="mt-1 text-sm text-gray-900">{request?.estimated_downtime || '—'}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-xs font-medium text-gray-500">Proposed Change</span>
                      <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{request?.change_description || '—'}</p>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900">Business Impact & Justification</h3>
                  <div className="grid grid-cols-1 gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div>
                      <span className="text-xs font-medium text-gray-500">Technical Engineering Reason / Justification</span>
                      <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{request?.technical_reason || '—'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-500">Priority Level</span>
                      <p className="mt-1 text-sm text-gray-900">{request?.priority_level || '—'}</p>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900">Approval Progress Tracker</h3>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <ol className="relative ml-4 space-y-6 border-l border-gray-300">
                      {(['DRAFT', 'PENDING_DEPT_1', 'PENDING_DEPT_2', 'PENDING_DEPT_3', 'APPROVED'] as const).map((stage, idx) => {
                        const isActive = request?.status === stage
                        const isComplete = stage === 'DRAFT' || (request?.status === 'APPROVED' && stage === 'APPROVED') || (request?.status !== 'APPROVED' && stage !== request?.status && stage !== 'APPROVED')
                        return (
                          <li key={stage} className="relative">
                            <div className={`absolute -left-5 flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                              isActive ? 'border-blue-600 bg-blue-600' : isComplete ? 'border-green-600 bg-green-600' : 'border-gray-300 bg-white'
                            }`}>
                              <span className={`text-xs font-medium ${isActive || isComplete ? 'text-white' : 'text-gray-500'}`}>
                                {idx + 1}
                              </span>
                            </div>
<div className="ml-6">
                               <p className={`text-sm font-medium ${isActive ? 'text-blue-900' : isComplete ? 'text-green-900' : 'text-gray-500'}`}>
                                 {stage === 'DRAFT' ? 'Initiator' : stage === 'PENDING_DEPT_1' ? 'Fixed Network Review' : stage === 'PENDING_DEPT_2' ? 'Wire Line Planning Review' : stage === 'PENDING_DEPT_3' ? 'Engineering Review' : 'Approved'}
                               </p>
                               {stage === 'PENDING_DEPT_1' && (
                                 <p className="text-xs italic text-gray-500">Assigned: {request?.fixed_network_approver || 'Unassigned'}</p>
                               )}
                               {stage === 'PENDING_DEPT_2' && (
                                 <p className="text-xs italic text-gray-500">Assigned: {request?.wire_line_approver || 'Unassigned'}</p>
                               )}
                               {stage === 'PENDING_DEPT_3' && (
                                 <p className="text-xs italic text-gray-500">Assigned: {request?.engineering_approver || 'Unassigned'}</p>
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

            <div className="flex flex-shrink-0 justify-end border-t border-gray-200 px-4 py-4 sm:px-6">
              <button
                type="button"
                className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-300 hover:bg-gray-50"
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