'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [department, setDepartment] = useState('')
  const [loading, setLoading] = useState(true)
  const [signOutLoading, setSignOutLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const loadPreferences = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setEmail(user.email)
      }

      const stored = localStorage.getItem('theme') as 'light' | 'dark' | null
      if (stored) {
        setTheme(stored)
        document.documentElement.classList.toggle('dark', stored === 'dark')
      }

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('department')
          .eq('id', user.id)
          .single()
        if (profile?.department) {
          setDepartment(profile.department)
        }
      }

      setLoading(false)
    }

    loadPreferences()
  }, [])

  const handleThemeToggle = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    localStorage.setItem('theme', next)
    document.documentElement.classList.toggle('dark', next === 'dark')
  }

  const handleSignOut = async () => {
    setSignOutLoading(true)
    try {
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign out')
    }
    setSignOutLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 dark:bg-zinc-950">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-32 rounded bg-slate-200 dark:bg-zinc-700"></div>
            <div className="h-64 rounded bg-slate-200 dark:bg-zinc-700"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-zinc-950">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="text-sm text-teal-600 hover:underline dark:text-teal-400"
          >
            ← Back to Dashboard
          </button>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-50 sm:text-3xl">Settings</h1>

        {error && (
          <div className="mt-4 rounded-lg bg-rose-50 p-4 text-sm text-rose-600 dark:bg-rose-950/20 dark:text-rose-400">
            {error}
          </div>
        )}

        <div className="mt-6 space-y-6">
          <div className="rounded-xl border border-slate-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">Account Information</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <span className="text-sm text-slate-500 dark:text-zinc-400">Email</span>
                <p className="text-sm font-medium text-slate-900 dark:text-zinc-100">{email || '—'}</p>
              </div>
              <div>
                <span className="text-sm text-slate-500 dark:text-zinc-400">Department</span>
                <p className="text-sm font-medium text-slate-900 dark:text-zinc-100">{department || '—'}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">Preferences</h2>
            <div className="mt-4">
              <button
                type="button"
                onClick={handleThemeToggle}
                className="rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 text-sm font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors"
              >
                Switch to {theme === 'light' ? 'Dark' : 'Light'} Mode
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-rose-200/50 dark:border-rose-800/50 bg-white dark:bg-zinc-900 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-rose-900 dark:text-rose-300">Session</h2>
            <div className="mt-4">
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signOutLoading}
                className="rounded-lg border border-rose-200 dark:border-rose-800/50 px-4 py-2 text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-900/20 disabled:opacity-50 transition-colors"
              >
                {signOutLoading ? 'Signing out…' : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}