import { query, hasDb, TABLES } from '@/lib/db';
import {
  readFilters, loadDashboard, fmtTime, purchasesText, reduceText, refundText, levelText, num,
} from '@/lib/admin';
import { COUNTER_SINCE } from '@/lib/stats';
import RefLink from './RefLink';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin · The Invisible Work Receipt', robots: { index: false, follow: false } };

const signed = (v, d = 1) => (v == null ? '–' : `${v > 0 ? '+' : ''}${v.toFixed(d)}`);
const fixed = (v, d = 1) => (v == null ? '–' : v.toFixed(d));
const mmss = s => (s == null ? '–' : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`);

function qs(base, patch) {
  const p = new URLSearchParams();
  const merged = { ...base, ...patch };
  for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : '';
}

// Fill gaps so quiet days show as empty columns rather than disappearing.
function fillDays(byDay) {
  if (byDay.length === 0) return [];
  const map = new Map(byDay.map(d => [d.day, d.n]));
  const out = [];
  const start = new Date(`${byDay[0].day}T00:00:00Z`);
  const end = new Date(`${byDay[byDay.length - 1].day}T00:00:00Z`);
  const span = Math.round((end - start) / 864e5);
  if (span > 120) return byDay; // very long ranges: just the days with data
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    out.push({ day: key, n: map.get(key) ?? 0 });
  }
  return out;
}
const dayLabel = iso => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

function DayChart({ days }) {
  if (days.length === 0) return <p className="small">No sessions in this range yet.</p>;
  const max = Math.max(...days.map(d => d.n), 1);
  const step = Math.ceil(days.length / 8);
  return (
    <figure className="daychart" aria-label="Completed sessions per day">
      <div className="daychart-max">{max}</div>
      <div className="dc-bars">
        {days.map(d => (
          <div key={d.day} className="dc-col" tabIndex={0} data-tip={`${dayLabel(d.day)} · ${d.n} ${d.n === 1 ? 'session' : 'sessions'}`}>
            <div className="dc-bar" style={{ height: d.n ? `${Math.max(3, (d.n / max) * 100)}%` : 0 }} />
          </div>
        ))}
      </div>
      <div className="dc-labels">
        {days.map((d, i) => <span key={d.day}>{i % step === 0 || i === days.length - 1 ? dayLabel(d.day) : ''}</span>)}
      </div>
      <table className="sr-only">
        <caption>Completed sessions per day (Malaysia time)</caption>
        <tbody>{days.map(d => <tr key={d.day}><th>{d.day}</th><td>{d.n}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}

export default async function Admin({ searchParams }) {
  const filters = readFilters(searchParams);
  // Referral links always use the public address, even when the admin page
  // is opened on a *.vercel.app or preview link. Override with PUBLIC_SITE_URL.
  const origin = (process.env.PUBLIC_SITE_URL || 'https://receipt.ruangmalaysia.org').replace(/\/+$/, '');
  const base = { tab: filters.tab, ref: filters.ref ?? '', from: filters.from ?? '', to: filters.to ?? '' };
  const filtered = Boolean(filters.ref || filters.from || filters.to);

  if (!hasDb()) {
    return (
      <main className="wrap admin">
        <AdminHeader />
        <p className="lead">No database is connected yet. Add one in Vercel → Storage, then run <code>sql/schema.sql</code>.</p>
      </main>
    );
  }

  let data, totals, refs;
  try {
    [data, [totals], refs] = await Promise.all([
      loadDashboard(filters),
      query(`SELECT (SELECT count(*) FROM ${TABLES.real})::int AS real, (SELECT count(*) FROM ${TABLES.test})::int AS test`),
      query(`SELECT DISTINCT ref_code FROM ${filters.tab === 'test' ? TABLES.test : TABLES.real} WHERE ref_code IS NOT NULL ORDER BY 1`),
    ]);
  } catch (e) {
    return (
      <main className="wrap admin">
        <AdminHeader />
        <p className="lead">Couldn&apos;t read the database. Have you run the latest <code>sql/schema.sql</code> in Neon?</p>
        <pre className="small">{String(e?.message ?? e)}</pre>
      </main>
    );
  }

  const { summary, byRef, byDay, rows } = data;
  const maxRef = Math.max(...byRef.map(r => r.n), 1);
  const cleared = typeof searchParams?.cleared === 'string' ? searchParams.cleared : null;

  return (
    <main className="wrap admin">
      <AdminHeader />

      <nav className="tabs" aria-label="Data set">
        <a href={qs(base, { tab: 'real' })} className={filters.tab === 'real' ? 'on' : ''} aria-current={filters.tab === 'real' ? 'page' : undefined}>
          Real sessions <b>{totals.real.toLocaleString()}</b>
        </a>
        <a href={qs(base, { tab: 'test' })} className={filters.tab === 'test' ? 'on test' : 'test'} aria-current={filters.tab === 'test' ? 'page' : undefined}>
          Test sessions <b>{totals.test.toLocaleString()}</b>
        </a>
      </nav>
      {filters.tab === 'test' && (
        <p className="testnote">You&apos;re looking at <b>test data</b>. It&apos;s stored in its own table and never appears in real results or the homepage counter.</p>
      )}

      <form className="filters" method="get">
        <input type="hidden" name="tab" value={filters.tab} />
        <label className="adm-field">
          <span>Referral code</span>
          <select name="ref" defaultValue={filters.ref ?? ''}>
            <option value="">All</option>
            <option value="(none)">(no code)</option>
            {refs.map(r => <option key={r.ref_code} value={r.ref_code}>{r.ref_code}</option>)}
          </select>
        </label>
        <label className="adm-field"><span>From</span><input type="date" name="from" defaultValue={filters.from ?? ''} /></label>
        <label className="adm-field"><span>To</span><input type="date" name="to" defaultValue={filters.to ?? ''} /></label>
        <button className="pill primary" type="submit">Apply</button>
        {filtered && <a className="pill" href={qs({ tab: filters.tab }, {})}>Reset</a>}
        <a className="pill" href={`/api/admin/export${qs(base, {})}`}>Download CSV</a>
      </form>

      <section className="tiles" aria-label="Summary">
        <div className="tile"><span>Completed sessions</span><b>{summary.n.toLocaleString()}</b>
          <small>{summary.first ? `${fmtTime(summary.first)} – ${fmtTime(summary.last)}` : 'none yet'}</small></div>
        <div className="tile"><span>Avg mood change</span><b>{signed(summary.mood_change)}</b><small>post minus pre, 1–5 scale</small></div>
        <div className="tile"><span>Avg energy change</span><b>{signed(summary.energy_change)}</b><small>post minus pre, 0–10 scale</small></div>
        <div className="tile"><span>Found it helpful</span><b>{fixed(summary.helpful)}<i> / 5</i></b><small>more aware: {fixed(summary.aware)} / 5</small></div>
        <div className="tile"><span>Avg energy spent</span><b>{fixed(summary.spent, 2)}</b><small>avg refund {fixed(summary.refund, 2)}</small></div>
        <div className="tile"><span>Avg time to finish</span><b>{mmss(summary.duration)}</b><small>minutes : seconds</small></div>
      </section>

      <div className="adm-grid">
        <section className="panel">
          <h3>Completed sessions per day</h3>
          <p className="small">Malaysia time. Hover a column for the exact number.</p>
          <DayChart days={fillDays(byDay)} />
        </section>

        <section className="panel">
          <h3>By referral code</h3>
          <p className="small">Where players came from. Click a code to filter.</p>
          {byRef.length === 0 ? <p className="small">No sessions yet.</p> : (
            <table className="reftable">
              <thead><tr><th>Code</th><th className="num">Sessions</th><th className="num">Mood Δ</th><th className="num">Helpful</th></tr></thead>
              <tbody>
                {byRef.map(r => (
                  <tr key={r.ref}>
                    <td><a href={qs(base, { ref: r.ref })}>{r.ref}</a>
                      <div className="inline-bar"><span style={{ width: `${(r.n / maxRef) * 100}%` }} /></div></td>
                    <td className="num">{r.n}</td>
                    <td className="num">{signed(num(r.mood_change))}</td>
                    <td className="num">{fixed(num(r.helpful))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <section className="panel">
        <div className="panel-head">
          <h3>Sessions</h3>
          <p className="small">
            {rows.length < summary.n ? `Latest ${rows.length} of ${summary.n}. Download the CSV for all of them.` : `${summary.n} ${summary.n === 1 ? 'session' : 'sessions'}, newest first.`}
          </p>
        </div>
        <div className="tablewrap">
          <table className="sessions">
            <thead>
              <tr>
                <th>Completed (MYT)</th><th>Ref</th><th>Mood</th><th>Energy</th><th>What they bought</th>
                <th className="num">Spent</th><th>Reduce</th><th>Kind words</th><th className="num">Refund</th><th className="num">Net</th>
                <th className="num">Aware</th><th className="num">Helpful</th><th className="num">Time</th><th>Comment</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={14} className="small">No sessions match these filters.</td></tr>}
              {rows.map(r => (
                <tr key={r.id}>
                  <td className="nowrap">{fmtTime(r.completed_at)}</td>
                  <td className="nowrap">{r.ref_code ?? <span className="muted">–</span>}</td>
                  <td className="nowrap">{r.pre_mood ?? '–'} → {r.post_mood ?? '–'}{r.pre_mood != null && r.post_mood != null && <span className="muted"> ({signed(r.post_mood - r.pre_mood, 0)})</span>}</td>
                  <td className="nowrap">{r.pre_energy} → {r.post_energy}</td>
                  <td className="wide">{purchasesText(r.purchases)}</td>
                  <td className="num">{fixed(num(r.total_energy), 2)}</td>
                  <td>{reduceText(r.reduce_item)}</td>
                  <td className="wide">{refundText(r) ? <>“{refundText(r)}”{r.refund_statement === 'own' && <span className="muted"> (own)</span>}<br /><span className="muted">{levelText(r.refund_level)}</span></> : <span className="muted">–</span>}</td>
                  <td className="num">{r.refund_amount != null ? `−${fixed(num(r.refund_amount), 2)}` : '–'}</td>
                  <td className="num">{fixed(num(r.net_energy), 2)}</td>
                  <td className="num">{r.post_aware ?? '–'}</td>
                  <td className="num">{r.post_helpful ?? '–'}</td>
                  <td className="num">{mmss(r.duration_sec)}</td>
                  <td className="wide">{r.post_comment ?? <span className="muted">–</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="adm-grid">
        <section className="panel"><RefLink origin={origin} /></section>
        <section className="panel">
          <h3>Homepage counter</h3>
          <p className="small">
            Counts real sessions completed since <b>{COUNTER_SINCE}</b> (Malaysia time), refreshed about every 30 seconds.
            Change the start date with the <code>COUNTER_SINCE</code> environment variable.
          </p>
          {filters.tab === 'test' && (
            <form className="clear" method="post" action="/api/admin/clear-test">
              <h3>Clear test data</h3>
              <p className="small">Deletes all {totals.test} test sessions. Real sessions are never affected. Type DELETE to confirm.</p>
              <input className="text" name="confirm" placeholder="DELETE" autoComplete="off" />
              <button className="pill" type="submit">Delete test sessions</button>
              {cleared === 'yes' && <p className="small">Test data cleared.</p>}
              {cleared === 'no' && <p className="err">Type DELETE (in capitals) to confirm.</p>}
            </form>
          )}
        </section>
      </div>
    </main>
  );
}

function AdminHeader() {
  return (
    <div className="adm-top">
      <div className="brand"><span className="dot" aria-hidden="true" />Emotional Health Project</div>
      <h1 className="adm-title">Invisible Work Receipt · Results</h1>
    </div>
  );
}
