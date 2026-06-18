'use client'

import { useEffect, useState } from 'react'
import { createClientBrowser } from '@/lib/client'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const supabase = createClientBrowser()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    const loadPreferences = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setEmail(user.email)
      }
      const stored = localStorage.getItem('theme')
      if (stored) {
        setTheme(stored)
      }
    }

    loadPreferences()
  }, [supabase.auth])

  const handleThemeToggle = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    localStorage.setItem('theme', next)
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4">
        <button type="button" onClick={() => router.push('/')} className="text-sm text-blue-600 hover:underline">← Back to Dashboard</button>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Settings</h1>
      <div className="mt-6 space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Account</h2>
          <div className="mt-4 space-y-4">
            <div>
              <span className="text-sm text-gray-500">Email</span>
              <p className="text-sm font-medium text-gray-900">{email || '—'}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Preferences</h2>
          <div className="mt-4">
            <button
              type="button"
              onClick={handleThemeToggle}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Switch to {theme === 'light' ? 'Dark' : 'Light'} Mode
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
