import { supabaseAdmin } from '../lib/supabase.js';

// Writes one row to admin_audit_log. Fails silently — logging must never
// block the main action. Uses the service role key so RLS doesn't get in
// the way on the write side (reads are still admin-only).
//
// Usage:
//   await logAdmin(req, 'listing.delete', 'property', prop.id, {
//     summary: `Deleted listing "${prop.title}"`,
//     before: prop,
//   });
export async function logAdmin(req, action, entityType, entityId, opts = {}) {
  try {
    await supabaseAdmin.from('admin_audit_log').insert({
      admin_id: req.user?.id || null,
      action,
      entity_type: entityType,
      entity_id: entityId ? String(entityId) : null,
      summary: opts.summary || null,
      before_data: opts.before ?? null,
      after_data:  opts.after  ?? null,
      metadata:    opts.metadata ?? null,
    });
  } catch (e) {
    // Audit log missing the table means patch 09 isn't applied; just log.
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[audit] insert failed:', e?.message || e);
    }
  }
}
