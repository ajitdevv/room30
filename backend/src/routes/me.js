import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabaseAdmin } from '../lib/supabase.js';

const router = Router();

// POST /api/me/check-email — check if an email is registered (for login error clarity)
router.post('/check-email', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.json({ exists: false });

    const normalizedEmail = email.toLowerCase().trim();

    // Check in auth.users table (most reliable source of truth)
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      console.error('Auth list users error:', error);
      return res.json({ exists: false });
    }

    const exists = users.some((u) => u.email?.toLowerCase() === normalizedEmail);
    res.json({ exists });
  } catch (e) {
    console.error('Email check exception:', e);
    res.json({ exists: false });
  }
});

// GET /api/me  — profile + active subscription
router.get('/', requireAuth, async (req, res) => {
  const { data: profile } = await supabaseAdmin
    .from('profiles').select('*').eq('id', req.user.id).single();

  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('*, plans(name, contacts_limit, duration_days)')
    .eq('user_id', req.user.id)
    .gt('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  res.json({ profile, subscription: sub });
});

// GET /api/me/plan-usage — everything the renter needs to track their plan:
//   - active subscription (purchase date, expiry, quota, plan details)
//   - unlocked_contacts (owner + property + unlock timestamp + phone-reveal flag)
//   - subscription_history (past plans, newest first)
router.get('/plan-usage', requireAuth, async (req, res) => {
  const uid = req.user.id;
  const nowIso = new Date().toISOString();

  const [active, historyRes, unlocksRes] = await Promise.all([
    // Active subscription (same semantics as GET /api/me).
    supabaseAdmin
      .from('subscriptions')
      .select('*, plans(id, name, price, contacts_limit, duration_days)')
      .eq('user_id', uid)
      .gt('expires_at', nowIso)
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    // All subs for this user (including expired) — newest first.
    supabaseAdmin
      .from('subscriptions')
      .select('id, created_at, expires_at, contacts_remaining, razorpay_payment_id, plans(name, price, contacts_limit, duration_days)')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(50),

    // Unlocked contacts — join owner name + property title so the UI can
    // render a meaningful "what you unlocked" table.
    // phone_revealed_at may not exist yet if schema patch 08 hasn't run;
    // we retry without it in that case.
    supabaseAdmin
      .from('unlocked_contacts')
      .select('id, created_at, phone_revealed_at, owner_id, property_id, owner:profiles!unlocked_contacts_owner_id_fkey(id, name, email), property:properties(id, title, listing_number, city, locality, rent)')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(200),
  ]);

  let unlocks = unlocksRes.data;
  // Fall back if patch 08 isn't applied — just drop phone_revealed_at.
  if (unlocksRes.error && /phone_revealed_at/i.test(unlocksRes.error.message || '')) {
    const legacy = await supabaseAdmin
      .from('unlocked_contacts')
      .select('id, created_at, owner_id, property_id, owner:profiles!unlocked_contacts_owner_id_fkey(id, name, email), property:properties(id, title, listing_number, city, locality, rent)')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(200);
    unlocks = (legacy.data || []).map((r) => ({ ...r, phone_revealed_at: null }));
  }

  res.json({
    subscription: active.data || null,
    history: historyRes.data || [],
    unlocked_contacts: unlocks || [],
    now: nowIso,
  });
});

export default router;
