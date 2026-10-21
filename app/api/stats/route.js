import { isRealMode } from '@/lib/mode';
import { query, hasDb, tableFor } from '@/lib/db';
import { COUNTER_SINCE, localDayStart } from '@/lib/stats';

export const dynamic = 'force-dynamic';

// Public counter for the homepage. Real count on the live site; test count
// on preview/local or with ?test=1. Cached at the edge for 30s so a busy
// booth doesn't hit the database on every page load.
export async function GET(req) {
  const forceTest = new URL(req.url).searchParams.has('test');
  const mode = isRealMode() && !forceTest ? 'real' : 'test';
  const headers = { 'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=300' };
  if (!hasDb()) return Response.json({ count: null, since: COUNTER_SINCE, mode }, { headers });
  try {
    const [row] = await query(
      `SELECT count(*)::int AS n FROM ${tableFor(mode)} WHERE completed_at >= ${localDayStart(1)}`,
      [COUNTER_SINCE],
    );
    return Response.json({ count: row.n, since: COUNTER_SINCE, mode }, { headers });
  } catch (e) {
    console.error('stats failed', e?.message);
    return Response.json({ count: null, since: COUNTER_SINCE, mode }, { headers: { 'Cache-Control': 'no-store' } });
  }
}
