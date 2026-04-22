'use client';
import { createBrowserClient } from '@supabase/ssr';

let _client = null;

function getClient() {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    if (typeof window !== 'undefined') {
      console.warn('Supabase env vars missing — set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
    }
    // Build-time / SSR: stub client whose methods throw only if actually called.
    return new Proxy({}, {
      get() {
        return () => { throw new Error('Supabase not configured'); };
      },
    });
  }
  _client = createBrowserClient(url, key);
  return _client;
}

export const supabase = new Proxy({}, {
  get(_t, prop) {
    const c = getClient();
    const v = c[prop];
    return typeof v === 'function' ? v.bind(c) : v;
  },
});
