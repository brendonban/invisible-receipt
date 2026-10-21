import { isRealMode } from '@/lib/mode';

export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json({ mode: isRealMode() ? 'real' : 'test' });
}
