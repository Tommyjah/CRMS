'use client'

import type { RequestAuditLog } from '@/lib/supabase/client'

interface AuditTimelineProps {
  logs?: RequestAuditLog[]
}

export default function AuditTimeline({ logs = [] }: AuditTimelineProps) {
  if (!logs || logs.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 p-8 text-center">
        <p className="text-sm text-slate-500 dark:text-zinc-400">No audit history available for this request yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {logs
        .sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
          return dateB - dateA
        })
        .map((log) => {
          const actionColor =
            log.action === 'APPROVE'
              ? 'text-emerald-700 dark:text-emerald-400'
              : log.action === 'REJECT'
                ? 'text-rose-700 dark:text-rose-400'
                : log.action === 'ESCALATE'
                  ? 'text-orange-700 dark:text-orange-400'
                  : 'text-slate-900 dark:text-zinc-100'

          return (
            <div key={log.id} className="rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className={`text-sm font-medium ${actionColor}`}>
                    {log.action}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-zinc-300 mt-1">
                    by <span className="font-medium">{log.changed_by}</span>
                  </p>
                </div>
                <p className="text-xs text-slate-500 dark:text-zinc-400 whitespace-nowrap">
                  {log.created_at ? new Date(log.created_at).toLocaleString('en-US') : 'Unknown date'}
                </p>
              </div>

              {log.previous_status && log.new_status && (
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2">
                  {log.previous_status} → {log.new_status}
                </p>
              )}

              {log.comment && (
                <p className="mt-3 text-sm italic text-slate-600 dark:text-zinc-300 border-l-2 border-slate-300 dark:border-zinc-600 pl-3">
                  &ldquo;{log.comment}&rdquo;
                </p>
              )}
            </div>
          )
        })}
    </div>
  )
}
