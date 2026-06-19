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

  // --- Global App & Auth State ---
  const [session, setSession] = useState<any>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [userProfile, setUserProfile] = useState<Database['public']['Tables']['profiles']['Row'] | null>(null)

  // --- Login/Signup Form State ---
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [department, setDepartment] = useState('Initiator')
  const [authError, setAuthError] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(false)

  // --- Change Requests Data Hook (Wired up `toast` feedback) ---
  const { data: requests, loading: loadingRequests, error: requestsError, approve, reject, toast } = useChangeRequests()
  useEffect(() => {
    async function initializeAuth() {
      const { data: { session: activeSession } } = await supabase.auth.getSession()
      setSession(activeSession)
      
      if (activeSession) {
        const response = await getUserProfile()
        if (response.data) setUserProfile(response.data as Database['public']['Tables']['profiles']['Row'])
      }
      setCheckingAuth(false)
    }

    initializeAuth()

    // Listen for auth changes (e.g., sign in, sign out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      setSession(currentSession)
      if (currentSession) {
        const response = await getUserProfile()
        if (response.data) setUserProfile(response.data as Database['public']['Tables']['profiles']['Row'])
      } else {
        setUserProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  // 2. Handle Form Submission (Sign In / Sign Up)
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
        return
      }

      // Handle Sign In
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setAuthError(signInError.message)
        return
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setAuthLoading(false)
    }
  }

  // 3. Handle Google OAuth Sign In
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

  // --- RENDER CONDITION 1: Page Init Loading ---
  if (checkingAuth) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500 text-sm">Verifying system session...</div>
  }

  // --- RENDER CONDITION 2: Show Login Form (If Unauthenticated) ---
  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">
            {authMode === 'login' ? 'Sign in to CRMS' : 'Create your account'}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {authMode === 'login'
              ? 'Use your Supabase credentials to access the approval dashboard.'
              : 'Register to submit and track change requests.'}
          </p>

          <form onSubmit={handleAuthSubmit} className="mt-6 space-y-4">
            {authMode === 'signup' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
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
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            {authError && <p className="text-sm text-red-600">{authError}</p>}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {authLoading ? 'Please wait…' : authMode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-600">
            {authMode === 'login' ? (
              <>
                Don’t have an account?{' '}
                <button type="button" onClick={() => setAuthMode('signup')} className="text-blue-600 hover:underline">
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button type="button" onClick={() => setAuthMode('login')} className="text-blue-600 hover:underline">
                  Sign in
                </button>
              </>
            )}
          </p>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={authLoading}
            className="mt-4 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Continue with Google
          </button>
        </div>
      </div>
    )
  }

  // --- RENDER CONDITION 3: Show Dashboard Pipeline (If Authenticated) ---
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <header className="border-b border-gray-200 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Change Requests Pipeline</h1>
          <p className="text-sm text-gray-500">Option B Mode: Global Visibility Pipeline</p>
        </div>

        <div className="flex items-center gap-4">
          {userProfile && (
            <div className="text-right text-xs bg-gray-100 p-2 rounded-lg border border-gray-200">
              <span className="block font-semibold text-gray-700">Logged in as:</span>
              <span className="text-gray-600">{userProfile.department || 'No Department'} ({userProfile.role})</span>
            </div>
          )}
          <button
            onClick={async () => {
              await supabase.auth.signOut()
            }}
            className="text-xs bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 px-3 py-2 rounded-lg transition-colors font-medium"
          >
            Sign Out
          </button>
        </div>
      </header>

      {loadingRequests ? (
        <div className="text-center text-gray-500 p-6">Loading network records...</div>
      ) : requestsError ? (
        <div className="text-center text-red-500 p-6">Pipeline data error: {requestsError}</div>
      ) : requests.length === 0 ? (
        <div className="text-center p-12 border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
          No change requests found in the corporate network.
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map((ticket) => (
            <ChangeRequestCard
              key={ticket.id}
              request={ticket}
              userProfile={userProfile}
              onApprove={approve}
              onReject={reject}
            />
          ))}
        </div>
      )}

      {/* Dynamic Action Feedback Popups */}
      {toast && (
        <div className="fixed bottom-5 right-5 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-medium border border-slate-800 z-50 flex items-center gap-2 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
          {toast}
        </div>
      )}
    </div>
  )
}