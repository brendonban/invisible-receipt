// How "test" vs "real" is decided (server side only — players can't fake it):
//
//   REAL  = Vercel Production deployment (main branch) AND env APP_MODE=real
//   TEST  = everything else: local `npm run dev`, Vercel Preview deployments
//           (any other branch, e.g. `test`), or APP_MODE not set to "real".
//
// Facilitators can also force test mode on the live site with ?test=1 in the
// URL (handy for demos / training volunteers). Those sessions are NOT saved.
export function isRealMode() {
  return process.env.APP_MODE === 'real' && process.env.VERCEL_ENV === 'production';
}
