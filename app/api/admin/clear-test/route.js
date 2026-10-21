import { query, hasDb, TABLES } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Deletes TEST sessions only. The real table is never touched here.
// Protected by middleware.js, plus a same-site check and a typed confirmation.
export async function POST(req) {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (origin && host && new URL(origin).host !== host) return new Response('Forbidden', { status: 403 });

  const form = await req.formData().catch(() => null);
  if (form?.get('confirm') !== 'DELETE') {
    return Response.redirect(new URL('/admin?tab=test&cleared=no', req.url), 303);
  }
  if (!hasDb()) return new Response('No database connected.', { status: 503 });
  await query(`DELETE FROM ${TABLES.test}`);
  return Response.redirect(new URL('/admin?tab=test&cleared=yes', req.url), 303);
}
