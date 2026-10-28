'use client';

import { useEffect, useRef, useState } from 'react';

// Shows a page at a real device size (e.g. 390×844 or 1280×800), scaled down
// to fit its column. The preview is live: it can be tapped and scrolled.
export default function Frame({ src, width, height, label, kind }) {
  const box = useRef(null);
  const [scale, setScale] = useState(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / width);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);

  return (
    <figure className={`pg-frame ${kind}`}>
      <div ref={box} className="pg-screen" style={{ height: scale ? height * scale : undefined, aspectRatio: scale ? undefined : `${width} / ${height}` }}>
        {scale && (
          <iframe src={src} title={label}
            style={{ width, height, transform: `scale(${scale})` }} />
        )}
      </div>
      <figcaption>{label}</figcaption>
    </figure>
  );
}
