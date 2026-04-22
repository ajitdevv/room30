import { supabaseAdmin } from '../lib/supabase.js';

// Returns { ok, reason?, consumedFirstFree? }
// Rules:
//   - If user already unlocked this owner: allow (no cost).
//   - Else if user hasn't used their free first chat: allow, mark consumed.
//   - Else require active plan with contacts_remaining > 0 (or unlimited).
//     On success, unlock the owner and decrement contacts.
export async function canChat(userId, ownerId) {
  if (userId === ownerId) return { ok: false, reason: 'Cannot chat with yourself' };

  // 1. Already unlocked?
  const { data: unlocked } = await supabaseAdmin
    .from('unlocked_contacts')
    .select('id')
    .eq('user_id', userId)
    .eq('owner_id', ownerId)
    .maybeSingle();
  if (unlocked) return { ok: true };

  // 2. First free chat?
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('first_chat_used')
    .eq('id', userId)
    .single();

  if (profile && !profile.first_chat_used) {
    await supabaseAdmin
      .from('unlocked_contacts')
      .insert({ user_id: userId, owner_id: ownerId });
    return { ok: true, consumedFirstFree: true };
  }

  // 3. Active plan?
  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .gt('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!sub) return { ok: false, reason: 'No active plan — please subscribe' };

  const unlimited = sub.contacts_remaining === null;
  if (!unlimited && sub.contacts_remaining <= 0) {
    return { ok: false, reason: 'Contact quota exhausted' };
  }

  // Consume one contact and unlock.
  await supabaseAdmin
    .from('unlocked_contacts')
    .insert({ user_id: userId, owner_id: ownerId });

  if (!unlimited) {
    await supabaseAdmin
      .from('subscriptions')
      .update({ contacts_remaining: sub.contacts_remaining - 1 })
      .eq('id', sub.id);
  }
  return { ok: true };
}

export async function markFirstChatUsed(userId) {
  await supabaseAdmin
    .from('profiles')
    .update({ first_chat_used: true })
    .eq('id', userId);
}
