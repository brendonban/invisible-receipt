import { ITEMS, DRAIN_LEVELS, MAX_CUSTOM, MAX_CUSTOM_LABEL } from '@/lib/items';

export const int = (v, min, max) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};

// Validate & recompute purchases on the server. Never trust costs or
// labels for built-in items sent by the browser.
export function cleanPurchases(rawInput) {
  const raw = Array.isArray(rawInput) ? rawInput.slice(0, 50) : [];
  const builtInIds = new Set(ITEMS.map(i => i.id));

  const builtIn = raw
    .filter(p => p && !p.custom && builtInIds.has(p.id))
    .map(p => {
      const item = ITEMS.find(i => i.id === p.id);
      return { id: p.id, qty: int(p.qty, 0, 999) ?? 0, cost: item.cost };
    });

  const custom = raw
    .filter(p => p && p.custom && typeof p.id === 'string' && /^custom_[a-z0-9_]{1,40}$/i.test(p.id))
    .slice(0, MAX_CUSTOM)
    .map(p => {
      const level = DRAIN_LEVELS.find(d => d.id === p.drain) ?? DRAIN_LEVELS[1];
      const label = typeof p.label === 'string' ? p.label.trim().replace(/\s+/g, ' ').slice(0, MAX_CUSTOM_LABEL) : '';
      return { id: p.id, custom: true, label, drain: level.id, qty: int(p.qty, 0, 999) ?? 0, cost: level.cost };
    })
    .filter(p => p.label);

  const purchases = [...builtIn, ...custom].filter(p => p.qty > 0);
  const total = purchases.reduce((s, p) => s + p.cost * p.qty, 0);
  return { purchases, total };
}

// Human-readable receipt lines, used by the email.
export function receiptLines(purchases) {
  return purchases.map(p => {
    if (p.custom) return { text: `${p.qty}× ${p.label}`, amount: p.cost * p.qty };
    const item = ITEMS.find(i => i.id === p.id);
    const qty = item.unit === 'x' ? `${p.qty}×` : `${p.qty} ${item.unit}`;
    return { text: `${qty} ${item.label.replace(/^(Hours|Minutes) of /, '')}`, amount: p.cost * p.qty };
  });
}

export function itemLabel(purchases, id) {
  const p = purchases.find(x => x.id === id);
  if (!p) return null;
  return p.custom ? p.label : ITEMS.find(i => i.id === id).label;
}
