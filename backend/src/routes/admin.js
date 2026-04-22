import { Router } from 'express';
import { z } from 'zod';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { logAdmin } from '../services/auditLog.js';
import { isMissingSchemaError, mentions } from '../lib/schemaErrors.js';

const router = Router();

// Every route in this file is admin-only.
router.use(requireAdmin);

// ---------------------------------------------------------------------------
// GET /api/admin/stats  — headline numbers for the dashboard tiles
// ---------------------------------------------------------------------------
router.get('/stats', async (_req, res) => {
  const since7 = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

  // Run all counts in parallel.
  const [
    usersTotal, ownersTotal, admins,
    propsTotal, propsLive,
    subsActive, reportsOpen, reviewsTotal,
    usersNew7, propsNew7,
  ] = await Promise.all([
    supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'owner'),
    supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin'),
    supabaseAdmin.from('properties').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('properties').select('id', { count: 'exact', head: true }).eq('is_active', true).is('deleted_at', null),
    supabaseAdmin.from('subscriptions').select('id', { count: 'exact', head: true }).gt('expires_at', new Date().toISOString()),
    supabaseAdmin.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    supabaseAdmin.from('owner_reviews').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', since7),
    supabaseAdmin.from('properties').select('id', { count: 'exact', head: true }).gte('created_at', since7),
  ]);

  // Revenue — sum plan.price for active subs (paise → rupees later on client).
  const { data: subsRev } = await supabaseAdmin
    .from('subscriptions')
    .select('plans(price)')
    .gt('expires_at', new Date().toISOString());
  const revenuePaise = (subsRev || []).reduce((acc, s) => acc + Number(s?.plans?.price || 0), 0);

  res.json({
    users: {
      total:   usersTotal.count || 0,
      owners:  ownersTotal.count || 0,
      admins:  admins.count || 0,
      new_7d:  usersNew7.count || 0,
    },
    properties: {
      total:  propsTotal.count || 0,
      live:   propsLive.count || 0,
      new_7d: propsNew7.count || 0,
    },
    subscriptions: {
      active: subsActive.count || 0,
      revenue_paise: revenuePaise,
    },
    reports: {
      open: reportsOpen.count || 0,
    },
    reviews: {
      total: reviewsTotal.count || 0,
    },
  });
});

// ---------------------------------------------------------------------------
// GET /api/admin/chart?metric=signups|listings|revenue&range=30
//   Daily time-series buckets for the last N days.
// ---------------------------------------------------------------------------
router.get('/chart', async (req, res) => {
  const metric = req.query.metric || 'signups';
  const range = Math.min(Math.max(Number(req.query.range) || 30, 7), 90);
  const since = new Date(Date.now() - range * 24 * 3600 * 1000);

  let rows = [];
  if (metric === 'signups') {
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('created_at')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: true });
    rows = data || [];
  } else if (metric === 'listings') {
    const { data } = await supabaseAdmin
      .from('properties')
      .select('created_at')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: true });
    rows = data || [];
  } else if (metric === 'revenue') {
    const { data } = await supabaseAdmin
      .from('subscriptions')
      .select('created_at, plans(price)')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: true });
    rows = (data || []).map((r) => ({
      created_at: r.created_at,
      amount: Number(r?.plans?.price || 0),
    }));
  } else {
    return res.status(400).json({ error: 'Unknown metric' });
  }

  // Bucket by day (UTC).
  const buckets = new Map();
  for (let i = 0; i < range; i++) {
    const d = new Date(since.getTime() + i * 24 * 3600 * 1000);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, 0);
  }
  for (const r of rows) {
    const key = String(r.created_at).slice(0, 10);
    if (!buckets.has(key)) continue;
    buckets.set(key, (buckets.get(key) || 0) + (r.amount ?? 1));
  }
  const series = [...buckets.entries()].map(([date, value]) => ({ date, value }));
  res.json({ metric, range, series });
});

// ---------------------------------------------------------------------------
// GET /api/admin/users  — paginated user list with role + listing/sub counts
// ---------------------------------------------------------------------------
router.get('/users', async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(req.query.pageSize) || 20, 1), 100);
  const roleFilter = req.query.role || null;
  const q = (req.query.q || '').trim();

  let query = supabaseAdmin
    .from('profiles')
    .select('id, name, email, role, first_chat_used, created_at', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (roleFilter) query = query.eq('role', roleFilter);
  if (q) query = query.or(`email.ilike.%${q}%,name.ilike.%${q}%`);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await query.range(from, to);
  if (error && isMissingSchemaError(error)) {
    return res.json({ users: [], total: 0, page, pageSize, notice: error.message });
  }
  if (error) return res.status(500).json({ error: error.message });

  res.json({
    users: data || [],
    total: count || 0,
    page,
    pageSize,
  });
});

// PATCH /api/admin/users/:id — change role. Blocks self-demotion to avoid
// locking everyone out (we want at least N admins as per policy).
const roleSchema = z.object({ role: z.enum(['renter', 'owner', 'admin']) });
router.patch('/users/:id', async (req, res) => {
  const parsed = roleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid role' });

  const targetId = req.params.id;
  if (targetId === req.user.id && parsed.data.role !== 'admin') {
    return res.status(400).json({ error: "You can't demote yourself — ask another admin." });
  }

  const { data: before } = await supabaseAdmin
    .from('profiles').select('id, email, role').eq('id', targetId).single();
  if (!before) return res.status(404).json({ error: 'User not found' });

  const { data: after, error } = await supabaseAdmin
    .from('profiles')
    .update({ role: parsed.data.role })
    .eq('id', targetId)
    .select('id, email, role')
    .single();
  if (error) return res.status(400).json({ error: error.message });

  await logAdmin(req, 'user.role_change', 'user', targetId, {
    summary: `Changed role of ${before.email} from ${before.role} to ${after.role}`,
    before, after,
  });

  res.json({ user: after });
});

// ---------------------------------------------------------------------------
// Properties (listings)
// ---------------------------------------------------------------------------
router.get('/properties', async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(req.query.pageSize) || 20, 1), 100);
  const q = (req.query.q || '').trim();
  const status = req.query.status || 'all'; // all | live | paused | deleted

  let query = supabaseAdmin
    .from('properties')
    .select('id, owner_id, title, city, locality, rent, is_active, deleted_at, listing_number, created_at, profiles!properties_owner_id_fkey(name, email)', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (status === 'live') query = query.eq('is_active', true).is('deleted_at', null);
  else if (status === 'paused') query = query.eq('is_active', false).is('deleted_at', null);
  else if (status === 'deleted') query = query.not('deleted_at', 'is', null);

  if (q) query = query.or(`title.ilike.%${q}%,city.ilike.%${q}%,locality.ilike.%${q}%`);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await query.range(from, to);
  if (error && isMissingSchemaError(error)) {
    return res.json({ properties: [], total: 0, page, pageSize, notice: error.message });
  }
  if (error) return res.status(500).json({ error: error.message });

  res.json({ properties: data || [], total: count || 0, page, pageSize });
});

// DELETE /api/admin/properties/:id — hard delete by admin. Audit-logged.
router.delete('/properties/:id', async (req, res) => {
  const { data: before } = await supabaseAdmin
    .from('properties')
    .select('id, owner_id, title, listing_number')
    .eq('id', req.params.id)
    .single();
  if (!before) return res.status(404).json({ error: 'Not found' });

  const { error } = await supabaseAdmin
    .from('properties')
    .delete()
    .eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });

  await logAdmin(req, 'listing.delete', 'property', req.params.id, {
    summary: `Deleted listing "${before.title}" (#${before.listing_number ?? '?'})`,
    before,
  });

  res.json({ ok: true });
});

// PATCH /api/admin/properties/:id — admin toggles is_active (pause/unpause).
const togglePropertySchema = z.object({ is_active: z.boolean() });
router.patch('/properties/:id', async (req, res) => {
  const parsed = togglePropertySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });

  const { data: before } = await supabaseAdmin
    .from('properties')
    .select('id, title, is_active')
    .eq('id', req.params.id).single();
  if (!before) return res.status(404).json({ error: 'Not found' });

  const { data: after, error } = await supabaseAdmin
    .from('properties')
    .update({ is_active: parsed.data.is_active })
    .eq('id', req.params.id)
    .select('id, title, is_active')
    .single();
  if (error) return res.status(400).json({ error: error.message });

  await logAdmin(req, parsed.data.is_active ? 'listing.resume' : 'listing.pause', 'property', req.params.id, {
    summary: `${parsed.data.is_active ? 'Resumed' : 'Paused'} "${before.title}"`,
    before, after,
  });

  res.json({ property: after });
});

// ---------------------------------------------------------------------------
// Reports (renter complaints about listings)
// ---------------------------------------------------------------------------
router.get('/reports', async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(req.query.pageSize) || 20, 1), 100);
  const status = req.query.status || 'all';

  let query = supabaseAdmin
    .from('reports')
    .select('*, properties(id, title, listing_number, city, locality), profiles!reports_reporter_id_fkey(name, email)', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (status !== 'all') query = query.eq('status', status);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await query.range(from, to);
  if (error && isMissingSchemaError(error)) {
    return res.json({ reports: [], total: 0, page, pageSize, notice: error.message });
  }
  if (error) return res.status(500).json({ error: error.message });

  res.json({ reports: data || [], total: count || 0, page, pageSize });
});

const reportStatusSchema = z.object({
  status: z.enum(['open', 'reviewed', 'resolved', 'dismissed']),
});
router.patch('/reports/:id', async (req, res) => {
  const parsed = reportStatusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid status' });

  const { data: before } = await supabaseAdmin
    .from('reports').select('id, status, reason, property_id').eq('id', req.params.id).single();
  if (!before) return res.status(404).json({ error: 'Not found' });

  const { data: after, error } = await supabaseAdmin
    .from('reports')
    .update({ status: parsed.data.status })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });

  await logAdmin(req, 'report.update', 'report', req.params.id, {
    summary: `Report (${before.reason}) marked "${parsed.data.status}"`,
    before, after,
  });

  res.json({ report: after });
});

// ---------------------------------------------------------------------------
// Reviews (renter ratings of owners)
// ---------------------------------------------------------------------------
router.get('/reviews', async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(req.query.pageSize) || 20, 1), 100);

  const { data, error, count } = await supabaseAdmin
    .from('owner_reviews')
    .select('*, reviewer:profiles!owner_reviews_reviewer_id_fkey(name, email), owner:profiles!owner_reviews_owner_id_fkey(name, email)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (error && (isMissingSchemaError(error) || mentions(error, 'owner_reviews'))) {
    return res.json({
      reviews: [],
      total: 0,
      page,
      pageSize,
      notice: 'Reviews are not set up yet. Apply schema_patches/07_owner_reviews.sql.',
    });
  }
  if (error) return res.status(500).json({ error: error.message });

  res.json({ reviews: data || [], total: count || 0, page, pageSize });
});

router.delete('/reviews/:id', async (req, res) => {
  const { data: before, error: selErr } = await supabaseAdmin
    .from('owner_reviews').select('*').eq('id', req.params.id).single();
  if (selErr && (isMissingSchemaError(selErr) || mentions(selErr, 'owner_reviews'))) {
    return res.status(503).json({
      error: 'Reviews are not set up yet.',
      notice: 'Apply schema_patches/07_owner_reviews.sql in Supabase.',
    });
  }
  if (!before) return res.status(404).json({ error: 'Not found' });

  const { error } = await supabaseAdmin
    .from('owner_reviews').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });

  await logAdmin(req, 'review.delete', 'review', req.params.id, {
    summary: `Deleted review (${before.rating}★) for owner ${before.owner_id}`,
    before,
  });

  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Plans (pricing)
// ---------------------------------------------------------------------------
router.get('/plans', async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from('plans')
    .select('*')
    .order('price', { ascending: true });
  if (error && isMissingSchemaError(error)) {
    return res.json({ plans: [], notice: error.message });
  }
  if (error) return res.status(500).json({ error: error.message });
  res.json({ plans: data || [] });
});

const planSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  price: z.coerce.number().int().nonnegative().optional(), // paise
  contacts_limit: z.coerce.number().int().nonnegative().nullable().optional(),
  duration_days: z.coerce.number().int().positive().optional(),
  is_active: z.boolean().optional(),
});
router.patch('/plans/:id', async (req, res) => {
  const parsed = planSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { data: before } = await supabaseAdmin
    .from('plans').select('*').eq('id', req.params.id).single();
  if (!before) return res.status(404).json({ error: 'Not found' });

  const { data: after, error } = await supabaseAdmin
    .from('plans')
    .update(parsed.data)
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });

  await logAdmin(req, 'plan.edit', 'plan', req.params.id, {
    summary: `Edited plan "${before.name}"`,
    before, after,
  });

  res.json({ plan: after });
});

// ---------------------------------------------------------------------------
// Offers (banners & popups shown to renters/owners/guests)
// ---------------------------------------------------------------------------
router.get('/offers', async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(req.query.pageSize) || 15, 1), 100);

  const { data, error, count } = await supabaseAdmin
    .from('offers')
    .select('*', { count: 'exact' })
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (error && isMissingSchemaError(error)) {
    return res.json({
      offers: [],
      total: 0,
      page,
      pageSize,
      notice: 'Apply schema_patches/10_offers.sql in the Supabase SQL editor.',
    });
  }
  if (error) return res.status(500).json({ error: error.message });
  res.json({ offers: data || [], total: count || 0, page, pageSize });
});

const offerSchema = z.object({
  kind:           z.enum(['banner', 'popup']),
  title:          z.string().min(2).max(120),
  subtitle:       z.string().max(280).nullish(),
  discount_label: z.string().max(40).nullish(),
  cta_label:      z.string().max(40).nullish(),
  cta_href:       z.string().max(200).nullish(),
  variant:        z.enum(['gradient', 'emerald', 'amber', 'indigo', 'rose', 'dark']),
  audience:       z.enum(['all', 'guest', 'renter', 'owner']),
  is_active:      z.boolean(),
  dismissible:    z.boolean(),
  priority:       z.coerce.number().int().nonnegative().max(1000),
  starts_at:      z.string().datetime().nullish(),
  ends_at:        z.string().datetime().nullish(),
});

router.post('/offers', async (req, res) => {
  const parsed = offerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const payload = { ...parsed.data, created_by: req.user.id };
  const { data, error } = await supabaseAdmin
    .from('offers').insert(payload).select().single();
  if (error) return res.status(400).json({ error: error.message });

  await logAdmin(req, 'offer.create', 'offer', data.id, {
    summary: `Created ${data.kind}: "${data.title}"`,
    after: data,
  });
  res.json({ offer: data });
});

router.patch('/offers/:id', async (req, res) => {
  const parsed = offerSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { data: before } = await supabaseAdmin
    .from('offers').select('*').eq('id', req.params.id).single();
  if (!before) return res.status(404).json({ error: 'Not found' });

  const { data: after, error } = await supabaseAdmin
    .from('offers').update(parsed.data).eq('id', req.params.id).select().single();
  if (error) return res.status(400).json({ error: error.message });

  await logAdmin(req, 'offer.update', 'offer', req.params.id, {
    summary: `Edited ${after.kind}: "${after.title}"`,
    before, after,
  });
  res.json({ offer: after });
});

router.delete('/offers/:id', async (req, res) => {
  const { data: before } = await supabaseAdmin
    .from('offers').select('*').eq('id', req.params.id).single();
  if (!before) return res.status(404).json({ error: 'Not found' });

  const { error } = await supabaseAdmin
    .from('offers').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });

  await logAdmin(req, 'offer.delete', 'offer', req.params.id, {
    summary: `Deleted ${before.kind}: "${before.title}"`,
    before,
  });
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Audit log viewer
// ---------------------------------------------------------------------------
router.get('/audit', async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(req.query.pageSize) || 25, 1), 200);
  const entity = req.query.entity || null;

  // Try the view first (has admin name/email joined).
  let query = supabaseAdmin
    .from('admin_audit_log_view')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });
  if (entity) query = query.eq('entity_type', entity);
  let { data, error, count } = await query.range((page - 1) * pageSize, page * pageSize - 1);

  // If the view is missing, fall back to the raw table.
  if (error && /admin_audit_log_view|schema cache/i.test(error.message || '')) {
    let q2 = supabaseAdmin
      .from('admin_audit_log')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });
    if (entity) q2 = q2.eq('entity_type', entity);
    const fallback = await q2.range((page - 1) * pageSize, page * pageSize - 1);
    data = fallback.data;
    count = fallback.count;
    error = fallback.error;
  }

  // If the table itself is missing (patch 09 not applied), return an empty
  // page instead of a 500 so the rest of the admin panel still works.
  if (error && /admin_audit_log|schema cache|does not exist/i.test(error.message || '')) {
    return res.json({
      entries: [],
      total: 0,
      page,
      pageSize,
      notice: 'Audit log is not set up yet. Apply schema_patches/09_admin_audit.sql to enable it.',
    });
  }

  if (error) return res.status(500).json({ error: error.message });

  res.json({ entries: data || [], total: count || 0, page, pageSize });
});

export default router;
