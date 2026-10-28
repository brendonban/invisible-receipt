import { notFound } from 'next/navigation';
import { GALLERY, PROTOTYPES, findPrototype, fmtDate } from '@/lib/prototypes';
import Frame from '../Frame';
import { PgHeader, PgFooter } from '../chrome';

export function generateStaticParams() {
  return PROTOTYPES.map(p => ({ slug: p.slug }));
}

export function generateMetadata({ params }) {
  const p = findPrototype(params.slug);
  return p ? { title: `${p.number} ${p.title} · ${GALLERY.title}`, description: p.description } : {};
}

export default function PrototypeScreen({ params }) {
  const p = findPrototype(params.slug);
  if (!p) notFound();
  const i = PROTOTYPES.indexOf(p);
  const prev = PROTOTYPES[i - 1];
  const next = PROTOTYPES[i + 1];
  const src = `/?demo=${p.step}`;

  return (
    <div className="pg">
      <PgHeader />
      <main className="pg-wrap wide">
        <a className="pg-back" href="/prototypes">← All prototypes</a>

        <header className="pg-detail">
          <div className="pg-meta">
            <span className="pg-num">{p.number}</span>
            <time dateTime={p.date}>{fmtDate(p.date)}</time>
          </div>
          <h1>{p.title}</h1>
          <p className="lead">{p.description}</p>
          {p.notes?.length > 0 && <ul className="pg-notes">{p.notes.map(n => <li key={n}>{n}</li>)}</ul>}
        </header>

        <div className="pg-frames">
          <Frame kind="phone" src={src} width={390} height={844} label="Phone · 390 × 844" />
          <Frame kind="desktop" src={src} width={1280} height={800} label="Desktop · 1280 × 800" />
        </div>
        <p className="pg-hint">
          These previews are live, with sample answers. Nothing is saved or sent.{' '}
          <a href={src} target="_blank" rel="noopener noreferrer">Open full screen ↗</a>
        </p>

        <nav className="pg-pager" aria-label="Other screens">
          {prev ? <a href={`/prototypes/${prev.slug}`}><span>← {prev.number}</span>{prev.title}</a> : <span />}
          {next ? <a className="next" href={`/prototypes/${next.slug}`}><span>{next.number} →</span>{next.title}</a> : <span />}
        </nav>
        <PgFooter />
      </main>
    </div>
  );
}
