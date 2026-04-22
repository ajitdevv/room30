import { Router } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { razorpay } from '../lib/razorpay.js';
import { supabaseAdmin } from '../lib/supabase.js';

const router = Router();

// POST /api/payments/order  — create Razorpay order for a plan
router.post('/order', requireAuth, async (req, res) => {
  const body = z.object({ plan_id: z.string().uuid() }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.flatten() });

  const { data: plan, error } = await supabaseAdmin
    .from('plans').select('*').eq('id', body.data.plan_id).single();
  if (error || !plan) return res.status(404).json({ error: 'Plan not found' });

  const order = await razorpay.orders.create({
    amount: plan.price,              // paise
    currency: 'INR',
    receipt: `plan_${plan.id.slice(0, 8)}_${Date.now()}`,
    notes: { user_id: req.user.id, plan_id: plan.id },
  });

  res.json({
    order,
    key_id: process.env.RAZORPAY_KEY_ID,
    plan: { id: plan.id, name: plan.name, price: plan.price },
  });
});

// POST /api/payments/verify  — verify signature, activate subscription
router.post('/verify', requireAuth, async (req, res) => {
  const schema = z.object({
    razorpay_order_id:   z.string(),
    razorpay_payment_id: z.string(),
    razorpay_signature:  z.string(),
    plan_id:             z.string().uuid(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan_id } = parsed.data;

  // Verify HMAC signature — proves payment wasn't faked.
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expected !== razorpay_signature) {
    return res.status(400).json({ error: 'Invalid payment signature' });
  }

  const { data: plan } = await supabaseAdmin
    .from('plans').select('*').eq('id', plan_id).single();
  if (!plan) return res.status(404).json({ error: 'Plan not found' });

  const expires = new Date(Date.now() + plan.duration_days * 864e5).toISOString();

  const { data: sub, error } = await supabaseAdmin
    .from('subscriptions')
    .insert({
      user_id: req.user.id,
      plan_id: plan.id,
      contacts_remaining: plan.contacts_limit,
      expires_at: expires,
      razorpay_payment_id,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ subscription: sub });
});

export default router;
