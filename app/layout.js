import localFont from 'next/font/local';
import './globals.css';

// Inter, bundled from npm and self-hosted by Next.js: one preloaded ~48KB
// variable file, no Google request at runtime or build time, and an
// auto-adjusted fallback so the page doesn't jump when the font loads.
const inter = localFont({
  src: '../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
  weight: '100 900',
  display: 'swap',
  variable: '--font-sans',
});

export const metadata = {
  title: 'The Invisible Work Receipt · Emotional Health Project',
  description: 'A 3-minute activity about the hidden costs of a busy day.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#ffffff',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
