'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { updateUserProfile } from '@/app/actions'

const EDITABLE_ROLES = ['REQUESTER', 'APPROVER'] as const

export default function SettingsPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [department, setDepartment] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [signOutLoading, setSignOutLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
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
          .select('department, full_name, role')
          .eq('id', user.id)
          .maybeSingle()
        if (profile) {
          setDepartment(profile.department ?? '')
          setFullName(profile.full_name ?? '')
          setRole(profile.role ?? 'REQUESTER')
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

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setMessage(null)

    const { error } = await updateUserProfile(department, fullName, role)

    if (error) {
      setError(error)
    } else {
      setMessage('Profile updated successfully')
    }
    setSaving(false)
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
        {message && (
          <div className="mt-4 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400">
            {message}
          </div>
        )}

        <form onSubmit={handleProfileUpdate} className="mt-6 space-y-6">
          <div className="rounded-xl border border-slate-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">Account Information</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <span className="text-sm text-slate-500 dark:text-zinc-400">Email</span>
                <p className="text-sm font-medium text-slate-900 dark:text-zinc-100">{email || '—'}</p>
              </div>
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 dark:text-zinc-300">
                  Full Name
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:focus:ring-teal-500/10 transition-all outline-none"
                />
              </div>
              <div>
                <label htmlFor="department" className="block text-sm font-medium text-slate-700 dark:text-zinc-300">
                  Department
                </label>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-zinc-100">{department || '—'}</p>
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  Department is set during onboarding and cannot be changed.
                </p>
              </div>
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-slate-700 dark:text-zinc-300">
                  Role
                </label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-slate-900 dark:text-zinc-100 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:focus:ring-teal-500/10 transition-all outline-none"
                >
                  {EDITABLE_ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-500">
                  REQUESTER can create requests. APPROVER can approve in their department stage.
                </p>
              </div>
            </div>
            <div className="mt-4">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
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
        </form>
      </div>
    </div>
  )
}
