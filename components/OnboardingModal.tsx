'use client'

import { useEffect, useState } from 'react'
import { getUserProfile, updateUserProfile } from '@/app/actions'

const validDepartments = ['Fixed Network', 'Wire Line Planning', 'Engineering']

import type { Database } from '@/types_db'

type Profile = Database['public']['Tables']['profiles']['Row']

export default function OnboardingModal() {
  const [profile, setProfile] = useState<Profile | null>(null)
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
      setLoading(false)
    }

    loadProfile()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const { error } = await updateUserProfile(department)

    if (error) {
      setError(error)
      setSaving(false)
      return
    }

    window.location.reload()
  }

  const needsDepartment = !loading && (!profile?.department || profile.department === 'Initiator' || profile.department === '')

  if (!needsDepartment) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-lg">
        <h2 className="text-xl font-bold text-gray-900">Complete Your Profile</h2>
        <p className="mt-2 text-sm text-gray-600">
          Please select your department to continue using CRMS.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Department</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">Select a department</option>
              {validDepartments.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={saving || !department}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
