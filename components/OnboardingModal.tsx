'use client'

import { useEffect, useState } from 'react'
import { getUserProfile, updateUserProfile } from '@/app/actions'
import { DEPARTMENTS } from '@/lib/constants'

import type { Database } from '@/types_db'

type Profile = Database['public']['Tables']['profiles']['Row']

export default function OnboardingModal() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [fullName, setFullName] = useState('')
  const [department, setDepartment] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadProfile = async () => {
      const { data, error } = await getUserProfile()
      if (error) {
        setError(error)
        setLoading(false)
        return
      }

      setProfile(data)
      setFullName(data?.full_name || data?.email?.split('@')[0] || '')
      setLoading(false)
    }

    loadProfile()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const { error } = await updateUserProfile(department, fullName)

    if (error) {
      setError(error)
      setSaving(false)
      return
    }

    window.location.reload()
  }

  const needsOnboarding = !loading && (profile?.department === null || profile?.department === undefined || profile?.department === '')

  if (!needsOnboarding) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-6 shadow-lg">
        <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100">Complete Your Profile</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">
          Please provide your full name and select your department to continue using CRMS.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g., John Doe"
              required
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:focus:ring-teal-500/10 transition-all outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300">Department</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:focus:ring-teal-500/10 transition-all outline-none"
            >
              <option value="">Select a department</option>
              {[...DEPARTMENTS].map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={saving || !department || !fullName}
            className="w-full rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}