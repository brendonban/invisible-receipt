// Referral codes: receipt.ruangmalaysia.org/<code> or ?ref=<code>.
// Letters, numbers, dash and underscore, up to 32 characters; stored lowercase.
export const REF_RE = /^[a-z0-9][a-z0-9_-]{0,31}$/;

// Paths the site uses itself, so they can never be referral codes.
const RESERVED = new Set(['admin', 'api', 'prototypes', 'favicon', 'robots', 'sitemap']);

export function normalizeRef(value) {
  if (typeof value !== 'string') return null;
  let v = value;
  try { v = decodeURIComponent(v); } catch { /* keep as is */ }
  v = v.trim().toLowerCase();
  return REF_RE.test(v) && !RESERVED.has(v) ? v : null;
}
