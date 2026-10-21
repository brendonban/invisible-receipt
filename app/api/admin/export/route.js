import { hasDb } from '@/lib/db';
import {
  readFilters, loadAll, isoMyt, purchasesText, reduceText, refundText, levelText, num,
} from '@/lib/admin';

export const dynamic = 'force-dynamic';

// CSV for Excel / Google Sheets / SPSS. Protected by middleware.js.
const COLUMNS = [
  ['session_id', r => r.id],
  ['completed_at_myt', r => isoMyt(r.completed_at)],
  ['started_at_myt', r => isoMyt(r.started_at)],
  ['duration_sec', r => r.duration_sec],
  ['ref_code', r => r.ref_code ?? ''],
  ['pre_mood', r => r.pre_mood],
  ['post_mood', r => r.post_mood],
  ['mood_change', r => (r.pre_mood != null && r.post_mood != null ? r.post_mood - r.pre_mood : '')],
  ['pre_energy', r => r.pre_energy],
  ['post_energy', r => r.post_energy],
  ['energy_change', r => (r.pre_energy != null && r.post_energy != null ? r.post_energy - r.pre_energy : '')],
  ['purchases', r => purchasesText(r.purchases)],
  ['total_energy', r => num(r.total_energy)],
  ['reduce_item', r => reduceText(r.reduce_item)],
  ['refund_statement_id', r => r.refund_statement ?? ''],
  ['refund_words', r => refundText(r)],
  ['refund_level', r => levelText(r.refund_level)],
  ['refund_amount', r => num(r.refund_amount)],
  ['net_energy', r => num(r.net_energy)],
  ['post_aware', r => r.post_aware],
  ['post_helpful', r => r.post_helpful],
  ['post_comment', r => r.post_comment ?? ''],
  ['purchases_json', r => (typeof r.purchases === 'string' ? r.purchases : JSON.stringify(r.purchases ?? []))],
];

function cell(v) {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`; // stop spreadsheet formula injection
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req) {
  if (!hasDb()) return new Response('No database connected.', { status: 503 });
  const filters = readFilters(new URL(req.url).searchParams);
  const rows = await loadAll(filters);
  const csv = [COLUMNS.map(c => c[0]).join(','), ...rows.map(r => COLUMNS.map(([, f]) => cell(f(r))).join(','))].join('\r\n');
  const stamp = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
  return new Response('﻿' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="receipt-${filters.tab}-sessions-${stamp}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
