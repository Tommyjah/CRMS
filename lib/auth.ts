/**
 * Shared Auth Helpers for Server Actions
 *
 * Provides reusable authentication and profile-fetching utilities to reduce boilerplate duplication.
 */
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types_db'

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

/**
 * Fetches the currently authenticated user and their profile in one call.
 * Returns a uniform shape suitable for all server actions.
 */
export async function getCurrentProfile(): Promise<AuthResult> {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await withAuthRetry(() =>
    supabase.auth.getUser()
  )

  if (userError || !user) {
    return { user: null, profile: null, error: userError?.message ?? 'Not authenticated' }
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

