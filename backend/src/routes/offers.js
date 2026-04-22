import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';

const router = Router();

// GET /api/offers/active?audience=guest|renter|owner
// Public. Returns currently-active banner + popup for a given audience.
// Falls back silently to an empty list when the offers table doesn't exist.
router.get('/active', async (req, res) => {
  const audience = ['guest', 'renter', 'owner'].includes(req.query.audience)
    ? req.query.audience
    : 'all';

  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('offers')
    .select('id, kind, title, subtitle, discount_label, cta_label, cta_href, variant, audience, dismissible, priority, ends_at')
    .eq('is_active', true)
    .in('audience', ['all', audience])
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false });

  // Table missing → treat as "no offers" rather than erroring.
  if (error) {
    const msg = error.message || '';
    if (/offers|schema cache|does not exist/i.test(msg)) {
      return res.json({ banner: null, popup: null });
    }
    return res.status(500).json({ error: msg });
  }

  const banner = (data || []).find((o) => o.kind === 'banner') || null;
  const popup  = (data || []).find((o) => o.kind === 'popup')  || null;
  res.json({ banner, popup });
});

export default router;
