import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { canChat, markFirstChatUsed } from '../services/planCheck.js';

const router = Router();

const sendSchema = z.object({
  receiver_id: z.string().uuid(),
  property_id: z.string().uuid().optional(),
  message: z.string().min(1).max(2000),
});

// GET /api/chat/threads  — one row per conversation, with other-user name.
router.get('/threads', requireAuth, async (req, res) => {
  const { data, error } = await req.sb
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) return res.status(500).json({ error: error.message });

  // Collapse to unique (otherUserId) threads, keep latest msg.
  const threads = new Map();
  for (const m of data) {
    const other = m.sender_id === req.user.id ? m.receiver_id : m.sender_id;
    if (!threads.has(other)) threads.set(other, { ...m, other_user_id: other });
  }
  const list = [...threads.values()];

  // Hydrate profile names + (if present) property info.
  const otherIds = list.map((t) => t.other_user_id);
  const propIds = [...new Set(list.map((t) => t.property_id).filter(Boolean))];

  const [{ data: profiles }, { data: props }] = await Promise.all([
    supabaseAdmin.from('profiles').select('id, name, email').in('id', otherIds.length ? otherIds : ['00000000-0000-0000-0000-000000000000']),
    propIds.length
      ? supabaseAdmin.from('properties').select('id, title, listing_number').in('id', propIds)
      : Promise.resolve({ data: [] }),
  ]);

  const pMap = new Map((profiles || []).map((p) => [p.id, p]));
  const rMap = new Map((props || []).map((p) => [p.id, p]));

  for (const t of list) {
    const p = pMap.get(t.other_user_id);
    t.other_name  = p?.name?.trim() || p?.email?.split('@')[0] || 'User';
    t.property    = t.property_id ? (rMap.get(t.property_id) || null) : null;
  }

  res.json({ threads: list });
});

// GET /api/chat/:otherUserId  — messages + other-user profile + properties seen in thread
router.get('/:otherUserId', requireAuth, async (req, res) => {
  const other = req.params.otherUserId;
  const me = req.user.id;

  const { data: messages, error } = await req.sb
    .from('messages')
    .select('*')
    .or(
      `and(sender_id.eq.${me},receiver_id.eq.${other}),` +
      `and(sender_id.eq.${other},receiver_id.eq.${me})`
    )
    .order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });

  const propIds = [...new Set((messages || []).map((m) => m.property_id).filter(Boolean))];

  const [{ data: otherProfile }, { data: props }] = await Promise.all([
    supabaseAdmin.from('profiles').select('id, name, email, role').eq('id', other).maybeSingle(),
    propIds.length
      ? supabaseAdmin.from('properties').select('id, title, listing_number, city, locality, rent').in('id', propIds)
      : Promise.resolve({ data: [] }),
  ]);

  const display = otherProfile?.name?.trim() || otherProfile?.email?.split('@')[0] || 'User';

  res.json({
    messages,
    other: { id: other, name: display, role: otherProfile?.role || null },
    properties: props || [],
  });
});

// POST /api/chat  — enforce plan rules then send message
router.post('/', requireAuth, async (req, res) => {
  const parsed = sendSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const check = await canChat(req.user.id, parsed.data.receiver_id);
  if (!check.ok) return res.status(402).json({ error: check.reason, paywall: true });

  const { data, error } = await req.sb
    .from('messages')
    .insert({ sender_id: req.user.id, ...parsed.data })
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });

  if (check.consumedFirstFree) await markFirstChatUsed(req.user.id);

  res.status(201).json({ message: data });
});

export default router;
