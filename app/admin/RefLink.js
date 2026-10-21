'use client';

import { useState } from 'react';

// Small helper on the admin page: type a code, copy the referral link.
export default function RefLink({ origin }) {
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const clean = code.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 32);
  const link = `${origin}/${clean || 'your-code'}`;
  async function copy() {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
  }
  return (
    <div className="reflink">
      <label className="adm-field">
        <span>Make a referral link</span>
        <input className="text" value={code} placeholder="e.g. um-booth, instagram, sunway-talk"
          onChange={e => { setCode(e.target.value); setCopied(false); }} autoCapitalize="none" spellCheck={false} />
      </label>
      <div className="reflink-out">
        <code>{link}</code>
        <button type="button" className="pill" onClick={copy} disabled={!clean}>{copied ? 'Copied' : 'Copy link'}</button>
      </div>
      <p className="small">Letters, numbers, - and _. Use one code per place you share it (a booth, a poster, a post).</p>
    </div>
  );
}
