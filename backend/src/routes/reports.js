import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const reportSchema = z.object({
  property_id: z.string().uuid(),
  reason: z.enum([
    'fake_listing', 'wrong_info', 'already_rented',
    'spam', 'abusive', 'scam', 'other',
  ]),
  description: z.string().max(1000).optional(),
});

// POST /api/reports  — create a report for a property
router.post('/', requireAuth, async (req, res) => {
  const parsed = reportSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { data, error } = await req.sb
    .from('reports')
    .insert({ ...parsed.data, reporter_id: req.user.id })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ report: data });
});

// GET /api/reports/mine
router.get('/mine', requireAuth, async (req, res) => {
  const { data, error } = await req.sb
    .from('reports')
    .select('*, properties(id, title, listing_number, city, locality)')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ reports: data });
});

export default router;
