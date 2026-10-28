// EHP header and footer for the gallery pages (same look as the game).
export function PgHeader() {
  return (
    <header className="top">
      <div className="top-inner">
        <a className="brand" href="/prototypes" style={{ color: 'inherit', textDecoration: 'none' }}>
          <span className="dot" aria-hidden="true" />Emotional Health Project
        </a>
        <div className="top-title"><b>Prototype gallery</b></div>
      </div>
    </header>
  );
}

export function PgFooter() {
  return (
    <footer className="credit">
      Made and built by{' '}
      <a href="https://brendonban.me" target="_blank" rel="noopener noreferrer">Brendon Ban</a>{' '}
      with <span role="img" aria-label="love">💛</span>
    </footer>
  );
}
