import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';

const router = Router();

// GET /api/search/suggest?q=jai
// Returns distinct city / locality suggestions for autocomplete.
router.get('/suggest', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 1) return res.json({ suggestions: [] });

  const { data, error } = await supabaseAdmin
    .from('properties')
    .select('city, locality')
    .or(`city.ilike.%${q}%,locality.ilike.%${q}%`)
    .eq('is_active', true)
    .limit(30);

  if (error) return res.status(500).json({ error: error.message });

  const seen = new Set();
  const suggestions = [];
  for (const row of data) {
    const tryPush = (label, type) => {
      const key = `${type}:${label.toLowerCase()}`;
      if (!seen.has(key) && label.toLowerCase().includes(q.toLowerCase())) {
        seen.add(key);
        suggestions.push({ label, type });
      }
    };
    tryPush(row.locality, 'locality');
    tryPush(row.city, 'city');
    if (suggestions.length >= 8) break;
  }
  res.json({ suggestions });
});

export default router;
