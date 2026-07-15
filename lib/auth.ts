/**
 * Shared Auth Helpers for Server Actions
 *
 * Provides reusable authentication and profile-fetching utilities to reduce boilerplate duplication.
 */
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types_db'
import type { SupabaseClient } from '@supabase/supabase-js'

export type AuthResult = 
  | { user: { id: string; email?: string | null } | null; profile: (Database['public']['Tables']['profiles']['Row']) | null; error: null }
  | { user: null; profile: null; error: string }
  | { user: { id: string; email?: string | null }; profile: null; error: string }

const AUTH_RETRY_DELAYS = [200, 500, 1000]

async function withAuthRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= AUTH_RETRY_DELAYS.length; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      const message = err instanceof Error ? err.message : ''
      const isAuthMissing = message.includes('session') || message.includes('Auth')
      if (attempt < AUTH_RETRY_DELAYS.length && isAuthMissing) {
        await new Promise(resolve => setTimeout(resolve, AUTH_RETRY_DELAYS[attempt]))
        continue
      }
      throw err
    }
  }
  throw lastError
}

async function getUserWithRetry(
  supabase: SupabaseClient<Database>,
  maxAttempts: number = 3,
): Promise<{ user: { id: string; email?: string | null } | null; error: string | null }> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (!userError && user) {
      return { user, error: null }
    }

    if (attempt < maxAttempts - 1) {
      if (attempt === 0 && (!user || userError)) {
        try {
          await supabase.auth.refreshSession()
        } catch {
          // ignore refresh failures and continue with retry
        }
      }
      await new Promise(resolve => setTimeout(resolve, 200 * (attempt + 1)))
    }
  }
  const finalError = 'Auth session missing or expired'
  return { user: null, error: finalError }
}

export { getUserWithRetry }

/**
 * Fetches the currently authenticated user and their profile in one call.
 * Returns a uniform shape suitable for all server actions.
 */
export async function getCurrentProfile(): Promise<AuthResult> {
  const supabase = await createClient()

  const { user, error: userError } = await getUserWithRetry(supabase, 2)

  if (userError || !user) {
    return { user: null, profile: null, error: userError ?? 'Not authenticated' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, department, role, created_at, updated_at, is_active')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) {
    return { user, profile: null, error: 'Profile not found' }
  }

  return { user, profile, error: null }
}

/**
 * Derives the appropriate role from a department value.
 * Used when updating profiles or creating new users.
 */
export { resolveInitiatorRole } from '@/lib/constants'

