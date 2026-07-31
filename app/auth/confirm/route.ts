import { createServerClient } from '@supabase/ssr';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token_hash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  const next = url.searchParams.get('next') ?? '/';

  // Create a clean destination URL matching your base origin
  const redirectTo = new URL(next, url.origin);

  if (token_hash && type) {
    // Read headers out of the incoming connection request
    const requestHeaders = new Headers(request.headers);
    const responseHeaders = new Headers();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            // Parses any existing browser authentication cookies
            const cookieHeader = requestHeaders.get('Cookie') ?? '';
            return cookieHeader.split(';').map(c => {
              const [name, ...value] = c.trim().split('=');
              return { name, value: value.join('=') };
            }).filter(c => c.name);
          },
          setAll(cookiesToSet) {
            // Securely appends updated auth state cookies to our outgoing header payload
            cookiesToSet.forEach(({ name, value, options }) => {
              let cookieStr = `${name}=${value}`;
              if (options?.maxAge) cookieStr += `; Max-Age=${options.maxAge}`;
              if (options?.path) cookieStr += `; Path=${options.path}`;
              if (options?.domain) cookieStr += `; Domain=${options.domain}`;
              if (options?.secure) cookieStr += '; Secure';
              if (options?.httpOnly) cookieStr += '; HttpOnly';
              responseHeaders.append('Set-Cookie', cookieStr);
            });
          },
        },
      }
    );

    // Validate token hash sequence against the Supabase database engine
    const { error } = await supabase.auth.verifyOtp({ 
      type: 'magiclink', 
      token_hash 
    });
    
    if (!error) {
      // Append redirection location properties directly onto headers
      responseHeaders.set('Location', redirectTo.toString());
      return new Response(null, {
        status: 307,
        headers: responseHeaders,
      });
    }
  }

  // Route back to the login screen with an explicit error parameter flag if validation breaks down
  const failureUrl = new URL('/login?error=verification-failed', url.origin);
  return Response.redirect(failureUrl.toString(), 307);
}
