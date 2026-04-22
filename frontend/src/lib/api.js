'use client';
import { supabase } from './supabaseClient';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiGet(path, { auth = false } = {}) {
  const headers = auth ? await authHeader() : {};
  const r = await fetch(`${API}${path}`, { headers });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(body.error || r.statusText), { status: r.status, body });
  return body;
}

export async function apiPost(path, data, { auth = true } = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(auth ? await authHeader() : {}),
  };
  const r = await fetch(`${API}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(body.error || r.statusText), { status: r.status, body });
  return body;
}

export async function apiPatch(path, data, { auth = true } = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(auth ? await authHeader() : {}),
  };
  const r = await fetch(`${API}${path}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(data),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(body.error || r.statusText), { status: r.status, body });
  return body;
}

export async function apiDelete(path, { auth = true } = {}) {
  const headers = auth ? await authHeader() : {};
  const r = await fetch(`${API}${path}`, { method: 'DELETE', headers });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(body.error || r.statusText), { status: r.status, body });
  return body;
}
