import { isRealMode } from '@/lib/mode';
import { query, hasDb, tableFor } from '@/lib/db';
import { COUNTER_SINCE, localDayStart } from '@/lib/stats';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store'; // never reuse old database answers

// Public counter for the homepage. Real count on the live site; test count
// on preview/local or with ?test=1. The real count is shared for 10 seconds
// so a busy booth doesn't hit the database on every page load; the test
// count is always fresh.
export async function GET(req) {
  const forceTest = new URL(req.url).searchParams.has('test');
  const mode = isRealMode() && !forceTest ? 'real' : 'test';
  const headers = { 'Cache-Control': mode === 'real' ? 'public, max-age=0, s-maxage=10' : 'no-store' };
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
