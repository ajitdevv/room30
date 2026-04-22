import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { supabaseAdmin } from '../lib/supabase.js';

const router = Router();

const propertySchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().max(3000).optional().nullable(),
  rent: z.coerce.number().int().nonnegative(),          // accept "15000" or 15000
  deposit: z.coerce.number().int().nonnegative().default(0),
  city: z.string().min(2).max(80).default('Jaipur'),
  locality: z.string().min(2).max(120),
  owner_phone: z.string().regex(/^[0-9+\-\s()]{7,20}$/, 'Invalid phone number'),
  tenant_type: z.enum(['student', 'family', 'professional', 'any']).optional().nullable(),
  furnishing: z.enum(['unfurnished', 'semi', 'full']).optional().nullable(),
  room_type: z.enum(['1rk', '1bhk', '2bhk', '3bhk', 'pg', 'shared']).optional().nullable(),
  amenities: z.array(z.string()).max(30).optional().default([]),
  available_from: z.string().optional().nullable(),  // ISO date
  images: z.array(z.string().url()).max(10).optional().default([]),
});

// Columns safe to expose on the public list endpoints. owner_phone is
// deliberately excluded — it's only returned on the detail endpoint and
// only after an unlock. Keep this list explicit so a future `select('*')`
// mistake can't regress the leak.
// Note: view_count is added dynamically below so endpoints don't fail
// when schema_patches/06_view_count.sql hasn't been applied yet.
const CORE_COLUMNS =
  'id, owner_id, title, description, rent, deposit, city, locality, ' +
  'tenant_type, furnishing, room_type, amenities, available_from, ' +
  'is_active, deleted_at, listing_number, created_at';

// Defence in depth: strip owner_phone from an object (or array) before
// responding. Cheap and keeps list payloads honest even if the select
// list is expanded.
function stripPhone(rowOrRows) {
  if (Array.isArray(rowOrRows)) return rowOrRows.map(stripPhone);
  if (rowOrRows && typeof rowOrRows === 'object' && 'owner_phone' in rowOrRows) {
    const { owner_phone: _omit, ...rest } = rowOrRows;
    return rest;
  }
  return rowOrRows;
}

// Flatten a Zod error into a human-readable string so the frontend
// can display it without having to know the schema shape.
function formatZod(err) {
  const flat = err.flatten();
  const parts = [];
  for (const [field, msgs] of Object.entries(flat.fieldErrors || {})) {
    if (msgs?.length) parts.push(`${field}: ${msgs.join(', ')}`);
  }
  if (flat.formErrors?.length) parts.push(flat.formErrors.join(', '));
  return parts.length ? parts.join(' · ') : 'Invalid input';
}

// GET /api/properties  — public list with filters
// Owners can pass ?mine=1 to see their own listings including paused/deleted ones.
router.get('/', async (req, res) => {
  const {
    q,            // city OR locality fuzzy match
    minRent, maxRent,
    tenant_type, furnishing, room_type,
    mine,
    limit = 24, offset = 0,
  } = req.query;

  // If ?mine=1 + auth, filter to caller's listings and include deleted/paused.
  let ownerId = null;
  if (mine) {
    const token = (req.headers.authorization || '').replace(/^Bearer /, '');
    if (token) {
      const { data: u } = await supabaseAdmin.auth.getUser(token);
      ownerId = u?.user?.id || null;
    }
  }

  // Owners viewing ?mine=1 legitimately need their own owner_phone (so the
  // dashboard can show it back to them); the public path must not.
  const selectCols = ownerId
    ? '*, property_images(image_url, sort_order)'
    : `${CORE_COLUMNS}, property_images(image_url, sort_order)`;

  let query = supabaseAdmin
    .from('properties')
    .select(selectCols)
    .order('created_at', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (ownerId) {
    query = query.eq('owner_id', ownerId);
  } else {
    query = query.eq('is_active', true).is('deleted_at', null);
  }

  if (q) {
    // Allow "00001" or "LST-00001" style lookup by listing_number.
    const numMatch = String(q).match(/^(?:LST-?)?0*(\d{1,9})$/i);
    if (numMatch) {
      query = query.eq('listing_number', Number(numMatch[1]));
    } else {
      query = query.or(`city.ilike.%${q}%,locality.ilike.%${q}%`);
    }
  }
  if (minRent) query = query.gte('rent', Number(minRent));
  if (maxRent) query = query.lte('rent', Number(maxRent));
  if (tenant_type) query = query.eq('tenant_type', tenant_type);
  if (furnishing)  query = query.eq('furnishing', furnishing);
  if (room_type)   query = query.eq('room_type', room_type);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  // Public path gets an extra strip as defence-in-depth.
  res.json({ properties: ownerId ? data : stripPhone(data) });
});

// GET /api/properties/trending — top-viewed active listings.
// Lightweight endpoint used by the listings page to surface a "Trending" strip.
// Falls back to "newest" order if the view_count column / schema patch
// 06_view_count.sql hasn't been applied yet.
router.get('/trending', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 6, 20);

  // First try with view_count (the ideal path).
  let { data, error } = await supabaseAdmin
    .from('properties')
    .select(`${CORE_COLUMNS}, view_count, property_images(image_url, sort_order)`)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('view_count', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  // Column missing → schema patch not applied. Return newest listings
  // instead of a 500 so the frontend just shows an empty trending strip.
  if (error && /view_count/i.test(error.message || '')) {
    const fallback = await supabaseAdmin
      .from('properties')
      .select(`${CORE_COLUMNS}, property_images(image_url, sort_order)`)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit);
    data = fallback.data;
    error = fallback.error;
  }

  if (error) return res.status(500).json({ error: error.message });
  res.json({ properties: stripPhone(data) });
});

// POST /api/properties/:id/view — fire-and-forget view counter.
// Unauthenticated on purpose (public listings = public views) but still
// rate-limited by the global middleware. The RPC is a no-op if the id is
// not an active/non-deleted listing.
router.post('/:id/view', async (req, res) => {
  const { id } = req.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'Invalid id' });
  const { error } = await supabaseAdmin.rpc('increment_property_views', { pid: id });
  // If the RPC / schema patch 06 isn't installed yet, don't blow up the
  // client — it's a fire-and-forget counter and the caller ignores 200/4xx.
  if (error && !/increment_property_views|view_count|does not exist/i.test(error.message || '')) {
    return res.status(500).json({ error: error.message });
  }
  res.json({ ok: true });
});

// GET /api/properties/:id  — detail. Phone hidden unless requester unlocked the owner.
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabaseAdmin
    .from('properties')
    .select('*, property_images(image_url, sort_order), profiles!properties_owner_id_fkey(name)')
    .eq('id', id)
    .single();
  if (error) return res.status(404).json({ error: 'Not found' });

  // Hide soft-deleted listings from anyone except the owner.
  if (data.deleted_at) {
    const token = (req.headers.authorization || '').replace(/^Bearer /, '');
    const { data: u } = token ? await supabaseAdmin.auth.getUser(token) : { data: null };
    if (u?.user?.id !== data.owner_id) {
      return res.status(404).json({ error: 'Not found' });
    }
  }

  // Decide whether to reveal owner_phone. Two — and only two — reasons
  // to return the number in plaintext:
  //   1. the caller IS the owner (viewing their own listing)
  //   2. the caller has EXPLICITLY unlocked the phone (POST /:id/unlock)
  //      — indicated by phone_revealed_at on the unlocked_contacts row.
  //      Merely having chatted with the owner no longer reveals the phone.
  // Everything else fails closed.
  let reveal = false;
  let reason = 'anonymous';
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  if (token) {
    const { data: u, error: uErr } = await supabaseAdmin.auth.getUser(token);
    const uid = u?.user?.id;
    if (uErr || !uid) {
      reason = 'invalid-token';
    } else if (uid === data.owner_id) {
      reveal = true;
      reason = 'owner-self';
    } else {
      // Try the new flag-based query first; fall back to the legacy
      // "any row unlocks" behaviour only if schema patch 08 isn't installed
      // (so the app doesn't break mid-migration).
      let unlocked = null;
      const flagged = await supabaseAdmin
        .from('unlocked_contacts')
        .select('id, phone_revealed_at')
        .eq('user_id', uid)
        .eq('owner_id', data.owner_id)
        .not('phone_revealed_at', 'is', null)
        .maybeSingle();

      if (flagged.error && /phone_revealed_at/i.test(flagged.error.message || '')) {
        // Column missing — patch 08 not applied yet. Fall back to legacy check.
        const legacy = await supabaseAdmin
          .from('unlocked_contacts')
          .select('id')
          .eq('user_id', uid)
          .eq('owner_id', data.owner_id)
          .maybeSingle();
        unlocked = legacy.data;
        if (unlocked) reason = 'unlocked-legacy';
      } else {
        unlocked = flagged.data;
        if (unlocked) reason = 'phone-explicitly-unlocked';
      }

      if (unlocked) reveal = true;
      else reason = reason === 'anonymous' ? 'not-unlocked' : reason;
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[properties:${id.slice(0, 8)}] phone ${reveal ? 'REVEALED' : 'hidden'} (${reason})`);
  }

  // Fail closed: even if the reveal logic above ever has a bug, the phone
  // is stripped off unless `reveal` is explicitly true.
  res.json({ property: reveal ? data : stripPhone(data) });
});

// POST /api/properties/:id/unlock — reveal owner_phone if caller has an active plan
router.post('/:id/unlock', requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const { data: prop, error: pErr } = await supabaseAdmin
    .from('properties')
    .select('id, owner_id, owner_phone')
    .eq('id', id)
    .single();
  if (pErr || !prop) return res.status(404).json({ error: 'Not found' });
  if (prop.owner_id === userId) {
    return res.json({ owner_phone: prop.owner_phone });
  }

  // Any existing row for this (user, owner) pair? It may have been created
  // from a chat (phone_revealed_at is null) or a previous unlock.
  const { data: existing } = await supabaseAdmin
    .from('unlocked_contacts')
    .select('id, phone_revealed_at')
    .eq('user_id', userId)
    .eq('owner_id', prop.owner_id)
    .maybeSingle();

  // Phone already revealed explicitly — just echo it back, no cost.
  if (existing?.phone_revealed_at) {
    return res.json({ owner_phone: prop.owner_phone });
  }

  // Row exists from a chat but phone was never explicitly revealed.
  // User already paid for this "contact" via the chat flow, so flipping
  // the reveal flag is free — don't charge again.
  if (existing) {
    const { error: upErr } = await supabaseAdmin
      .from('unlocked_contacts')
      .update({ phone_revealed_at: new Date().toISOString() })
      .eq('id', existing.id);
    // If phone_revealed_at column doesn't exist yet (patch 08 not applied),
    // the row itself is enough to unlock under the legacy code path.
    if (upErr && !/phone_revealed_at/i.test(upErr.message || '')) {
      return res.status(500).json({ error: upErr.message });
    }
    return res.json({ owner_phone: prop.owner_phone });
  }

  // No row yet — need an active subscription with quota.
  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .gt('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!sub) {
    return res.status(402).json({ error: 'No active plan — please subscribe', paywall: true });
  }

  const unlimited = sub.contacts_remaining === null;
  if (!unlimited && sub.contacts_remaining <= 0) {
    return res.status(402).json({ error: 'Contact quota exhausted', paywall: true });
  }

  // Insert with explicit reveal flag. If the column doesn't exist yet
  // (patch 08 not applied), retry without it.
  const row = {
    user_id: userId,
    owner_id: prop.owner_id,
    phone_revealed_at: new Date().toISOString(),
  };
  let { error: insErr } = await supabaseAdmin.from('unlocked_contacts').insert(row);
  if (insErr && /phone_revealed_at/i.test(insErr.message || '')) {
    const retry = await supabaseAdmin
      .from('unlocked_contacts')
      .insert({ user_id: userId, owner_id: prop.owner_id });
    insErr = retry.error;
  }
  if (insErr) return res.status(500).json({ error: insErr.message });

  if (!unlimited) {
    await supabaseAdmin
      .from('subscriptions')
      .update({ contacts_remaining: sub.contacts_remaining - 1 })
      .eq('id', sub.id);
  }

  res.json({ owner_phone: prop.owner_phone });
});

// POST /api/properties  — owner creates listing
router.post('/', requireAuth, async (req, res) => {
  const parsed = propertySchema.safeParse(req.body);
  if (!parsed.success) {
    console.error('[POST /api/properties] validation failed:', parsed.error.flatten());
    return res.status(400).json({ error: formatZod(parsed.error) });
  }

  // Strip nulls so Postgres sees undefined → default/null, not "null" strings.
  const cleaned = Object.fromEntries(
    Object.entries(parsed.data).filter(([, v]) => v !== null && v !== '')
  );
  const { images = [], ...fields } = cleaned;

  const { data: prop, error } = await req.sb
    .from('properties')
    .insert({ ...fields, owner_id: req.user.id })
    .select()
    .single();
  if (error) {
    console.error('[POST /api/properties] insert failed:', error);
    return res.status(400).json({ error: error.message, details: error.details || error.hint });
  }

  if (images.length) {
    const rows = images.map((url, i) => ({
      property_id: prop.id, image_url: url, sort_order: i,
    }));
    const { error: imgErr } = await req.sb.from('property_images').insert(rows);
    if (imgErr) {
      console.error('[POST /api/properties] images insert failed:', imgErr);
      // Listing was created; surface image error but don't rollback.
      return res.status(201).json({ property: prop, warning: `Listing created but images failed: ${imgErr.message}` });
    }
  }

  res.status(201).json({ property: prop });
});

// PATCH /api/properties/:id — partial edit (owner only)
const patchSchema = propertySchema.partial().extend({
  is_active: z.boolean().optional(),
});
router.patch('/:id', requireAuth, async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) {
    console.error('[PATCH /api/properties] validation failed:', parsed.error.flatten());
    return res.status(400).json({ error: formatZod(parsed.error) });
  }

  const { images, ...rawFields } = parsed.data;
  const fields = Object.fromEntries(
    Object.entries(rawFields).filter(([, v]) => v !== null && v !== '')
  );

  // Ownership check via RLS — req.sb is the user-scoped client.
  const { data: prop, error } = await req.sb
    .from('properties')
    .update(fields)
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) {
    console.error('[PATCH /api/properties] update failed:', error);
    return res.status(400).json({ error: error.message });
  }

  if (Array.isArray(images)) {
    // Replace image set: wipe + re-insert in order.
    await req.sb.from('property_images').delete().eq('property_id', req.params.id);
    if (images.length) {
      const rows = images.map((url, i) => ({
        property_id: req.params.id, image_url: url, sort_order: i,
      }));
      await req.sb.from('property_images').insert(rows);
    }
  }

  res.json({ property: prop });
});

// POST /api/properties/:id/restore — bring a soft-deleted listing back
router.post('/:id/restore', requireAuth, async (req, res) => {
  const { data, error } = await req.sb
    .from('properties')
    .update({ deleted_at: null, is_active: true })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ property: data });
});

// DELETE /api/properties/:id — soft-delete. Row is retained for 90 days
// so owners can restore it, then a cleanup job hard-deletes.
router.delete('/:id', requireAuth, async (req, res) => {
  const { error } = await req.sb
    .from('properties')
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

export default router;
