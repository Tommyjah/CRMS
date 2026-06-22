'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientBrowser } from '@/lib/supabase/client'
import { useChangeRequests } from '@/hooks/useChangeRequests'
import { ChangeRequestCard } from '@/components/ChangeRequestCard'
import { getUserProfile } from '@/app/actions'
import type { Database } from '@/types_db'

type AuthMode = 'login' | 'signup'

export default function UnifiedPage() {
  const router = useRouter()
  const supabase = createClientBrowser()

  const [session, setSession] = useState<any>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [userProfile, setUserProfile] = useState<Database['public']['Tables']['profiles']['Row'] | null>(null)
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)

  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [department, setDepartment] = useState('Initiator')
  const [authError, setAuthError] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(false)

  const { data: requests, loading: loadingRequests, error: requestsError, approve, reject, toast } = useChangeRequests()
  useEffect(() => {
    async function initializeAuth() {
      const { data: { session: activeSession } } = await supabase.auth.getSession()
      setSession(activeSession)
      
      if (activeSession) {
        const response = await getUserProfile()
        if (response.data) setUserProfile(response.data as Database['public']['Tables']['profiles']['Row'])
        setCurrentUserEmail(activeSession.user.email ?? null)
      }
      setCheckingAuth(false)
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      setSession(currentSession)
      if (currentSession) {
        const response = await getUserProfile()
        if (response.data) setUserProfile(response.data as Database['public']['Tables']['profiles']['Row'])
        setCurrentUserEmail(currentSession.user.email ?? null)
      } else {
        setUserProfile(null)
        setCurrentUserEmail(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError(null)

    try {
      if (authMode === 'signup') {
        await supabase.auth.signOut()
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              department,
            },
          },
        })

        if (signUpError) {
          setAuthError(signUpError.message)
          return
        }

        if (data.user && !data.session) {
          setAuthError('Please check your email to confirm your account before signing in.')
          return
        }

        // 🔥 Create profile for email/password signup - sync with OAuth flow
        if (data.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: data.user.id,
              email: data.user.email ?? '',
              full_name: fullName,
              department,
              role: 'REQUESTER',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              is_active: true,
            }, {
              onConflict: 'id',
            })

          if (profileError) {
            setAuthError(profileError.message)
            return
          }
        }
        return
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setAuthError(signInError.message)
        return
      }

      router.push('/')
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setAuthLoading(true)
    setAuthError(null)

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          prompt: 'select_account',
        },
      },
    })

    if (oauthError) {
      setAuthError(oauthError.message)
      setAuthLoading(false)
    }
  }

  if (checkingAuth) {
    return <div className="min-h-screen bg-slate-50/50 dark:bg-zinc-950 flex items-center justify-center text-slate-500 dark:text-zinc-400 text-sm">Verifying system session...</div>
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50/50 dark:bg-zinc-950 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100">
            {authMode === 'login' ? 'Sign in to CRMS' : 'Create your account'}
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">
            {authMode === 'login'
              ? 'Use your Supabase credentials to access the approval dashboard.'
              : 'Register to submit and track change requests.'}
          </p>

          <form onSubmit={handleAuthSubmit} className="mt-6 space-y-4">
            {authMode === 'signup' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className="mt-1 w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:focus:ring-teal-500/10 transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:focus:ring-teal-500/10 transition-all outline-none"
                  >
                    <option value="Initiator">Initiator</option>
                    <option value="Fixed Network">Fixed Network</option>
                    <option value="Wire Line Planning">Wire Line Planning</option>
                    <option value="Engineering">Engineering</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:focus:ring-teal-500/10 transition-all outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:focus:ring-teal-500/10 transition-all outline-none"
              />
            </div>

            {authError && <p className="text-sm text-rose-600 dark:text-rose-400">{authError}</p>}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              {authLoading ? 'Please wait…' : authMode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-slate-600 dark:text-zinc-400">
            {authMode === 'login' ? (
              <>
                Don&apos;t have an account?{' '}
                <button type="button" onClick={() => setAuthMode('signup')} className="text-teal-600 dark:text-teal-400 hover:underline">
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button type="button" onClick={() => setAuthMode('login')} className="text-teal-600 dark:text-teal-400 hover:underline">
                  Sign in
                </button>
              </>
            )}
          </p>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={authLoading}
            className="mt-4 w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 text-sm font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/50 disabled:opacity-50 transition-colors"
          >
            Continue with Google
          </button>
        </div>
      </div>
    )
  }

return (
    <div className="min-h-screen w-full bg-slate-50/50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-50 transition-colors duration-200">
      <header className="border-b border-slate-200/80 dark:border-zinc-800/80 pb-4 flex justify-between items-center max-w-5xl mx-auto px-4 pt-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100">Change Requests Pipeline</h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400">Option B Mode: Global Visibility Pipeline</p>
        </div>

        <div className="flex items-center gap-4">
          {userProfile && (
            <div className="text-right text-xs bg-slate-100/50 dark:bg-zinc-800/50 p-2 rounded-lg border border-slate-200/80 dark:border-zinc-700/80">
              <span className="block font-semibold text-slate-700 dark:text-zinc-300">Logged in as:</span>
              <span className="text-slate-600 dark:text-zinc-400">{userProfile.department || 'No Department'} ({userProfile.role})</span>
            </div>
          )}
          <button
            onClick={async () => {
              await supabase.auth.signOut()
            }}
            className="text-xs bg-rose-50/50 dark:bg-rose-900/20 hover:bg-rose-100/50 dark:hover:bg-rose-900/30 border border-rose-200/50 dark:border-rose-800/50 text-rose-600 dark:text-rose-400 px-3 py-2 rounded-lg transition-colors font-medium"
          >
            Sign Out
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {loadingRequests ? (
          <div className="text-center text-slate-500 dark:text-zinc-400 p-6">Loading network records...</div>
        ) : requestsError ? (
          <div className="text-center text-rose-600 dark:text-rose-400 p-6">Pipeline data error: {requestsError}</div>
        ) : requests.length === 0 ? (
          <div className="text-center p-12 border-2 border-dashed border-slate-300/50 dark:border-zinc-700/50 rounded-xl text-slate-400 dark:text-zinc-500">
            No change requests found in the corporate network.
          </div>
        ) : (
          <div className="grid gap-4">
            {requests.map((ticket) => (
              <ChangeRequestCard
                key={ticket.id}
                request={ticket}
                userProfile={{...userProfile, email: currentUserEmail} as any}
                onApprove={approve}
                onReject={reject}
              />
            ))}
          </div>
        )}

        {toast && (
          <div className="fixed bottom-5 right-5 bg-slate-900 dark:bg-zinc-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-medium border border-slate-800 dark:border-zinc-700 z-50 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
            {toast}
          </div>
        )}
      </div>
    </div>
  )
}