import { notFound } from 'next/navigation';
import Game from '@/components/Game';
import { normalizeRef } from '@/lib/ref';

// receipt.ruangmalaysia.org/<code> → the same game, with the referral code
// filled in. Anything that isn't a valid code (e.g. /hello.png) is a 404.
export default function ReferralPage({ params }) {
  const ref = normalizeRef(params.ref);
  if (!ref) notFound();
  return <Game initialRef={ref} />;
}

export const metadata = { robots: { index: false } };
