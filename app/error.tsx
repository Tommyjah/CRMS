'use client'

import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50/50 dark:bg-zinc-950 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto h-16 w-16 text-rose-500 mb-4">
          <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.75 0h18.75c.621 0 1.125-.504 1.125-1.125V6.375c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0 1.125.504 1.125 1.125v5.625c0 .621.504 1.125 1.125 1.125zm9.75 0v3.75" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-zinc-50 mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-slate-600 dark:text-zinc-400 mb-6">
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-lg border border-slate-300 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  )
}
