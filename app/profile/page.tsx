import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ProfilePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4">
        <Link href="/" className="text-sm text-blue-600 hover:underline">← Back to Dashboard</Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Profile</h1>
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div>
            <span className="text-sm text-gray-500">Email</span>
            <p className="text-sm font-medium text-gray-900">{user.email ?? '—'}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">User ID</span>
            <p className="text-sm font-medium text-gray-900">{user.id}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Last sign in</span>
            <p className="text-sm font-medium text-gray-900">{new Date(user.last_sign_in_at ?? '').toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
