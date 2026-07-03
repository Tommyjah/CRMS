'use client'

import { useState, useEffect } from 'react'
import { getRequestAttachments, deleteAttachment } from '@/app/actions'
import { getAttachmentPreviewUrl } from '@/app/actions'
import type { RequestAttachment } from '@/lib/supabase/client'
import AttachmentPreviewModal from './AttachmentPreviewModal'

interface AttachmentListProps {
  requestId: string
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function getFileIcon(mimeType: string, filename: string): string {
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase()
  if (mimeType === 'application/pdf' || ext === '.pdf') return 'PDF'
  if (mimeType.startsWith('image/') || ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.tiff'].includes(ext)) return 'IMG'
  if (mimeType.includes('word') || mimeType.includes('wordprocessingml') || ['.doc', '.docx'].includes(ext)) return 'DOC'
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet') || ['.xls', '.xlsx', '.csv'].includes(ext)) return 'XLS'
  if (mimeType.includes('zip') || ext === '.zip') return 'ZIP'
  if (mimeType.includes('dwg') || ext === '.dwg') return 'DWG'
  return 'FILE'
}

function getIconBg(type: string): string {
  const colors: Record<string, string> = {
    PDF: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    IMG: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    DOC: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    XLS: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    ZIP: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    DWG: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    FILE: 'bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300',
  }
  return colors[type] ?? colors.FILE
}

export default function AttachmentList({ requestId }: AttachmentListProps) {
  const [attachments, setAttachments] = useState<RequestAttachment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [previewAttachment, setPreviewAttachment] = useState<RequestAttachment | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadAttachments = async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await getRequestAttachments(requestId)
    if (error) {
      setError(error)
      setAttachments([])
    } else {
      setAttachments(data ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAttachments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this attachment?')) return
    setDeletingId(id)
    const { error } = await deleteAttachment(id)
    if (error) {
      setError(error)
    } else {
      setAttachments(prev => prev.filter(a => a.id !== id))
    }
    setDeletingId(null)
  }

  const handlePreview = async (attachment: RequestAttachment) => {
    setPreviewAttachment(attachment)
  }

  const canPreview = (mimeType: string, filename: string) => {
    return (
      mimeType === 'application/pdf' ||
      filename.endsWith('.pdf') ||
      mimeType.startsWith('image/')
    )
  }

  if (loading) {
    return (
      <div className="mt-4 animate-pulse space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-slate-100 dark:bg-zinc-800" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:bg-rose-950/20 dark:text-rose-300">
        {error}
      </div>
    )
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Attachments</h4>
        {attachments.length > 0 && (
          <span className="text-xs text-slate-500 dark:text-zinc-400">
            {attachments.length} file{attachments.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {attachments.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400 italic">No attachments yet</p>
      ) : (
        <div className="mt-3 space-y-2">
          {attachments.map(attachment => {
            const icon = getFileIcon(attachment.mime_type, attachment.original_filename)
            const iconBg = getIconBg(icon)
            const isPreviewable = canPreview(attachment.mime_type, attachment.original_filename)

            return (
              <div
                key={attachment.id}
                className="flex items-center gap-3 rounded-lg border border-slate-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 px-3 py-2.5 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors"
              >
                <div className={`flex-shrink-0 rounded-md px-2 py-1 text-xs font-bold ${iconBg}`}>
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-900 dark:text-zinc-100 truncate">
                      {attachment.original_filename}
                    </p>
                    <span className="inline-flex items-center rounded-full border border-slate-200 dark:border-zinc-700 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:text-zinc-400">
                      v{attachment.version_number}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-500 dark:text-zinc-400">
                      {formatFileSize(attachment.file_size)}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-zinc-500">|</span>
                    <span className="text-xs text-slate-500 dark:text-zinc-400">
                       {new Date(attachment.created_at ?? '').toLocaleDateString('en-US')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {isPreviewable && (
                    <button
                      type="button"
                      onClick={() => handlePreview(attachment)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 dark:border-zinc-700 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Preview
                    </button>
                  )}

                  <a
                    href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/request-attachments/${attachment.file_path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 dark:border-zinc-700 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
                    onClick={async (e) => {
                      e.preventDefault()
                      const { url } = await getAttachmentPreviewUrl(attachment.file_path)
                      if (url) window.open(url, '_blank')
                    }}
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Download
                  </a>

                  <button
                    type="button"
                    onClick={() => handleDelete(attachment.id)}
                    disabled={deletingId === attachment.id}
                    className="inline-flex items-center rounded-md border border-rose-200 dark:border-rose-800/50 px-2.5 py-1.5 text-xs font-medium text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors disabled:opacity-50"
                  >
                    {deletingId === attachment.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {previewAttachment && (
        <AttachmentPreviewModal
          attachment={previewAttachment}
          isOpen={!!previewAttachment}
          onClose={() => setPreviewAttachment(null)}
        />
      )}
    </div>
  )
}
export { AttachmentList }