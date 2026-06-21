'use client'

import React, { useState } from 'react'
import { ROLE_ACCESS } from '@/hooks/useChangeRequests'
import ChangeRequestDrawer from '@/components/ChangeRequestDrawer'

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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  
  const statusConfig = ROLE_ACCESS[request?.status ?? ''] ?? ROLE_ACCESS.DRAFT

  const currentUserRole = userProfile?.role?.trim()
  const currentUserDept = userProfile?.department?.trim()
  const targetStageDept = statusConfig?.department?.trim() ?? ''

  const isTargetApprover =
    !!currentUserRole &&
    currentUserRole.toUpperCase() === 'APPROVER' &&
    !!currentUserDept &&
    !!targetStageDept &&
    currentUserDept === targetStageDept

  const isButtonActive = !!statusConfig?.canApprove && isTargetApprover

  return (
    <>
      <div className="p-5 border rounded-xl shadow-sm bg-white border-slate-200/80 dark:border-zinc-800/80 dark:bg-zinc-900 flex flex-col gap-3">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100">{request?.project_name || 'Unnamed Project'}</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono">
              ID: #{request?.project_number || request?.id?.slice(0, 8)} | From: {request?.initiated_by || 'Unknown'}
            </p>
          </div>
          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
            request?.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800/50' :
            request?.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-800/50' : 
            'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800/50'
          }`}>
            {statusConfig?.label || request?.status?.replace('_', ' ') || 'PENDING'}
          </span>
        </div>

        <div className="text-sm text-slate-700 dark:text-zinc-300 bg-slate-50/30 dark:bg-zinc-800/20 p-3 rounded-lg border border-slate-200/80 dark:border-zinc-800/80">
          <span className="block font-semibold text-xs text-slate-500 dark:text-zinc-400 uppercase mb-1">Description</span>
          {request?.change_description || 'No description provided.'}
        </div>

        <div className="flex gap-2 mt-2">
          <button
            onClick={() => onApprove(request.id)}
            disabled={!isButtonActive}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              isButtonActive
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm cursor-pointer'
                : 'bg-slate-100/50 dark:bg-zinc-800/50 text-slate-400 dark:text-zinc-500 cursor-not-allowed border border-slate-200/80 dark:border-zinc-700'
            }`}
          >
            {isButtonActive ? '⚡ Approve' : `⏱️ Awaiting ${statusConfig?.label || 'Next Stage'}`}
          </button>

          {isButtonActive && onReject && (
            <button
              onClick={() => onReject(request.id)}
              className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-sm font-semibold rounded-lg transition-colors border border-transparent hover:border-rose-200 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 dark:text-rose-400 dark:hover:border-rose-800/50"
            >
              Reject
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-zinc-700 text-sm font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors"
          >
            🔍 Details
          </button>
        </div>
      </div>

      <ChangeRequestDrawer request={request} isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </>
  )
}