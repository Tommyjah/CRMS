import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function middleware(request: NextRequest) {
  const cookieHeader = request.headers.get('cookie') ?? ''
  console.log('Middleware is running on:', request.nextUrl.pathname)
  console.log('[middleware] path=', request.nextUrl.pathname)
  console.log('[middleware] cookies=', cookieHeader)
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  const user = data.user
  const isLoggedIn = !!user

  console.log('[middleware] auth user=', user?.id ?? null, 'isLoggedIn=', isLoggedIn, 'error=', error?.message ?? null)

  const publicPaths = ['/login', '/auth/callback']
  const isPublic = publicPaths.includes(request.nextUrl.pathname)

  console.log('[middleware] isPublic=', isPublic)

  if (isLoggedIn && isPublic) {
    console.log('[middleware] redirect-> /')
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (!isLoggedIn && !isPublic) {
    console.log('[middleware] redirect-> /login')
    return NextResponse.redirect(new URL('/login', request.url))
  }

  console.log('[middleware] allowing request')
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
