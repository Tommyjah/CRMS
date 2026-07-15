import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserWithRetry } from '@/lib/auth'

export async function proxy(request: NextRequest) {
  const supabase = await createClient()

  const { user, error: userError } = await getUserWithRetry(supabase, 2)
  const isLoggedIn = !!user && !userError

  const publicPaths = ['/login', '/auth/callback']
  const isPublic = publicPaths.includes(request.nextUrl.pathname)

  if (isLoggedIn && isPublic) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
