import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/'

  const redirectTo = request.nextUrl.clone()
  redirectTo.pathname = next
  redirectTo.searchParams.delete('token_hash')
  redirectTo.searchParams.delete('type')

  if (token_hash && type) {
    // 1. Resolve the asynchronous cookie store safely for modern Next.js
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
                cookieStore.set(name, value, options)
              )
            } catch {
              // Safe block for server component environment mutations
            }
          },
        },
      }
    )

    // 2. Exchange the hash variable for a live session state
    const { error } = await supabase.auth.verifyOtp({ 
      type: 'magiclink', 
      token_hash 
    })
    
    if (!error) {
      return NextResponse.redirect(redirectTo)
    }
  }

  // Fallback state if validation drops parameters
  redirectTo.pathname = '/login?error=verification-failed'
  return NextResponse.redirect(redirectTo)
}
