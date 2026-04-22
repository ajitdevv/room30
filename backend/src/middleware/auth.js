import { supabaseAdmin, supabaseAsUser } from '../lib/supabase.js';

// Verifies the Supabase JWT sent from the frontend.
// On success, attaches { user, sb } to req.
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing token' });

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) return res.status(401).json({ error: 'Invalid token' });

    req.user = data.user;
    req.sb = supabaseAsUser(token);
    next();
  } catch (e) {
    res.status(401).json({ error: 'Auth failed' });
  }
}
