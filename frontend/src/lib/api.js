'use client';
import { supabase } from './supabaseClient';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://room30.onrender.com';

// Treat the access token as stale if it's within this many seconds of expiry —
// refresh preemptively so long-idle tabs don't spam 401s.
const REFRESH_SKEW_SEC = 60;

async function currentToken({ forceRefresh = false } = {}) {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) return null;
  const expiresAt = session.expires_at || 0;
  const nowSec = Math.floor(Date.now() / 1000);
  const stale = expiresAt && expiresAt - nowSec < REFRESH_SKEW_SEC;
  if (forceRefresh || stale) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    return refreshed?.session?.access_token || session.access_token;
  }
  return session.access_token;
}

async function authHeader({ forceRefresh = false } = {}) {
  const token = await currentToken({ forceRefresh });
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function doRequest({ method, path, data, auth }) {
  async function send(headers) {
    const init = { method, headers };
    if (data !== undefined) init.body = JSON.stringify(data);
    const r = await fetch(`${API}${path}`, init);
    const body = await r.json().catch(() => ({}));
    return { r, body };
  }

  const base = data !== undefined ? { 'Content-Type': 'application/json' } : {};
  const headers = { ...base, ...(auth ? await authHeader() : {}) };
  let { r, body } = await send(headers);

  // Silent recovery: if the server rejected the token, try refreshing once and retry.
  if (r.status === 401 && auth) {
    const retryAuth = await authHeader({ forceRefresh: true });
    if (retryAuth.Authorization) {
      ({ r, body } = await send({ ...base, ...retryAuth }));
    }
  }

  if (!r.ok) throw Object.assign(new Error(body.error || r.statusText), { status: r.status, body });
  return body;
}

export function apiGet(path, { auth = false } = {}) {
  return doRequest({ method: 'GET', path, auth });
}
export function apiPost(path, data, { auth = true } = {}) {
  return doRequest({ method: 'POST', path, data, auth });
}
export function apiPatch(path, data, { auth = true } = {}) {
  return doRequest({ method: 'PATCH', path, data, auth });
}
export function apiDelete(path, { auth = true } = {}) {
  return doRequest({ method: 'DELETE', path, auth });
}
