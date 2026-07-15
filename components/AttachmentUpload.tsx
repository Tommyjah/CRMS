'use client'

import { useState, useRef, useCallback } from 'react'
import { uploadAttachment } from '@/app/actions'
import type { RequestAttachment } from '@/lib/supabase/client'

const MAX_SIZE_MB = 50
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

interface AttachmentUploadProps {
  requestId: string
  onUploaded?: (attachment: RequestAttachment) => void
  hideHeading?: boolean
}

const ACCEPTED_EXTENSIONS = [
  '.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.tiff',
  '.dwg', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.zip',
]

function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  if (lastDot === -1) return ''
  return filename.slice(lastDot).toLowerCase()
}

function getFileIcon(mimeType: string, filename: string): string {
  const ext = getFileExtension(filename)
  if (mimeType === 'application/pdf' || ext === '.pdf') return 'PDF'
  if (mimeType.startsWith('image/') || ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.tiff'].includes(ext)) return 'IMG'
  if (mimeType.includes('word') || mimeType.includes('wordprocessingml') || ['.doc', '.docx'].includes(ext)) return 'DOC'
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet') || ['.xls', '.xlsx', '.csv'].includes(ext)) return 'XLS'
  if (mimeType.includes('zip') || mimeType.includes('compressed') || ext === '.zip') return 'ZIP'
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

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export default function AttachmentUpload({ requestId, onUploaded, hideHeading = false }: AttachmentUploadProps) {
  const [files, setFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback((newFiles: FileList | File[]) => {
    const valid: File[] = []
    for (const file of Array.from(newFiles)) {
      const ext = getFileExtension(file.name)
      const isExtensionOk = ACCEPTED_EXTENSIONS.includes(ext)
      const isMimeOk = file.type === 'application/octet-stream' && ext !== ''
      if (!isExtensionOk && !isMimeOk) {
        setError(`Unsupported file: ${file.name}`)
        continue
      }
      if (file.size > MAX_SIZE_BYTES) {
        setError(`File too large (max ${MAX_SIZE_MB}MB): ${file.name}`)
        continue
      }
      valid.push(file)
    }
    if (valid.length > 0) {
      setFiles(prev => [...prev, ...valid])
      setError(null)
    }
  }, [])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files?.length) {
      handleFiles(e.dataTransfer.files)
    }
  }, [handleFiles])

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleUpload = async () => {
    if (files.length === 0 || isUploading) return
    setIsUploading(true)
    setUploadProgress(0)
    setError(null)
    setSuccess(null)

    const total = files.length
    let completed = 0

    for (const file of files) {
      try {
        const result = await uploadAttachment({ requestId, file })
        completed++
        const pct = Math.round((completed / total) * 100)
        setUploadProgress(pct)

        if (!result.success) {
          const rawError = result.error
          const msg = typeof rawError === 'string' ? rawError : 'Upload failed'
          console.error('[AttachmentUpload] uploadAttachment failed:', msg, result)
          setError(msg)
          setFiles([])
          setIsUploading(false)
          return
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unexpected upload error'
        console.error('[AttachmentUpload] Unexpected upload error:', err)
        setError(message)
        setFiles([])
        setIsUploading(false)
        return
      }
    }

    setSuccess(`${total} file${total > 1 ? 's' : ''} uploaded successfully`)
    setFiles([])
    setIsUploading(false)
    onUploaded?.({} as RequestAttachment)
  }

  return (
    <div className="rounded-lg border border-slate-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-4">
      {!hideHeading && (
        <h4 className="text-sm font-semibold text-slate-900 dark:text-zinc-100 mb-3">Upload Attachments</h4>
      )}

      <div
        className={`relative rounded-lg border-2 border-dashed transition-colors ${
          dragActive
            ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-900/10'
            : 'border-slate-300 dark:border-zinc-700 hover:border-slate-400 dark:hover:border-zinc-600'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_EXTENSIONS.join(',')}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files)
            e.target.value = ''
          }}
          disabled={isUploading}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="w-full py-6 px-4 text-center text-sm text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 transition-colors disabled:opacity-50"
        >
          <svg className="mx-auto h-8 w-8 text-slate-400 dark:text-zinc-500 mb-2" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5h12a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0018.75 4.5H6.75A2.25 2.25 0 004.5 6.75v10.5A2.25 2.25 0 006.75 19.5z" />
          </svg>
          Click to browse, drag and drop files here
          <span className="block mt-1 text-xs text-slate-400 dark:text-zinc-500">
            PDF, Images, DWG, Word, Excel (max {MAX_SIZE_MB}MB)
          </span>
        </button>
      </div>

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file, idx) => {
            const icon = getFileIcon(file.type, file.name)
            const iconBg = getIconBg(icon)
            return (
              <div
                key={`${file.name}-${idx}`}
                className="flex items-center gap-3 rounded-lg border border-slate-200/80 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-800/50 px-3 py-2.5"
              >
                <div className={`flex-shrink-0 rounded-md px-2 py-1 text-xs font-bold ${iconBg}`}>
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-zinc-100 truncate">{file.name}</p>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">{formatFileSize(file.size)}</p>
                </div>
                {!isUploading && (
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="text-slate-400 hover:text-rose-600 dark:text-zinc-500 dark:hover:text-rose-400 transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.063-.94-1.75-1.816-1.868a48.976 48.976 0 00-1.831-.167 48.639 48.639 0 00-1.831.167c-.876.118-1.816.805-1.816 1.868v.916" />
                    </svg>
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {isUploading && (
        <div className="mt-4">
          <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-zinc-700">
            <div
              className="h-2 rounded-full bg-teal-600 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">Uploading... {uploadProgress}%</p>
        </div>
      )}

      {files.length > 0 && !isUploading && (
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setFiles([])
              setError(null)
            }}
            className="rounded-lg border border-slate-300 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={handleUpload}
            className="rounded-lg bg-[#00ab4e] px-4 py-2 text-sm font-medium text-white hover:bg-[#008C4A] transition-colors disabled:opacity-50"
          >
            Upload {files.length} file{files.length > 1 ? 's' : ''}
          </button>
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:bg-rose-950/20 dark:text-rose-300">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300">
          {success}
        </div>
      )}

      <style jsx>{`
        .attach-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          border-radius: 0.5rem;
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          border: none;
          transition: background-color 0.2s;
        }
      `}</style>
    </div>
  )
}
export { AttachmentUpload }