import express from 'express';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { db, all } from './db.js';
import { errorHandler } from './lib/http.js';
import { upload, MEDIA_DIR } from './lib/upload.js';
import { requireAuth, optionalAuth } from './middleware/auth.js';
import { seedIfEmpty } from './seed.js';

import authRoutes from './routes/auth.js';
import categoryRoutes from './routes/categories.js';
import productRoutes from './routes/products.js';
import sellerRoutes from './routes/sellers.js';
import deliveryRoutes from './routes/delivery.js';
import bookingRoutes from './routes/bookings.js';
import packageRoutes from './routes/packages.js';
import reviewRoutes from './routes/reviews.js';
import notificationRoutes from './routes/notifications.js';
import adminRoutes from './routes/admin.js';
import analyticsRoutes from './routes/analytics.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');

// ---------------------------------------------------------------- schema init
db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
seedIfEmpty();

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());
app.use(optionalAuth);
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', { skip: (req) => req.path.startsWith('/media') }));

// ------------------------------------------------------------------- uploads
app.post(
  '/api/upload',
  requireAuth,
  (req, res, next) =>
    upload.array('images', 8)(req, res, (err) => {
      if (err) return next(err);
      const files = (req.files || []).map((f) => `/media/uploads/${path.basename(f.path)}`);
      res.json({ files });
    })
);

// ------------------------------------------------------------------- static
app.use('/media', express.static(MEDIA_DIR, { maxAge: '7d', index: false }));

// -------------------------------------------------------------------- routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sellers', sellerRoutes);
app.use('/api/delivery-options', deliveryRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString(), categories: all('SELECT COUNT(*) AS c FROM categories')[0].c });
});

app.use('/api', (_req, res) => res.status(404).json({ error: 'not_found' }));

// ------------------------------------------------------------ client serving
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get('*', (_req, res) => res.sendFile(path.join(CLIENT_DIST, 'index.html')));
}

app.use(errorHandler);

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  EventBox UZ API ready → http://0.0.0.0:${PORT}/api/health\n`);
});
