'use client'

import React from 'react'
import { ROLE_ACCESS } from '@/hooks/useChangeRequests'

interface ChangeRequestCardProps {
  request: any // 👈 Kept as any to maintain your immediate type resolution
  userProfile: {
    department: string | null
    role: string | null
  } | null
  onApprove: (id: string) => void
  onReject?: (id: string) => void
}

export function ChangeRequestCard({ request, userProfile, onApprove, onReject }: ChangeRequestCardProps) {
  // 1. Safe lookup of the current stage configuration with fallback
  const statusConfig = ROLE_ACCESS[request?.status ?? ''] ?? ROLE_ACCESS.DRAFT

  // 2. Normalize values for comparison (preserve case to match ROLE_ACCESS mapping)
  const currentUserRole = userProfile?.role?.trim()
  const currentUserDept = userProfile?.department?.trim()
  const targetStageDept = statusConfig?.department?.trim() ?? ''

  // 3. Validate credentials defensively - user must be APPROVER with exact department match
  const isTargetApprover =
    !!currentUserRole &&
    currentUserRole.toUpperCase() === 'APPROVER' &&
    !!currentUserDept &&
    !!targetStageDept &&
    currentUserDept === targetStageDept

  // 4. Unlock button only if the state allows approval and credentials match
  const isButtonActive = !!statusConfig?.canApprove && isTargetApprover

  return (
    <div className="p-5 border rounded-xl shadow-sm bg-white border-gray-200 flex flex-col gap-3">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{request?.project_name || 'Unnamed Project'}</h3>
          <p className="text-xs text-gray-500 font-mono">
            ID: #{request?.project_number || request?.id?.slice(0, 8)} | From: {request?.initiated_by || 'Unknown'}
          </p>
        </div>
        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
          request?.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
          request?.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 
          'bg-blue-100 text-blue-800'
        }`}>
          {statusConfig?.label || request?.status?.replace('_', ' ') || 'PENDING'}
        </span>
      </div>

      <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100">
        <span className="block font-semibold text-xs text-gray-400 uppercase mb-1">Description</span>
        {request?.change_description || 'No description provided.'}
      </div>

      <div className="flex gap-2 mt-2">
        <button
          onClick={() => onApprove(request.id)}
          disabled={!isButtonActive}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            isButtonActive
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm cursor-pointer'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
          }`}
        >
          {isButtonActive ? '⚡ Approve' : `⏱️ Awaiting ${statusConfig?.label || 'Next Stage'}`}
        </button>

        {isButtonActive && onReject && (
          <button
            onClick={() => onReject(request.id)}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold rounded-lg transition-colors border border-transparent hover:border-red-200"
          >
            Reject
          </button>
        )}
      </div>
    </div>
  )
}