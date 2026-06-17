'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const isActive = (path: string) => pathname === path

  if (pathname === '/login') {
    return null
  }

  const handleLogout = async () => {
    setOpen(false)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const NavLink = ({ href, label }: { href: string; label: string }) => (
    <button
      type="button"
      onClick={() => router.push(href)}
      className={`text-sm ${
        isActive(href)
          ? 'font-semibold text-gray-900'
          : 'text-gray-700 hover:text-gray-900'
      }`}
    >
      {label}
    </button>
  )

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => router.push('/')} className="text-lg font-semibold text-gray-900">CRMS</button>

          <div className="hidden gap-6 sm:flex">
            <NavLink href="/" label="Dashboard" />
            <NavLink href="/profile" label="Profile" />
            <NavLink href="/settings" label="Settings" />
            <button type="button" onClick={handleLogout} className="text-sm text-red-600 hover:text-red-700">Log out</button>
          </div>

          <button type="button" className="sm:hidden" onClick={() => setOpen((prev) => !prev)}>
            <span className="block h-0.5 w-6 bg-gray-800"></span>
            <span className="mt-1 block h-0.5 w-6 bg-gray-800"></span>
            <span className="mt-1 block h-0.5 w-6 bg-gray-800"></span>
          </button>
        </div>

        {open && (
          <div className="mt-3 space-y-2 sm:hidden">
            <button type="button" onClick={() => { router.push('/'); setOpen(false) }} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">Dashboard</button>
            <button type="button" onClick={() => { router.push('/profile'); setOpen(false) }} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">Profile</button>
            <button type="button" onClick={() => { router.push('/settings'); setOpen(false) }} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">Settings</button>
            <button type="button" onClick={handleLogout} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:text-red-700">Log out</button>
          </div>
        )}
      </div>
    </nav>
  )
}
