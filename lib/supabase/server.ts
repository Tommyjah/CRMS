import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types_db'

export async function createClient() {
  const cookieStore = await cookies()
  const isLocalhost = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('localhost') ?? false

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, {
              ...options,
              secure: isLocalhost ? false : options.secure,
            })
          })
        },
      },
    }
  )
}
