import { ITEMS, DRAIN_LEVELS } from '@/lib/items';
import { REFUND_LEVELS, statementText } from '@/lib/refunds';
import { query, TABLES } from '@/lib/db';
import { TZ, localDayStart } from '@/lib/stats';
import { normalizeRef } from '@/lib/ref';

// ── Filters from the URL (?tab=real|test&ref=&from=&to=) ──────────────────
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export function readFilters(sp) {
  const get = k => (typeof sp?.get === 'function' ? sp.get(k) : sp?.[k]) ?? '';
  const tab = get('tab') === 'test' ? 'test' : 'real';
  const rawRef = String(get('ref'));
  const ref = rawRef === '(none)' ? '(none)' : normalizeRef(rawRef);
  const from = DATE_RE.test(get('from')) ? get('from') : null;
  const to = DATE_RE.test(get('to')) ? get('to') : null;
  return { tab, ref, from, to };
}

// WHERE clause built only from validated values, with $n parameters.
export function whereFor({ ref, from, to }) {
  const parts = [], params = [];
  if (ref === '(none)') parts.push('ref_code IS NULL');
  else if (ref) { params.push(ref); parts.push(`ref_code = $${params.length}`); }
  if (from) { params.push(from); parts.push(`completed_at >= ${localDayStart(params.length)}`); }
  if (to) { params.push(to); parts.push(`completed_at < ${localDayStart(params.length)} + interval '1 day'`); }
  return { where: parts.length ? `WHERE ${parts.join(' AND ')}` : '', params };
}

const table = tab => (tab === 'test' ? TABLES.test : TABLES.real);

export async function loadDashboard(filters, limit = 300) {
  const { where, params } = whereFor(filters);
  const t = table(filters.tab);
  const [summary] = await query(
    `SELECT count(*)::int AS n,
            avg(post_mood - pre_mood)::float AS mood_change,
            avg(post_energy - pre_energy)::float AS energy_change,
            avg(post_helpful)::float AS helpful,
            avg(post_aware)::float AS aware,
            avg(total_energy)::float AS spent,
            avg(refund_amount)::float AS refund,
            avg(duration_sec)::float AS duration,
            min(completed_at) AS first, max(completed_at) AS last
     FROM ${t} ${where}`, params);
  const byRef = await query(
    `SELECT coalesce(ref_code, '(none)') AS ref, count(*)::int AS n,
            avg(post_mood - pre_mood)::float AS mood_change, avg(post_helpful)::float AS helpful,
            max(completed_at) AS last
     FROM ${t} ${where} GROUP BY 1 ORDER BY n DESC, ref`, params);
  const byDay = await query(
    `SELECT to_char(completed_at AT TIME ZONE '${TZ}', 'YYYY-MM-DD') AS day, count(*)::int AS n
     FROM ${t} ${where} GROUP BY 1 ORDER BY 1`, params);
  const rows = await query(
    `SELECT * FROM ${t} ${where} ORDER BY completed_at DESC LIMIT ${Number(limit) || 300}`, params);
  return { summary, byRef, byDay, rows };
}

export async function loadAll(filters) {
  const { where, params } = whereFor(filters);
  return query(`SELECT * FROM ${table(filters.tab)} ${where} ORDER BY completed_at DESC`, params);
}

// ── Making stored values readable ─────────────────────────────────────────
export const fmtTime = v => (v ? new Date(v).toLocaleString('en-GB', {
  timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
}) : '');

export const isoMyt = v => {
  if (!v) return '';
  const d = new Date(new Date(v).getTime() + 8 * 3600 * 1000);
  return d.toISOString().replace('T', ' ').slice(0, 19);
};

const asArray = v => (Array.isArray(v) ? v : typeof v === 'string' ? (() => { try { return JSON.parse(v); } catch { return []; } })() : []);

export function purchasesText(raw) {
  return asArray(raw).map(p => {
    if (p.custom) return `${p.qty}× ${p.label} (own, ${DRAIN_LEVELS.find(d => d.id === p.drain)?.label.toLowerCase() ?? p.drain})`;
    const item = ITEMS.find(i => i.id === p.id);
    if (!item) return `${p.qty}× ${p.id}`;
    return item.unit === 'x' ? `${p.qty}× ${item.label}` : `${p.qty} ${item.unit} ${item.label.replace(/^(Hours|Minutes) of /, '')}`;
  }).join('; ');
}

export function reduceText(v) {
  if (!v) return '';
  if (v.startsWith('custom: ')) return `${v.slice(8)} (own)`;
  return ITEMS.find(i => i.id === v)?.label ?? v;
}

export function refundText(row) {
  if (!row.refund_statement) return '';
  return row.refund_statement === 'own' ? (row.refund_own_text ?? '') : (statementText(row.refund_statement) ?? row.refund_statement);
}

export const levelText = v => REFUND_LEVELS.find(l => l.id === v)?.label ?? (v ?? '');
export const num = v => (v == null || v === '' ? null : Number(v));
