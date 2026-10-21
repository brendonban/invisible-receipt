'use client';

import { useEffect, useMemo, useState } from 'react';
import { ITEMS, MOODS, DRAIN_LEVELS, MAX_CUSTOM, MAX_CUSTOM_LABEL } from '@/lib/items';
import { HELPLINES, EMERGENCY } from '@/lib/support';
import { normalizeRef } from '@/lib/ref';
import { REFUND_LEVELS, MAX_OWN_STATEMENT, refundOptions, computeRefund } from '@/lib/refunds';

// Screens: welcome → pre → shop → receipt → reduce → refund → post → thanks
const ORDER = ['pre', 'shop', 'receipt', 'reduce', 'refund', 'post'];
const STEP_NAMES = { pre: 'check in', shop: 'shop', receipt: 'receipt', reduce: 'choose', refund: 'refund counter', post: 'check out' };
const DEFAULT_QTY = { worrying: 3, apologies: 12, pleasing: 20 }; // from the activity card

// randomUUID only exists on https/localhost; fall back so phones on a LAN test still work.
const uuid = () => (globalThis.crypto?.randomUUID?.() ??
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  }));

function newSession() {
  return {
    id: uuid(),
    startedAt: new Date().toISOString(),
    preMood: null, preEnergy: 5,
    qty: Object.fromEntries(ITEMS.map(i => [i.id, DEFAULT_QTY[i.id] ?? 0])),
    custom: [], // [{ id, label, drain, qty }]
    reduceItem: null,
    refundStatement: null, refundOwnText: '', refundLevel: null, refundIssued: false,
    postMood: null, postEnergy: 5, postAware: null, postHelpful: null, postComment: '',
  };
}

const toPayload = lines => lines.map(l => l.custom
  ? { id: l.id, qty: l.qty, custom: true, label: l.label, drain: l.drain }
  : { id: l.id, qty: l.qty });

/* ───────── Small pieces ───────── */

function Header() {
  return (
    <header className="top">
      <div className="top-inner">
        <div className="brand"><span className="dot" aria-hidden="true" />Emotional Health Project</div>
        <div className="top-title"><b>The Invisible Work Receipt</b></div>
      </div>
    </header>
  );
}

function Progress({ step }) {
  const order = ORDER;
  const i = order.indexOf(step);
  const pct = ((i + 0.5) / order.length) * 100;
  return (
    <div className="progress" aria-label={`Step ${i + 1} of ${order.length}`}>
      <div className="progress-line">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
        <div className="progress-dot" style={{ left: `${pct}%` }} />
      </div>
      <div className="progress-meta"><span>{STEP_NAMES[step]}</span><span>step {i + 1} of {order.length}</span></div>
    </div>
  );
}

function MoodPicker({ value, onChange, label }) {
  return (
    <div className="moods" role="radiogroup" aria-label={label}>
      {MOODS.map(m => (
        <button key={m.value} type="button" role="radio" aria-checked={value === m.value}
          className={`mood ${value === m.value ? 'on' : ''}`} onClick={() => onChange(m.value)}>
          <span aria-hidden="true">{m.emoji}</span>{m.label}
        </button>
      ))}
    </div>
  );
}

function Energy({ value, onChange }) {
  return (
    <div className="slider">
      <input className="range" type="range" min="0" max="10" value={value}
        onChange={e => onChange(Number(e.target.value))} aria-label="Energy level, 0 to 10" />
      <div className="range-labels"><span>empty</span><b>{value} / 10</b><span>full</span></div>
    </div>
  );
}

function Likert({ value, onChange, low, high, label }) {
  return (
    <>
      <div className="likert" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" role="radio" aria-checked={value === n}
            className={value === n ? 'on' : ''} onClick={() => onChange(n)}>{n}</button>
        ))}
      </div>
      <div className="likert-labels"><span>{low}</span><span>{high}</span></div>
    </>
  );
}

function Receipt({ lines, total, orderId, final, refund, stamped }) {
  const shortLabel = l => (l.custom ? l.label : l.label.replace(/^(Hours|Minutes) of /, ''));
  return (
    <div className={`receipt ${final ? 'final' : ''} ${stamped ? 'stamped' : ''}`} aria-label="Your receipt">
      <div className="center"><b>INVISIBLE WORK CO.</b></div>
      {final && <div className="center tiny">{new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</div>}
      {orderId && <div className="center tiny">Order #{orderId.slice(0, 8).toUpperCase()}</div>}
      <div className="rule" />
      {lines.length === 0 && <div className="empty">nothing yet…</div>}
      {lines.map(l => (
        <div key={l.id} className="row">
          <span>{l.qty}{l.unit === 'x' ? '×' : ' ' + l.unit} {shortLabel(l)}</span>
          <span>{l.amount.toFixed(2)}</span>
        </div>
      ))}
      <div className="rule" />
      {refund ? (
        <>
          <div className="row"><span>SUBTOTAL</span><span>{total.toFixed(2)}</span></div>
          <div className="row refund"><span>REFUND · kindness</span><span>−{refund.amount.toFixed(2)}</span></div>
          <div className="refund-note">“{refund.text}”</div>
          <div className="rule" />
          <div className="row total"><span>NET ENERGY SPENT</span><span>{(total - refund.amount).toFixed(2)}</span></div>
        </>
      ) : (
        <div className="row total"><span>MENTAL ENERGY SPENT</span><span>{total.toFixed(2)}</span></div>
      )}
      <div className="row tiny"><span>Paid with</span><span>your wellbeing</span></div>
      {final && (
        <>
          <div className="rule" />
          <div className="center tiny">* Prices are made up. Feelings are not. *</div>
          <div className="center tiny">
            {refund ? 'Refund issued. Keep this receipt.' : 'Refunds available at the kindness counter.'}
          </div>
          {stamped && <div className="stamp">Approved for Rest</div>}
        </>
      )}
    </div>
  );
}

function AddOwn({ count, onAdd }) {
  const [label, setLabel] = useState('');
  const [drain, setDrain] = useState('medium');
  const full = count >= MAX_CUSTOM;
  const add = () => {
    const clean = label.trim().replace(/\s+/g, ' ');
    if (!clean || full) return;
    onAdd(clean, drain);
    setLabel(''); setDrain('medium');
  };
  return (
    <div className="addown">
      <div className="addown-title">Add your own</div>
      <div className="small">Something else that took energy today?</div>
      <input className="text" type="text" value={label} maxLength={MAX_CUSTOM_LABEL} disabled={full}
        placeholder={full ? `That's the max of ${MAX_CUSTOM}` : 'e.g. Replying to group chats'}
        onChange={e => setLabel(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
        aria-label="Your own invisible work" enterKeyHint="done" />
      <div className="sub">How draining was it?</div>
      <div className="chips" role="radiogroup" aria-label="How draining was it?">
        {DRAIN_LEVELS.map(d => (
          <button key={d.id} type="button" role="radio" aria-checked={drain === d.id}
            className={`chip ${drain === d.id ? 'on' : ''}`} onClick={() => setDrain(d.id)} disabled={full}>{d.label}</button>
        ))}
      </div>
      <button type="button" className="pill" onClick={add} disabled={!label.trim() || full}>+ Add to my receipt</button>
    </div>
  );
}

// The address lives only in this component's state — never in the session
// object — so it can't reach the survey database.
function EmailReceipt({ purchases, reduceItem, refund }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null);

  async function send(e) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setStatus('invalid'); return; }
    setStatus('sending');
    try {
      const res = await fetch('/api/email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), purchases, reduceItem, ...refund }),
      });
      const d = await res.json().catch(() => ({}));
      if (d.ok) { setStatus('sent'); setEmail(''); }
      else setStatus(d.error === 'invalid_email' ? 'invalid' : d.error === 'not_configured' ? 'off' : 'error');
    } catch { setStatus('error'); }
  }

  if (status === 'sent') {
    return <div className="emailbox sent"><b>Sent.</b> Check your inbox — and spam, just in case.</div>;
  }
  return (
    <form className="emailbox" onSubmit={send}>
      <div className="addown-title">Want a copy of your receipt?</div>
      <div className="small">Optional. We only use your email to send this one message, and we don&apos;t save it.</div>
      <input className="text" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com"
        value={email} onChange={e => { setEmail(e.target.value); if (status !== 'sending') setStatus(null); }}
        aria-label="Your email address" />
      <button type="submit" className="pill primary" disabled={!email.trim() || status === 'sending'}>
        {status === 'sending' ? 'Sending…' : 'Email my receipt'}
      </button>
      {status === 'invalid' && <p className="err">That email doesn&apos;t look quite right.</p>}
      {status === 'error' && <p className="err">Couldn&apos;t send right now. Please try again.</p>}
      {status === 'off' && <p className="err">Email isn&apos;t set up on this site yet.</p>}
    </form>
  );
}

function NeedToTalk({ raised }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`help ${raised ? 'raised' : ''}`}>
      {open && (
        <div className="help-panel" role="dialog" aria-label="Support lines">
          <h3>You don&apos;t have to carry it alone.</h3>
          <div className="small">Free, confidential support in Malaysia:</div>
          {HELPLINES.map(h => (
            <a key={h.name} href={`tel:${h.tel}`}>
              <span>{h.name}<small>{h.detail}</small></span><b>{h.phone}</b>
            </a>
          ))}
          <a href={`tel:${EMERGENCY.tel}`}><span>{EMERGENCY.label}</span><b>{EMERGENCY.phone}</b></a>
          <div className="small" style={{ marginTop: 8 }}>Or talk to one of our team at the booth.</div>
        </div>
      )}
      <button type="button" className="help-btn" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className="dot" aria-hidden="true" />{open ? 'Close' : 'Need to talk now?'}
      </button>
    </div>
  );
}

/* ───────── Game ───────── */

function formatSince(iso) {
  const d = new Date(`${iso}T00:00:00+08:00`);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Asia/Kuala_Lumpur' });
}

function Counter({ stats }) {
  if (!stats || stats.count == null) return <div className="counter placeholder" aria-hidden="true" />;
  const since = formatSince(stats.since);
  return (
    <div className="counter" aria-live="polite">
      <span className="counter-n">{stats.count.toLocaleString('en-MY')}</span>
      <span className="counter-l">
        {stats.count === 1 ? 'receipt' : 'receipts'} printed since {since}
        {stats.mode === 'test' && <em> · test</em>}
      </span>
    </div>
  );
}

export default function Game({ initialRef = null }) {
  const [step, setStep] = useState('welcome');
  const [s, setS] = useState(null);
  const [mode, setMode] = useState(null);
  const [forceTest, setForceTest] = useState(false);
  const [saveState, setSaveState] = useState(null);
  const [stats, setStats] = useState(null);
  // Referral code: from receipt.ruangmalaysia.org/<code> or ?ref=<code>.
  // Kept across "Next player" so a whole booth session is tagged.
  const [refCode, setRefCode] = useState(initialRef ?? '');

  const loadStats = test =>
    fetch(`/api/stats${test ? '?test=1' : ''}`, { cache: 'no-store' }).then(r => r.json()).then(setStats).catch(() => {});

  useEffect(() => {
    setS(newSession());
    const params = new URLSearchParams(window.location.search);
    const test = params.has('test');
    setForceTest(test);
    if (!initialRef) {
      const fromQuery = normalizeRef(params.get('ref') ?? '');
      if (fromQuery) setRefCode(fromQuery);
    }
    fetch('/api/mode').then(r => r.json()).then(d => setMode(d.mode)).catch(() => setMode('test'));
    loadStats(test);
  }, [initialRef]);

  const isTest = mode !== null && (mode !== 'real' || forceTest);
  const set = patch => setS(prev => ({ ...prev, ...patch }));
  const go = name => { setStep(name); window.scrollTo({ top: 0 }); };

  const lines = useMemo(() => {
    if (!s) return [];
    const builtIn = ITEMS.filter(i => s.qty[i.id] > 0)
      .map(i => ({ ...i, qty: s.qty[i.id], amount: i.cost * s.qty[i.id] }));
    const own = s.custom.filter(c => c.qty > 0).map(c => {
      const cost = DRAIN_LEVELS.find(d => d.id === c.drain).cost;
      return { id: c.id, label: c.label, unit: 'x', cost, qty: c.qty, amount: cost * c.qty, custom: true, drain: c.drain };
    });
    return [...builtIn, ...own];
  }, [s]);
  const total = lines.reduce((a, l) => a + l.amount, 0);

  const bumpBuiltIn = (id, d) => set({ qty: { ...s.qty, [id]: Math.max(0, Math.min(999, s.qty[id] + d)) } });
  const addCustom = (label, drain) =>
    set({ custom: [...s.custom, { id: `custom_${s.custom.length + 1}_${Date.now().toString(36)}`, label, drain, qty: 1 }] });
  const bumpCustom = (id, d) =>
    set({ custom: s.custom.map(c => c.id === id ? { ...c, qty: Math.max(0, Math.min(999, c.qty + d)) } : c) });
  const removeCustom = id =>
    set({ custom: s.custom.filter(c => c.id !== id), reduceItem: s.reduceItem === id ? null : s.reduceItem });

  async function submit() {
    setSaveState('saving');
    try {
      const res = await fetch('/api/session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...s, ...refundPayload, refCode: normalizeRef(refCode), forceTest, purchases: toPayload(lines) }),
      });
      const d = await res.json();
      setSaveState(d.saved ? (d.mode === 'test' ? 'test-saved' : 'saved') : d.mode === 'test' ? 'test' : 'error');
    } catch { setSaveState('error'); }
    go('thanks');
  }

  function restart() { setS(newSession()); setSaveState(null); go('welcome'); loadStats(forceTest); }

  const ready = Boolean(s);
  const chosen = lines.find(l => l.id === s?.reduceItem);
  const refund = s && chosen
    ? computeRefund(chosen, { statementId: s.refundStatement, ownText: s.refundOwnText, levelId: s.refundLevel })
    : null;
  const refundPayload = refund
    ? { refundStatement: refund.statementId, refundOwnText: refund.own ? refund.text : '', refundLevel: refund.levelId }
    : {};
  const pickReduce = id => set({ reduceItem: id, refundStatement: null, refundOwnText: '', refundLevel: null, refundIssued: false });

  return (
    <>
      <Header />
      {isTest && <div className="testbar">Test mode · saved separately, never counted as real data</div>}

      <main className="wrap">
        {step !== 'welcome' && step !== 'thanks' && <Progress step={step} />}

        {step === 'welcome' && (
          <div className="split">
            <div>
              <p className="quote">“I&apos;m fine. Just a bit tired.”</p>
              <h1>The Invisible Work Receipt</h1>
              <p className="byline">An activity by the <b>Emotional Health Project</b>. About 3 minutes.</p>
              <p className="lead">
                Busy days have hidden costs. “Buy” the invisible work you did today,
                see what it added up to, and choose one thing to spend less on this week.
              </p>
              <p className="caption">
                <b>Anonymous.</b> We don&apos;t ask for your name. Your answers help us improve this
                activity, and you can stop at any time.
              </p>
              <label className="refbox">
                <span>Referral code <i>(optional)</i></span>
                <input className="text" type="text" value={refCode} maxLength={32}
                  autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="e.g. um-booth"
                  onChange={e => setRefCode(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))} />
              </label>
              <div className="actions">
                <button className="pill primary" onClick={() => go('pre')} disabled={!ready}>Start</button>
              </div>
              <Counter stats={stats} />
            </div>
            <div className="side desktop-only" aria-hidden="true">
              <div className="receipt-hero">
                <Receipt total={26.5} lines={[
                  { id: 'a', qty: 3, unit: 'hr', label: 'worrying', amount: 13.5, custom: true },
                  { id: 'b', qty: 12, unit: 'x', label: 'Unnecessary apologies', amount: 9, custom: true },
                  { id: 'c', qty: 20, unit: 'min', label: 'people-pleasing', amount: 4, custom: true },
                ]} />
              </div>
            </div>
          </div>
        )}

        {ready && step === 'pre' && (
          <div className="col">
            <h2>Before we start, how are you feeling right now?</h2>
            <p className="lead">There&apos;s no right answer.</p>
            <MoodPicker value={s.preMood} onChange={v => set({ preMood: v })} label="Mood before" />
            <div className="label">How much energy do you have left today?</div>
            <Energy value={s.preEnergy} onChange={v => set({ preEnergy: v })} />
            <div className="actions">
              <button className="pill primary" disabled={!s.preMood} onClick={() => go('shop')}>Next</button>
            </div>
          </div>
        )}

        {ready && step === 'shop' && (
          <div className="split">
            <div>
              <h2>What did you “buy” today?</h2>
              <p className="lead">Add the invisible work you did. Rough guesses are perfect.</p>
              <div className="items">
                {ITEMS.map(i => {
                  const q = s.qty[i.id];
                  return (
                    <div key={i.id} className={`item ${q > 0 ? 'on' : ''}`}>
                      <div className="name"><span className="mark" aria-hidden="true" />{i.label}</div>
                      <div className="qty">
                        <button type="button" onClick={() => bumpBuiltIn(i.id, -1)} aria-label={`less ${i.label}`}>−</button>
                        <b aria-live="polite">{q}</b>
                        <button type="button" onClick={() => bumpBuiltIn(i.id, 1)} aria-label={`more ${i.label}`}>+</button>
                      </div>
                    </div>
                  );
                })}
                {s.custom.map(c => (
                  <div key={c.id} className={`item ${c.qty > 0 ? 'on' : ''}`}>
                    <div className="name">
                      <span className="mark" aria-hidden="true" />
                      <span>{c.label}
                        <small>{DRAIN_LEVELS.find(d => d.id === c.drain).label} draining ·{' '}
                          <button type="button" className="linkbtn" onClick={() => removeCustom(c.id)}>remove</button></small>
                      </span>
                    </div>
                    <div className="qty">
                      <button type="button" onClick={() => bumpCustom(c.id, -1)} aria-label={`less ${c.label}`}>−</button>
                      <b aria-live="polite">{c.qty}</b>
                      <button type="button" onClick={() => bumpCustom(c.id, 1)} aria-label={`more ${c.label}`}>+</button>
                    </div>
                  </div>
                ))}
              </div>
              <AddOwn count={s.custom.length} onAdd={addCustom} />
            </div>

            <div className="side desktop-only">
              <Receipt lines={lines} total={total} orderId={s.id} />
              <div className="actions">
                <button className="pill primary" style={{ width: '100%' }} disabled={lines.length === 0}
                  onClick={() => go('receipt')}>Print my receipt</button>
              </div>
            </div>

            <div className="bar mobile-only">
              <div className="tot">energy spent<b>{total.toFixed(2)}</b></div>
              <button className="pill primary" disabled={lines.length === 0} onClick={() => go('receipt')}>Print my receipt</button>
            </div>
          </div>
        )}

        {ready && step === 'receipt' && (
          <div className="receipt-stage">
            <Receipt lines={lines} total={total} orderId={s.id} final />
            <div>
              <h2>Here&apos;s what today cost.</h2>
              <p className="caption">
                <b>None of this shows up on a to-do list.</b> Worrying, apologising and keeping everyone
                happy are real effort, even when nobody sees them. Noticing them is the first step.
              </p>
              <p className="caption">Hold on to your receipt. The kindness counter is up next.</p>
              <div className="actions">
                <button className="pill primary" onClick={() => go('reduce')}>Next</button>
                <button className="pill" onClick={() => go('shop')}>Change something</button>
              </div>
            </div>
          </div>
        )}

        {ready && step === 'reduce' && (
          <div className="col">
            <h2>Which expense would you like to reduce this week?</h2>
            <p className="lead">Pick just one. Small is fine.</p>
            <div className="choices" role="radiogroup" aria-label="Expense to reduce">
              {lines.map(l => (
                <button key={l.id} type="button" role="radio" aria-checked={s.reduceItem === l.id}
                  className={`choice ${s.reduceItem === l.id ? 'on' : ''}`} onClick={() => pickReduce(l.id)}>
                  <span className="mark" aria-hidden="true" />{l.label}<span className="amt">{l.amount.toFixed(2)}</span>
                </button>
              ))}
            </div>
            <div className="actions">
              <button className="pill primary" disabled={!s.reduceItem} onClick={() => go('refund')}>Next</button>
            </div>
          </div>
        )}

        {ready && step === 'refund' && chosen && !s.refundIssued && (
          <div className="split">
            <div>
              <h2>Welcome to the kindness counter.</h2>
              <p className="lead">
                You chose <b style={{ color: 'var(--ink)' }}>{chosen.label.toLowerCase()}</b>. Pick the words that
                feel most true for you today. They&apos;ll refund some of what it cost.
              </p>
              <div className="choices" role="radiogroup" aria-label="Kind words">
                {refundOptions(chosen.id, chosen.custom).map(o => (
                  <button key={o.id} type="button" role="radio" aria-checked={s.refundStatement === o.id}
                    className={`choice words ${s.refundStatement === o.id ? 'on' : ''}`}
                    onClick={() => set({ refundStatement: o.id })}>
                    <span className="mark" aria-hidden="true" /><span>“{o.text}”</span>
                  </button>
                ))}
                <button type="button" role="radio" aria-checked={s.refundStatement === 'own'}
                  className={`choice words ${s.refundStatement === 'own' ? 'on' : ''}`}
                  onClick={() => set({ refundStatement: 'own' })}>
                  <span className="mark" aria-hidden="true" /><span>Write my own kind words</span>
                </button>
              </div>
              {s.refundStatement === 'own' && (
                <textarea className="text own-words" maxLength={MAX_OWN_STATEMENT} autoFocus
                  placeholder="What would you say to a friend who spent this today?"
                  value={s.refundOwnText} onChange={e => set({ refundOwnText: e.target.value })}
                  aria-label="Your own kind words" />
              )}

              <div className="label">How much does this give back?</div>
              <div className="chips" role="radiogroup" aria-label="How much it gives back">
                {REFUND_LEVELS.map(l => (
                  <button key={l.id} type="button" role="radio" aria-checked={s.refundLevel === l.id}
                    className={`chip ${s.refundLevel === l.id ? 'on' : ''}`} onClick={() => set({ refundLevel: l.id })}>
                    {l.label} <span className="chip-amt">−{(chosen.amount * l.share).toFixed(2)}</span>
                  </button>
                ))}
              </div>
              <p className="small">Kind words don&apos;t erase what today cost. They help you get some of it back.</p>

              <div className="actions">
                <button className="pill primary" disabled={!refund} onClick={() => { set({ refundIssued: true }); window.scrollTo({ top: 0 }); }}>
                  Issue my refund
                </button>
              </div>
            </div>
            <div className="side desktop-only">
              <Receipt lines={lines} total={total} orderId={s.id} refund={refund} />
            </div>
          </div>
        )}

        {ready && step === 'refund' && chosen && s.refundIssued && refund && (
          <div className="receipt-stage">
            <Receipt lines={lines} total={total} orderId={s.id} refund={refund} final stamped />
            <div>
              <h2>Refund issued.</h2>
              <p className="caption">
                <b>You got {refund.amount.toFixed(2)} back.</b> Today still cost something, and that&apos;s okay.
                Being kind to yourself is how you start getting some of it back.
              </p>
              <div className="actions">
                <button className="pill primary" onClick={() => go('post')}>Next</button>
                <button className="pill" onClick={() => set({ refundIssued: false })}>Choose different words</button>
              </div>
            </div>
          </div>
        )}

        {ready && step === 'post' && (
          <div className="col">
            <h2>Last bit. How are you feeling now?</h2>
            <p className="lead">Four quick questions and you&apos;re done.</p>
            <MoodPicker value={s.postMood} onChange={v => set({ postMood: v })} label="Mood after" />
            <div className="label">How much energy do you have now?</div>
            <Energy value={s.postEnergy} onChange={v => set({ postEnergy: v })} />
            <div className="label">I&apos;m more aware of the invisible effort I put in.</div>
            <Likert value={s.postAware} onChange={v => set({ postAware: v })} low="disagree" high="agree" label="More aware" />
            <div className="label">This activity was helpful.</div>
            <Likert value={s.postHelpful} onChange={v => set({ postHelpful: v })} low="not at all" high="very" label="Helpful" />
            <div className="label">Anything else? <span>(optional)</span></div>
            <textarea className="text" maxLength={1000} value={s.postComment}
              onChange={e => set({ postComment: e.target.value })} aria-label="Anything else" />
            <div className="actions">
              <button className="pill primary" onClick={submit}
                disabled={!s.postMood || !s.postAware || !s.postHelpful || saveState === 'saving'}>
                {saveState === 'saving' ? 'Saving…' : 'Finish'}
              </button>
            </div>
          </div>
        )}

        {ready && step === 'thanks' && (
          <div className="split">
            <div>
              <p className="quote">“Approved for rest.”</p>
              <h1>Thank you.</h1>
              {chosen && (
                <p className="lead">
                  Your one small step this week: spend a little less on <b style={{ color: 'var(--ink)' }}>{chosen.label.toLowerCase()}</b>.
                </p>
              )}
              {refund && (
                <blockquote className="takeaway">
                  <span>Take this with you</span>
                  “{refund.text}”
                </blockquote>
              )}
              {saveState === 'test-saved' && <p className="small">Test mode. Saved to test data only, not counted as real.</p>}
              {saveState === 'test' && <p className="small">Test mode. Not saved (no database connected).</p>}
              {saveState === 'error' && <p className="small">We couldn&apos;t save your answers, but thanks for playing.</p>}
              <div className="actions">
                <button className="pill" onClick={restart}>Next player</button>
              </div>
            </div>
            <div className="side">
              <EmailReceipt reduceItem={s.reduceItem} purchases={toPayload(lines)} refund={refundPayload} />
            </div>
          </div>
        )}
        <footer className="credit">
          Made and built by{' '}
          <a href="https://brendonban.me" target="_blank" rel="noopener noreferrer">Brendon Ban</a>{' '}
          with <span role="img" aria-label="love">💛</span>
        </footer>
      </main>

      <NeedToTalk raised={step === 'shop'} />
    </>
  );
}
