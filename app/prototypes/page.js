import { GALLERY, PROTOTYPES, fmtDate } from '@/lib/prototypes';
import { PgHeader, PgFooter } from './chrome';

export const metadata = {
  title: `Prototypes · ${GALLERY.title}`,
  description: GALLERY.subtitle,
};

export default function Prototypes() {
  return (
    <div className="pg">
      <PgHeader />
      <main className="pg-wrap">
        <header className="pg-head">
          <p className="quote">“{GALLERY.quote}”</p>
          <h1>{GALLERY.title}</h1>
          <p className="byline">An activity by the <b>Emotional Health Project</b>. Prototype gallery.</p>
          <p className="lead">{GALLERY.subtitle}</p>
        </header>

        <div className="pg-count"><span>{PROTOTYPES.length} screens</span><span>tap one to see it on phone and desktop</span></div>

        <ol className="pg-list">
          {PROTOTYPES.map(p => (
            <li key={p.slug}>
              <a className="pg-card" href={`/prototypes/${p.slug}`}>
                <div className="pg-meta">
                  <span className="pg-num">{p.number}</span>
                  <time dateTime={p.date}>{fmtDate(p.date)}</time>
                </div>
                <h2>{p.title}</h2>
                <p>{p.description}</p>
                <span className="pg-go" aria-hidden="true">→</span>
              </a>
            </li>
          ))}
        </ol>
        <PgFooter />
      </main>
    </div>
  );
}
