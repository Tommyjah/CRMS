'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'

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
       isActive ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100'
     }`}
   >
     {label}
   </button>
 )

function Navbar() {
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

  return (
    <nav className="border-b border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700">
      <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => router.push('/')} className="text-lg font-semibold text-gray-900 dark:text-gray-100">CRMS</button>

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
<button type="button" onClick={handleLogout} className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
               Log out
             </button>
          </div>

          <button type="button" className="sm:hidden" onClick={() => setOpen((prev) => !prev)}>
            <span className="block h-0.5 w-6 bg-gray-800 dark:bg-gray-200"></span>
            <span className="mt-1 block h-0.5 w-6 bg-gray-800 dark:bg-gray-200"></span>
            <span className="mt-1 block h-0.5 w-6 bg-gray-800 dark:bg-gray-200"></span>
          </button>
        </div>

        {open && (
          <div className="mt-3 space-y-2 sm:hidden">
            <button
              type="button"
              onClick={() => { router.push('/'); setOpen(false) }}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => { router.push('/profile'); setOpen(false) }}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Profile
            </button>
            <button
              type="button"
              onClick={() => { router.push('/settings'); setOpen(false) }}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Settings
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
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