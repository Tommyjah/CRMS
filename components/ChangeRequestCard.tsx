'use client'

import React, { useState } from 'react'
import { ROLE_ACCESS } from '@/hooks/useChangeRequests'
import { isStatus, STATUS_STYLES } from '@/lib/constants'
import ChangeRequestDrawer from '@/components/ChangeRequestDrawer'
import type { Database } from '@/types_db'

type ChangeRequest = Database['public']['Tables']['change_requests']['Row']

interface ChangeRequestCardProps {
  request: ChangeRequest
  userProfile: {
    department: string | null
    role: string | null
    email?: string | null
  } | null
  onApprove: (id: string) => void
  onReject?: (id: string) => void
}

export function ChangeRequestCard({ request, userProfile, onApprove, onReject }: ChangeRequestCardProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const statusConfig = ROLE_ACCESS[request?.status ?? ''] ?? ROLE_ACCESS.DRAFT
  const resolvedStatus = isStatus(request?.status) ? request.status : 'DRAFT'

  const projectNumber = request?.project_number ?? '—'
  const initiator = request?.initiated_by ?? '—'
  const priority = request?.priority_level ?? '—'
  const description = request?.change_description || 'No description provided.'

  const currentUserDept = userProfile?.department?.trim()
  const targetStageDept = statusConfig?.department?.trim() ?? ''
  const currentUserEmail = userProfile?.email?.trim().toLowerCase() ?? null
  const assignedApproverEmail = request?.fixed_network_approver ?? request?.wire_line_approver ?? request?.engineering_approver ?? null
  const normalizedAssignedEmail = assignedApproverEmail?.trim().toLowerCase() ?? null

  const isTargetApprover = !!currentUserDept && !!targetStageDept && currentUserDept === targetStageDept

  const isAssignedApprover = !!currentUserEmail && !!normalizedAssignedEmail && currentUserEmail === normalizedAssignedEmail

  const isButtonActive = !!statusConfig?.canApprove && (isTargetApprover || isAssignedApprover)

  const statusStyle = STATUS_STYLES[resolvedStatus]

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900">
      <div className="grid grid-cols-1 gap-6 p-4 md:grid-cols-12 md:p-5">
        <div className="md:col-span-12 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold text-slate-900 dark:text-zinc-100">
              {request?.project_name || 'Unnamed Project'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono">
              ID: #{projectNumber} | From: {initiator}
            </p>
          </div>
          <span
            className={`shrink-0 px-2.5 py-1 text-xs font-semibold rounded-full ${statusStyle}`}
          >
            {statusConfig?.label || request?.status?.replace('_', ' ') || 'PENDING'}
          </span>
        </div>

        <div className="md:col-span-7 text-sm text-slate-700 dark:text-zinc-300 bg-slate-50/30 dark:bg-zinc-800/20 p-3 rounded-lg border border-slate-200/80 dark:border-zinc-800/80">
          <span className="block font-semibold text-xs text-slate-500 dark:text-zinc-400 uppercase mb-1">Description</span>
          {description}
        </div>

        <div className="md:col-span-5 text-sm text-slate-600 dark:text-zinc-300">
          <div className="rounded-lg border border-slate-200/80 bg-slate-50/30 p-3 dark:border-zinc-800/80 dark:bg-zinc-800/20">
            <p className="mb-2">
              <span className="font-medium text-slate-500 dark:text-zinc-400">Project Number:</span>{' '}
              <span className="font-mono text-xs">{projectNumber}</span>
            </p>
            <p className="mb-2">
              <span className="font-medium text-slate-500 dark:text-zinc-400">Initiated By:</span>{' '}
              {initiator}
            </p>
            <p className="mb-2">
              <span className="font-medium text-slate-500 dark:text-zinc-400">Priority Level:</span>{' '}
              {priority}
            </p>
            <p>
              <span className="font-medium text-slate-500 dark:text-zinc-400">Current holder:</span>{' '}
              {statusConfig?.department || '—'}
            </p>
          </div>
        </div>

        <div className="md:col-span-12 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onApprove(request.id)}
            disabled={!isButtonActive}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              isButtonActive
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm cursor-pointer'
                : 'cursor-not-allowed bg-slate-100/50 text-slate-400 border border-slate-200/80 dark:bg-zinc-800/50 dark:text-zinc-500 dark:border-zinc-700'
            }`}
          >
            {isButtonActive ? '⚡ Approve' : `⏱️ Awaiting ${statusConfig?.label || 'Next Stage'}`}
          </button>

          <button
            type="button"
            onClick={() => onReject?.(request.id)}
            disabled={!isButtonActive}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              isButtonActive
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm cursor-pointer'
                : 'cursor-not-allowed bg-slate-100/50 text-slate-400 border border-slate-200/80 dark:bg-zinc-800/50 dark:text-zinc-500 dark:border-zinc-700'
            }`}
          >
            Reject
          </button>

          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800/50 transition-colors"
          >
            🔍 Details
          </button>
        </div>
      </div>

      <ChangeRequestDrawer request={request} isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </div>
  )
}
