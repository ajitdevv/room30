import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';

const router = Router();

// GET /api/plans
router.get('/', async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from('plans')
    .select('*')
    .eq('is_active', true)
    .order('price', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ plans: data });
});

export default router;
