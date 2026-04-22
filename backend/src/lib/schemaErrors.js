// Small helpers that let routes degrade gracefully when a schema patch
// hasn't been applied yet. Keeps the admin panel usable during rollout.
//
// Supabase/PostgREST typically returns errors like:
//   - "Could not find the table 'public.owner_reviews' in the schema cache"
//   - "relation \"public.offers\" does not exist"
//   - "Could not find the function public.owner_rating_summary ..."
//   - "column properties.view_count does not exist"

export function isMissingSchemaError(err) {
  if (!err) return false;
  const msg = (err.message || err.hint || err.details || '').toString();
  if (!msg) return false;
  return /schema cache|does not exist|could not find (the )?(table|function|column|view)/i
    .test(msg);
}

// Returns true if the error message mentions a specific token (e.g. table name).
// Use when a route touches multiple tables and only one of them is missing.
export function mentions(err, token) {
  if (!err) return false;
  const msg = (err.message || err.hint || err.details || '').toString();
  return new RegExp(token, 'i').test(msg);
}
