import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import propertiesRouter from './routes/properties.js';
import searchRouter from './routes/search.js';
import chatRouter from './routes/chat.js';
import plansRouter from './routes/plans.js';
import paymentsRouter from './routes/payments.js';
import meRouter from './routes/me.js';
import reportsRouter from './routes/reports.js';
import reviewsRouter from './routes/reviews.js';
import offersRouter from './routes/offers.js';
import adminRouter from './routes/admin.js';

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

const allowedOrigins = new Set([
  process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3004',
  'http://127.0.0.1:3004',
  'https://room30.vercel.app/',
]);
const isDev = process.env.NODE_ENV !== 'production';
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.has(origin)) return cb(null, true);
    // In dev, allow any localhost / 127.0.0.1 origin regardless of port.
    if (isDev && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(rateLimit({ windowMs: 60_000, max: 120 }));

app.get('/health', (_req, res) => res.json({ ok: true, service: 'room30-backend' }));

app.use('/api/properties', propertiesRouter);
app.use('/api/search', searchRouter);
app.use('/api/chat', chatRouter);
app.use('/api/plans', plansRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/me', meRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/offers', offersRouter);
app.use('/api/admin', adminRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`[room30-backend] listening on :${port}`));
