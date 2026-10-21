import { cleanPurchases, receiptLines, itemLabel } from '@/lib/receipt';
import { computeRefund } from '@/lib/refunds';

export const dynamic = 'force-dynamic';

// PRIVACY: the email address is used only to hand this one message to the
// email provider (Resend). It is NOT written to the database, NOT logged,
// and NOT included in any error message. Do not add console.log(body) here.

const EMAIL_RE = /^[^\s@<>()"',;:]{1,64}@[^\s@<>()"',;:]{1,190}\.[a-z]{2,}$/i;

const esc = s => String(s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function buildEmail(lines, total, reduceLabel, refund) {
  const mono = "font-family:'Courier New',monospace";
  const rule = '<hr style="border:0;border-top:2px dashed #c4c4c4;margin:12px 0">';
  const rows = lines.map(l =>
    `<tr><td style="padding:4px 0">${esc(l.text)}</td><td style="padding:4px 0;text-align:right">${l.amount.toFixed(2)}</td></tr>`
  ).join('');
  const net = total - (refund?.amount ?? 0);
  const totals = refund ? `
    <table style="width:100%;${mono};font-size:14px">
      <tr><td>SUBTOTAL</td><td style="text-align:right">${total.toFixed(2)}</td></tr>
      <tr><td style="color:#2f7a55;font-weight:bold">REFUND · kindness</td><td style="text-align:right;color:#2f7a55;font-weight:bold">-${refund.amount.toFixed(2)}</td></tr>
    </table>
    <div style="color:#2f7a55;font-size:12px;font-style:italic;margin:2px 0 6px">“${esc(refund.text)}”</div>
    ${rule}
    <table style="width:100%;${mono};font-size:16px;font-weight:bold"><tr><td>NET ENERGY SPENT</td><td style="text-align:right">${net.toFixed(2)}</td></tr></table>`
    : `<table style="width:100%;${mono};font-size:16px;font-weight:bold"><tr><td>MENTAL ENERGY SPENT</td><td style="text-align:right">${total.toFixed(2)}</td></tr></table>`;

  const html = `
<div style="background:#ffffff;padding:24px 12px;font-family:Inter,Arial,sans-serif;color:#111111">
  <div style="max-width:420px;margin:0 auto 16px;font-weight:600;font-size:15px">
    <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#fae463;border:1.5px solid #111;vertical-align:-1px"></span>
    &nbsp;Emotional Health Project
  </div>
  <div style="max-width:420px;margin:0 auto;background:#fff;border:1px solid #e9e9e9;padding:24px 20px;${mono};font-size:14px">
    <div style="text-align:center;font-weight:bold">INVISIBLE WORK CO.</div>
    <div style="text-align:center;color:#777;font-size:12px">${esc(new Date().toLocaleDateString('en-GB', { dateStyle: 'medium' }))}</div>
    ${rule}
    <table style="width:100%;border-collapse:collapse;${mono};font-size:14px">${rows}</table>
    ${rule}
    ${totals}
    <div style="color:#777;font-size:12px;margin-top:4px">Paid with: your wellbeing</div>
    ${rule}
    ${reduceLabel ? `<p style="margin:0 0 12px">This week I'm spending less on: <b>${esc(reduceLabel)}</b></p>` : ''}
    <div style="text-align:center;margin:16px 0 4px">
      <span style="display:inline-block;border:3px solid #c8553d;color:#c8553d;border-radius:8px;padding:6px 10px;font-weight:bold;letter-spacing:1px;transform:rotate(-6deg)">APPROVED FOR REST</span>
    </div>
    <p style="text-align:center;color:#777;font-size:12px;margin:12px 0 0">* Prices are made up. Feelings are not. *</p>
  </div>
  ${refund ? `<div style="max-width:420px;margin:16px auto 0;padding:16px 18px;background:#fff8cc;border-left:4px solid #fae463;font-size:16px;line-height:1.5">
    <div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#6b6b6b;margin-bottom:4px">Take this with you</div>
    “${esc(refund.text)}”</div>` : ''}
  <p style="max-width:420px;margin:16px auto 0;font-size:12px;color:#6b6b6b;line-height:1.5">
    Need to talk? Befrienders KL 03-7627 2929 (24 hours) · Talian HEAL 15555 (8am–midnight).<br>
    You asked for this receipt at our booth. We don't keep your email address and you won't hear from us again.
  </p>
</div>`;
  const text = [
    'INVISIBLE WORK CO.', '',
    ...lines.map(l => `${l.text}  ${l.amount.toFixed(2)}`), '',
    ...(refund
      ? [`SUBTOTAL: ${total.toFixed(2)}`, `REFUND (kindness): -${refund.amount.toFixed(2)}`, `"${refund.text}"`, `NET ENERGY SPENT: ${net.toFixed(2)}`]
      : [`MENTAL ENERGY SPENT: ${total.toFixed(2)}`]),
    'Paid with: your wellbeing', '',
    reduceLabel ? `This week I'm spending less on: ${reduceLabel}` : '',
    'APPROVED FOR REST', '',
    'Need to talk? Befrienders KL 03-7627 2929 (24 hours) / Talian HEAL 15555 (8am-midnight).',
    "We don't keep your email address and you won't hear from us again.",
  ].join('\n');
  return { html, text };
}

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return Response.json({ ok: false, error: 'bad_request' }, { status: 400 }); }

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  if (email.length > 254 || !EMAIL_RE.test(email)) {
    return Response.json({ ok: false, error: 'invalid_email' }, { status: 400 });
  }

  const { purchases, total } = cleanPurchases(body.purchases);
  if (purchases.length === 0) return Response.json({ ok: false, error: 'empty' }, { status: 400 });

  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    return Response.json({ ok: false, error: 'not_configured' }, { status: 503 });
  }

  const pick = purchases.find(p => p.id === body.reduceItem);
  const refund = pick
    ? computeRefund({ id: pick.id, custom: Boolean(pick.custom), amount: pick.cost * pick.qty },
        { statementId: body.refundStatement, ownText: body.refundOwnText, levelId: body.refundLevel })
    : null;
  const { html, text } = buildEmail(receiptLines(purchases), total, itemLabel(purchases, body.reduceItem), refund);

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [email],
        subject: 'Your Invisible Work Receipt 🧾',
        html, text,
      }),
    });
    if (!res.ok) {
      console.error('email send failed, status', res.status); // status only — never the address
      return Response.json({ ok: false, error: 'send_failed' }, { status: 502 });
    }
    return Response.json({ ok: true });
  } catch {
    console.error('email send failed, network');
    return Response.json({ ok: false, error: 'send_failed' }, { status: 502 });
  }
}
