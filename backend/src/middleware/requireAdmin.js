import { supabaseAdmin } from '../lib/supabase.js';

// Verifies the caller is authenticated AND has role='admin' on profiles.
// Attaches { user, profile } to req on success.
export async function requireAdmin(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing token' });

    const { data: auth, error: aErr } = await supabaseAdmin.auth.getUser(token);
    if (aErr || !auth?.user) return res.status(401).json({ error: 'Invalid token' });

    const { data: profile, error: pErr } = await supabaseAdmin
      .from('profiles')
      .select('id, name, email, role')
      .eq('id', auth.user.id)
      .single();
    if (pErr || !profile) return res.status(401).json({ error: 'Profile not found' });
    if (profile.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.user = auth.user;
    req.profile = profile;
    next();
  } catch (_e) {
    res.status(401).json({ error: 'Auth failed' });
  }
}
