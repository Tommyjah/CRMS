import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ProfilePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('department, role, full_name, created_at')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-zinc-950">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="text-sm text-teal-600 hover:underline">
            ← Back to Dashboard
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-50 sm:text-3xl">Profile</h1>

        <div className="mt-6 rounded-xl border border-slate-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-6 shadow-sm">
          <div className="flex items-start gap-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100/50 dark:bg-zinc-800/50">
              <span className="text-2xl font-semibold text-slate-600 dark:text-zinc-400">
                {user.email?.[0]?.toUpperCase() ?? 'U'}
              </span>
            </div>

            <div className="flex-1 space-y-4">
              <div>
                <span className="text-sm text-slate-500 dark:text-zinc-400">Full Name</span>
                <p className="text-base font-medium text-slate-900 dark:text-zinc-100">
                  {profile?.full_name || user.email?.split('@')[0] || '—'}
                </p>
              </div>

              <div>
                <span className="text-sm text-slate-500 dark:text-zinc-400">Email</span>
                <p className="text-base font-medium text-slate-900 dark:text-zinc-100">{user.email ?? '—'}</p>
              </div>

              <div>
                <span className="text-sm text-slate-500 dark:text-zinc-400">Department</span>
                <p className="text-base font-medium text-slate-900 dark:text-zinc-100 capitalize">
                  {profile?.department?.toLowerCase().replace(/_/g, ' ') ?? '—'}
                </p>
              </div>

              <div>
                <span className="text-sm text-slate-500 dark:text-zinc-400">Role</span>
                <p className="text-base font-medium text-slate-900 dark:text-zinc-100 capitalize">
                  {profile?.role?.toLowerCase()?.replace(/_/g, ' ') ?? '—'}
                </p>
              </div>

              <div>
                <span className="text-sm text-slate-500 dark:text-zinc-400">Member Since</span>
                <p className="text-base font-medium text-slate-900 dark:text-zinc-100">
                  {profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : '—'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}