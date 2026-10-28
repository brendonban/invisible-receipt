import { isRealMode } from '@/lib/mode';
import { query, hasDb, tableFor } from '@/lib/db';
import { cleanPurchases, int } from '@/lib/receipt';
import { computeRefund } from '@/lib/refunds';
import { normalizeRef } from '@/lib/ref';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store'; // never reuse old database answers

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'bad json' }, { status: 400 }); }

  // REAL only on Production with APP_MODE=real and no ?test=1. Everything
  // else goes to the separate test table, never the real one.
  const mode = isRealMode() && !body.forceTest ? 'real' : 'test';
  if (!hasDb()) return Response.json({ saved: false, mode, error: 'no_db' });

  // Validate & recompute on the server so stored data is clean.
  // Note: the player's email (if any) is never sent to this route.
  const { purchases, total } = cleanPurchases(body.purchases);
  const validIds = new Set(purchases.map(p => p.id));

  const id = typeof body.id === 'string' && /^[0-9a-f-]{36}$/i.test(body.id) ? body.id : crypto.randomUUID();
  const startedAt = new Date(body.startedAt);
  const started = Number.isNaN(startedAt.getTime()) || startedAt > new Date() ? new Date() : startedAt;
  const duration = Math.max(0, Math.round((Date.now() - started.getTime()) / 1000));

  // Store the readable label for custom picks so the data makes sense later.
  const reducePick = purchases.find(p => p.id === body.reduceItem);
  const reduce = validIds.has(body.reduceItem)
    ? (reducePick.custom ? `custom: ${reducePick.label}` : reducePick.id)
    : null;

  // Recompute the refund on the server from the chosen expense.
  const refund = reducePick
    ? computeRefund({ id: reducePick.id, custom: Boolean(reducePick.custom), amount: reducePick.cost * reducePick.qty },
        { statementId: body.refundStatement, ownText: body.refundOwnText, levelId: body.refundLevel })
    : null;

  const comment = typeof body.postComment === 'string' && body.postComment.trim() ? body.postComment.trim().slice(0, 1000) : null;

  try {
    await query(
      `INSERT INTO ${tableFor(mode)} (id, started_at, duration_sec, ref_code, pre_mood, pre_energy, purchases, total_energy,
         reduce_item, refund_statement, refund_own_text, refund_level, refund_amount, net_energy,
         post_mood, post_energy, post_aware, post_helpful, post_comment)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
       ON CONFLICT (id) DO NOTHING`,
      [id, started.toISOString(), duration, normalizeRef(body.refCode),
       int(body.preMood, 1, 5), int(body.preEnergy, 0, 10),
       JSON.stringify(purchases), total.toFixed(2), reduce,
       refund?.statementId ?? null, refund?.own ? refund.text : null, refund?.levelId ?? null,
       refund ? refund.amount.toFixed(2) : null, (total - (refund?.amount ?? 0)).toFixed(2),
       int(body.postMood, 1, 5), int(body.postEnergy, 0, 10), int(body.postAware, 1, 5),
       int(body.postHelpful, 1, 5), comment],
    );
    return Response.json({ saved: true, mode });
  } catch (e) {
    console.error('save failed', e?.message);
    return Response.json({ saved: false, mode, error: 'db' }, { status: 500 });
  }
}
