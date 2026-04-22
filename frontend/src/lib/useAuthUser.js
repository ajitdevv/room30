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
    const { data } = await supabase.auth.getUser();
    setUser(data.user ?? null);
    await loadProfile(data.user);
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!alive) return;
      setUser(data.user ?? null);
      await loadProfile(data.user);
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
