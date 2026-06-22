'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import { getUserProfile } from '@/app/actions'

const NavLink = ({
   href,
   label,
   isActive,
   onClick,
  }: { href: string; label: string; isActive: boolean; onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      className={`text-sm ${
        isActive ? 'font-semibold text-slate-900 dark:text-zinc-100' : 'text-slate-700 hover:text-slate-900 dark:text-zinc-300 dark:hover:text-zinc-100'
      }`}
    >
      {label}
    </button>
  )

function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [userProfile, setUserProfile] = useState<{ department: string | null; role: string | null; email: string | null } | null>(null)

  const isActive = (path: string) => pathname === path

  useEffect(() => {
    getUserProfile().then(({ data }) => {
      if (data) setUserProfile(data)
    })
  }, [])

  if (pathname === '/login') {
    return null
  }

  const handleLogout = async () => {
    setOpen(false)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="border-b border-slate-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900">
      <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
          <button type="button" onClick={() => router.push('/')} className="text-lg font-semibold text-slate-900 dark:text-zinc-100">Ethio Telecom | CRMS</button>
          <span className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 text-xs font-medium px-2.5 py-0.5 rounded-full border border-slate-200/60">Enterprise Instance</span>
        </div>

          <div className="flex items-center gap-3">
            {userProfile && (
              <div className="text-right text-xs bg-slate-100/50 dark:bg-zinc-800/50 px-2 py-1 rounded-lg border border-slate-200/80 dark:border-zinc-700/80 hidden sm:block">
                <span className="block font-semibold text-slate-700 dark:text-zinc-300">Logged in as:</span>
                <span className="text-slate-600 dark:text-zinc-400">{userProfile.department || 'No Department'} ({userProfile.role})</span>
              </div>
            )}
            <div className="hidden gap-6 sm:flex">
              <NavLink
                href="/"
                label="Dashboard"
                isActive={isActive('/')}
                onClick={() => router.push('/')}
              />
              <NavLink
                href="/profile"
                label="Profile"
                isActive={isActive('/profile')}
                onClick={() => router.push('/profile')}
              />
              <NavLink
                href="/settings"
                label="Settings"
                isActive={isActive('/settings')}
                onClick={() => router.push('/settings')}
              />
              <button type="button" onClick={handleLogout} className="text-sm text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300">
                Log out
              </button>
            </div>
          </div>

          <button type="button" className="sm:hidden" onClick={() => setOpen((prev) => !prev)}>
            <span className="block h-0.5 w-6 bg-slate-800 dark:bg-zinc-200"></span>
            <span className="mt-1 block h-0.5 w-6 bg-slate-800 dark:bg-zinc-200"></span>
            <span className="mt-1 block h-0.5 w-6 bg-slate-800 dark:bg-zinc-200"></span>
          </button>
        </div>

        {open && (
          <div className="mt-3 space-y-2 sm:hidden">
            <button
              type="button"
              onClick={() => { router.push('/'); setOpen(false) }}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => { router.push('/profile'); setOpen(false) }}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
            >
              Profile
            </button>
            <button
              type="button"
              onClick={() => { router.push('/settings'); setOpen(false) }}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
            >
              Settings
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}

export default Navbar