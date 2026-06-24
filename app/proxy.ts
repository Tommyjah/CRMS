import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function proxy(request: NextRequest) {
  const supabase = await createClient()

  const { data } = await supabase.auth.getUser()
  const user = data.user
  const isLoggedIn = !!user

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
