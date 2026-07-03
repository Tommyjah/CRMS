'use client'

import { useEffect, useState } from 'react'
import type { RequestAttachment } from '@/lib/supabase/client'
import { getAttachmentPreviewUrl } from '@/app/actions'

interface AttachmentPreviewModalProps {
  attachment: RequestAttachment
  isOpen: boolean
  onClose: () => void
}

export default function AttachmentPreviewModal({
  attachment,
  isOpen,
  onClose,
}: AttachmentPreviewModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isImage = attachment.mime_type.startsWith('image/')
  const isPdf = attachment.mime_type === 'application/pdf' || attachment.original_filename.toLowerCase().endsWith('.pdf')
  const previewable = isImage || isPdf

  useEffect(() => {
    if (!isOpen) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(false)
    setError(null)
    setPreviewUrl(null)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !previewable) return

    const fetchUrl = async () => {
      setLoading(true)
      try {
        const { url } = await getAttachmentPreviewUrl(attachment.file_path)
        if (url) {
          setPreviewUrl(url)
        } else {
          setError('Failed to load preview')
        }
      } catch {
        setError('Failed to load preview')
      } finally {
        setLoading(false)
      }
    }

    fetchUrl()
  }, [isOpen, attachment.file_path, previewable])

  const handleDownload = async () => {
    try {
      const { url } = await getAttachmentPreviewUrl(attachment.file_path)
      if (!url) return
      const a = document.createElement('a')
      a.href = url
      a.download = attachment.original_filename
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch {
      window.open(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/request-attachments/${attachment.file_path}`, '_blank')
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/90 dark:bg-zinc-950/95 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] rounded-xl bg-white dark:bg-zinc-900 shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-emerald-200 dark:border-emerald-900/70 bg-[#00ab4e] dark:bg-[#008C4A] px-4 py-2.5">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Ethio Telecom"
              className="h-8 w-8 rounded-md object-contain bg-white dark:bg-emerald-950/40 p-0.5"
            />
            <div>
              <h3 className="text-sm font-semibold text-white dark:text-emerald-50 truncate max-w-md">
                {attachment.original_filename}
              </h3>
              <p className="text-xs text-emerald-100 dark:text-emerald-200">
                 v{attachment.version_number} · {new Date(attachment.created_at ?? '').toLocaleString('en-US')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 dark:border-zinc-700 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Download
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-white/80 hover:text-white dark:hover:text-emerald-100 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex items-center justify-center bg-slate-50/80 dark:bg-zinc-950/80 p-4">
          {loading && (
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
              <p className="text-sm text-slate-500 dark:text-zinc-400">Loading preview...</p>
            </div>
          )}

          {error && (
            <div className="text-center">
              <svg className="mx-auto h-10 w-10 text-rose-400 mb-3" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="text-sm text-slate-600 dark:text-zinc-400">{error}</p>
              <button
                type="button"
                onClick={handleDownload}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Download instead
              </button>
            </div>
          )}

          {previewUrl && !loading && !error && isImage && (
            <img
              src={previewUrl}
              alt={attachment.original_filename}
              className="max-h-full max-w-full object-contain rounded-lg shadow-sm"
            />
          )}

          {previewUrl && !loading && !error && isPdf && (
            <iframe
              src={previewUrl}
              title={attachment.original_filename}
              className="w-full h-[75vh] rounded-lg border border-slate-200 dark:border-zinc-800 bg-white shadow-sm"
              allowFullScreen
            />
          )}
        </div>
      </div>
    </div>
  )
}
export { AttachmentPreviewModal }