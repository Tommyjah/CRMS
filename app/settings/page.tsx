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
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-32 rounded bg-gray-200 dark:bg-gray-700"></div>
          <div className="h-64 rounded bg-gray-200 dark:bg-gray-700"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          ← Back to Dashboard
        </button>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 sm:text-3xl">Settings</h1>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="mt-6 space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Account Information</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Email</span>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{email || '—'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Department</span>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{department || '—'}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Preferences</h2>
          <div className="mt-4">
            <button
              type="button"
              onClick={handleThemeToggle}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Switch to {theme === 'light' ? 'Dark' : 'Light'} Mode
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-red-200 bg-white p-6 shadow-sm dark:border-red-800/50 dark:bg-gray-800">
          <h2 className="text-lg font-semibold text-red-900 dark:text-red-300">Session</h2>
          <div className="mt-4">
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signOutLoading}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              {signOutLoading ? 'Signing out…' : 'Sign Out'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}