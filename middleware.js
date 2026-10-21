import { NextResponse } from 'next/server';

// Password-protects /admin and /api/admin/* with the browser's built-in login
// box. Set ADMIN_PASSWORD in Vercel → Settings → Environment Variables.
// Any username works; only the password is checked.
export const config = { matcher: ['/admin/:path*', '/api/admin/:path*'] };

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function middleware(req) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    return new NextResponse('Admin is locked: set ADMIN_PASSWORD in your Vercel environment variables.', { status: 503 });
  }
  const header = req.headers.get('authorization') ?? '';
  if (header.startsWith('Basic ')) {
    try {
      const decoded = atob(header.slice(6));
      const given = decoded.slice(decoded.indexOf(':') + 1);
      if (safeEqual(given, password)) {
        const res = NextResponse.next();
        res.headers.set('X-Robots-Tag', 'noindex, nofollow');
        res.headers.set('Cache-Control', 'no-store');
        return res;
      }
    } catch { /* fall through */ }
  }
  return new NextResponse('Password required.', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Invisible Work Receipt admin", charset="UTF-8"' },
  });
}
