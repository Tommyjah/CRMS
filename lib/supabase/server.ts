import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types_db'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            const isLocalhost = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('localhost') ?? false
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, {
                ...options,
                secure: isLocalhost ? false : options.secure,
              })
            })
          } catch {
            // Ignore cookie setting errors in some server action contexts
          }
        },
      },
    }
  )
}