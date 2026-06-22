import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const cookieStore = await cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set({ name, value, ...options })
              )
            } catch {
            }
          },
        },
      }
    )
    
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data?.user) {
// 🔥 Ensure profile exists for OAuth users - auto upsert on first login
       if (data.user) {
         // Always update department to null for OAuth users needing onboarding
         await supabase
           .from('profiles')
           .upsert({
             id: data.user.id,
             email: data.user.email ?? '',
             full_name: data.user.user_metadata?.full_name ?? '',
             department: null,
             role: 'REQUESTER',
             created_at: new Date().toISOString(),
             updated_at: new Date().toISOString(),
             is_active: true,
           }, {
             onConflict: 'id',
           })
       }
      
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Could not authenticate user`)
}