import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { isMissingSchemaError, mentions } from '../lib/schemaErrors.js';

const router = Router();

const EMPTY_SUMMARY = { avg_rating: 0, review_count: 0 };
const PATCH_NOTICE  = 'Apply schema_patches/07_owner_reviews.sql to enable reviews.';

const reviewSchema = z.object({
  owner_id: z.string().uuid(),
  property_id: z.string().uuid().optional().nullable(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional().nullable(),
});

// GET /api/reviews?owner_id=...  — public list of reviews for an owner
// Also returns the rollup (avg, count) so the frontend can render the
// summary card without a second round-trip.
router.get('/', async (req, res) => {
  const { owner_id } = req.query;
  if (!owner_id || !/^[0-9a-f-]{36}$/i.test(String(owner_id))) {
    return res.status(400).json({ error: 'owner_id (uuid) is required' });
  }

  const [{ data: reviews, error: rErr }, { data: summary, error: sErr }] = await Promise.all([
    supabaseAdmin
      .from('owner_reviews')
      .select('id, reviewer_id, property_id, rating, comment, created_at, updated_at, profiles:reviewer_id(name)')
      .eq('owner_id', owner_id)
      .order('created_at', { ascending: false })
      .limit(50),
    supabaseAdmin.rpc('owner_rating_summary', { oid: owner_id }),
  ]);

  // If patch 07 isn't applied, don't crash — just return empty reviews.
  const reviewsMissing = rErr && (isMissingSchemaError(rErr) || mentions(rErr, 'owner_reviews'));
  const summaryMissing = sErr && (isMissingSchemaError(sErr) || mentions(sErr, 'owner_rating_summary'));
  if (reviewsMissing || summaryMissing) {
    return res.json({ reviews: [], summary: EMPTY_SUMMARY, notice: PATCH_NOTICE });
  }
  if (rErr) return res.status(500).json({ error: rErr.message });
  if (sErr) return res.status(500).json({ error: sErr.message });

  const roll = Array.isArray(summary) ? summary[0] : summary;
  res.json({
    reviews: reviews || [],
    summary: {
      avg_rating: Number(roll?.avg_rating || 0),
      review_count: Number(roll?.review_count || 0),
    },
  });
});

// GET /api/reviews/mine?owner_id=...  — caller's own review for that owner
router.get('/mine', requireAuth, async (req, res) => {
  const { owner_id } = req.query;
  if (!owner_id) return res.status(400).json({ error: 'owner_id required' });

  const { data, error } = await req.sb
    .from('owner_reviews')
    .select('*')
    .eq('owner_id', owner_id)
    .eq('reviewer_id', req.user.id)
    .maybeSingle();
  if (error && (isMissingSchemaError(error) || mentions(error, 'owner_reviews'))) {
    return res.json({ review: null, notice: PATCH_NOTICE });
  }
  if (error) return res.status(500).json({ error: error.message });
  res.json({ review: data });
});

// POST /api/reviews  — upsert (one review per reviewer-owner pair).
// Enforced by the unique constraint + RLS policies in the schema patch.
router.post('/', requireAuth, async (req, res) => {
  const parsed = reviewSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  if (parsed.data.owner_id === req.user.id) {
    return res.status(400).json({ error: "You can't review yourself" });
  }

  const payload = {
    ...parsed.data,
    reviewer_id: req.user.id,
    comment: parsed.data.comment || null,
  };

  const { data, error } = await req.sb
    .from('owner_reviews')
    .upsert(payload, { onConflict: 'owner_id,reviewer_id' })
    .select()
    .single();
  if (error && (isMissingSchemaError(error) || mentions(error, 'owner_reviews'))) {
    return res.status(503).json({ error: PATCH_NOTICE });
  }
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ review: data });
});

// DELETE /api/reviews/:id  — reviewer removes their own review
router.delete('/:id', requireAuth, async (req, res) => {
  const { error } = await req.sb
    .from('owner_reviews')
    .delete()
    .eq('id', req.params.id);
  if (error && (isMissingSchemaError(error) || mentions(error, 'owner_reviews'))) {
    return res.status(503).json({ error: PATCH_NOTICE });
  }
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

export default router;
