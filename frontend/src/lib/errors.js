'use client';

// Central mapping from raw backend/SDK errors to short, user-friendly strings.
// Keep messages calm, specific, and actionable — never expose stack traces,
// SQL state, JWT internals, or raw Supabase codes to end users.

export function friendlyError(e, opts = {}) {
  const { fallback = 'Something went wrong. Please try again.', context } = opts;
  if (!e) return fallback;

  if (typeof e === 'string') return mapRaw(e, context) || fallback;

  const status = e.status;
  const raw = String(e.message || '').trim();
  const rawLower = raw.toLowerCase();
  const bodyErr = e.body?.error;

  // Network / fetch failure (no HTTP status)
  if (!status && (e.name === 'TypeError' || /failed to fetch|networkerror|load failed/i.test(raw))) {
    return "We couldn't reach the server. Please check your connection and try again.";
  }

  // Zod-style validation object coming back from the API
  if (bodyErr && typeof bodyErr === 'object') {
    return 'Please check the form for missing or invalid fields.';
  }

  // HTTP status mapping
  if (status === 400) {
    const mapped = mapRaw(rawLower, context);
    if (mapped) return mapped;
    return 'Please check the details you entered and try again.';
  }
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 402) return 'This action requires an active plan. Please upgrade to continue.';
  if (status === 403) return "You don't have permission to do that.";
  if (status === 404) return notFoundFor(context);
  if (status === 409) return 'That already exists or conflicts with something else.';
  if (status === 413) return 'That file is too large. Please upload something smaller.';
  if (status === 429) return 'Too many attempts. Please wait a minute and try again.';
  if (status === 503) return 'This service is temporarily unavailable. Please try again shortly.';
  if (status >= 500) return 'Our servers hit a snag. Please try again in a moment.';

  // No status — try to pattern-match the raw message
  const mapped = mapRaw(rawLower, context);
  if (mapped) return mapped;

  return fallback;
}

function notFoundFor(context) {
  switch (context) {
    case 'listing':  return "We couldn't find that listing.";
    case 'property': return "We couldn't find that property.";
    case 'user':     return "We couldn't find that user.";
    case 'chat':     return "We couldn't find that conversation.";
    case 'plan':     return "We couldn't find that plan.";
    default:         return "We couldn't find what you were looking for.";
  }
}

function mapRaw(raw, _context) {
  if (!raw) return null;
  if (/nan|invalid input syntax/.test(raw))                 return "One of the values you entered isn't valid. Please check and try again.";
  if (/duplicate key|already exists|unique constraint/.test(raw)) return 'That already exists.';
  if (/foreign key|violates.*constraint/.test(raw))         return "That couldn't be completed because of a related record.";
  if (/timeout|timed out/.test(raw))                        return 'That took too long. Please try again.';
  if (/rate limit|too many requests|too many/.test(raw))    return 'Too many attempts. Please wait a minute and try again.';
  if (/invalid token|jwt|missing token|unauthorized/.test(raw)) return 'Your session has expired. Please sign in again.';
  if (/not found/.test(raw))                                return "We couldn't find what you were looking for.";
  if (/permission|forbidden|not allowed/.test(raw))         return "You don't have permission to do that.";
  if (/payload too large|file too large/.test(raw))         return 'That file is too large. Please upload something smaller.';
  if (/failed to fetch|network/.test(raw))                  return "We couldn't reach the server. Please check your connection and try again.";
  return null;
}

export function friendlyAuthError(e, mode = 'signin') {
  const raw  = (e?.message || '').toLowerCase();
  const code = (e?.code || e?.error_code || '').toLowerCase();

  if (code === 'invalid_credentials' || raw.includes('invalid login credentials')) {
    // Return a special marker so the component can handle async email checking
    return mode === 'signin' ? '__CHECK_EMAIL__' : "Those details don't look right. Please try again.";
  }
  if (raw.includes('email not confirmed'))
    return 'Please confirm your email address before signing in. Check your inbox for the confirmation link.';
  if (raw.includes('user already registered') || code === 'user_already_exists')
    return 'An account with this email already exists. Try signing in instead.';
  if (raw.includes('password should be at least'))
    return 'Your password is too short. Please use at least 6 characters.';
  if (raw.includes('unable to validate email') || raw.includes('invalid email'))
    return "That email address doesn't look valid. Please double-check it.";
  if (raw.includes('rate limit') || raw.includes('too many requests'))
    return 'Too many attempts. Please wait a minute and try again.';
  if (raw.includes('network') || raw.includes('failed to fetch'))
    return 'Network issue. Please check your connection and try again.';

  return 'Something went wrong. Please try again in a moment.';
}
