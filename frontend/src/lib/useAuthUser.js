'use client';
import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { apiGet } from './api';

// Returns { user, profile, loading, refresh }
// profile.role is 'owner' | 'renter' | 'admin'
export function useAuthUser() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(u) {
    if (!u) { setProfile(null); return; }
    try {
      const r = await apiGet('/api/me', { auth: true });
      setProfile(r.profile || null);
    } catch {
      setProfile(null);
    }
  }

  async function refresh() {
    // getSession() reads the cached session — no network, no auth lock.
    // The backend still verifies the JWT on every request, so we don't
    // need a server round-trip just to know who the user is client-side.
    const { data } = await supabase.auth.getSession();
    const u = data.session?.user ?? null;
    setUser(u);
    await loadProfile(u);
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      const u = data.session?.user ?? null;
      setUser(u);
      await loadProfile(u);
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      const u = session?.user ?? null;
      setUser(u);
      await loadProfile(u);
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  return { user, profile, role: profile?.role ?? null, loading, refresh };
}
