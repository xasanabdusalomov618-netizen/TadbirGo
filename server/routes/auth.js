import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { get, insert, update, run, all } from '../db.js';
import { hashPassword, verifyPassword, signToken, COOKIE_NAME, cookieOptions } from '../lib/auth.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { route, bad, notFound } from '../lib/http.js';
import { unreadCount } from '../lib/notify.js';
import { COMMISSION_RATE } from '../lib/constants.js';

const router = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2, 'name_too_short').max(80),
  email: z.string().trim().toLowerCase().email('invalid_email'),
  phone: z.string().trim().min(7, 'invalid_phone').max(30).optional().or(z.literal('')),
  password: z.string().min(6, 'password_too_short').max(128),
  role: z.enum(['customer', 'seller']).default('customer'),
  city: z.string().trim().max(60).optional().or(z.literal('')),
  business_name: z.string().trim().min(2).max(120).optional().or(z.literal('')),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('invalid_email'),
  password: z.string().min(1, 'password_required'),
});

function slugify(text, extra = '') {
  const base = text
    .toLowerCase()
    .replace(/[‘’'"`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'seller';
  return `${base}${extra}`;
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    avatar_url: user.avatar_url,
    city: user.city,
    language: user.language,
    theme: user.theme,
    created_at: user.created_at,
  };
}

function sellerFor(userId) {
  const s = get('SELECT * FROM seller_profiles WHERE user_id = ?', [userId]);
  if (!s) return null;
  return { ...s, is_approved: !!s.is_approved, is_premium: !!s.is_premium, featured: !!s.featured };
}

function sessionPayload(user) {
  const seller = user.role === 'seller' ? sellerFor(user.id) : null;
  return { user: publicUser(user), seller, unread: unreadCount(user.id) };
}

function issueToken(req, res, user) {
  res.cookie(COOKIE_NAME, signToken(user), cookieOptions(req));
}

/** POST /api/auth/register */
router.post(
  '/register',
  route(async (req, res) => {
    const data = registerSchema.parse(req.body);
    if (get('SELECT id FROM users WHERE email = ?', [data.email])) bad('email_taken');

    const userId = insert('users', {
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      password_hash: hashPassword(data.password),
      role: data.role,
      city: data.city || null,
      language: req.body.language === 'ru' || req.body.language === 'en' ? req.body.language : 'uz',
      theme: req.body.theme === 'dark' ? 'dark' : 'light',
    });

    if (data.role === 'seller') {
      const businessName = data.business_name || `${data.name} studio`;
      let slug = slugify(businessName);
      if (get('SELECT id FROM seller_profiles WHERE slug = ?', [slug])) slug = slugify(businessName, `-${userId}`);
      insert('seller_profiles', {
        user_id: userId,
        business_name: businessName,
        slug,
        city: data.city || 'Toshkent',
        phone: data.phone || null,
        is_approved: 1, // demo-friendly: sellers can start listing right away, admin can revoke
        commission_rate: COMMISSION_RATE,
      });
    }

    const user = get('SELECT * FROM users WHERE id = ?', [userId]);
    issueToken(req, res, user);
    res.status(201).json(sessionPayload(user));
  })
);

/** POST /api/auth/login */
router.post(
  '/login',
  route(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const user = get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user || !verifyPassword(password, user.password_hash)) bad('invalid_credentials');
    if (user.is_blocked) bad('account_blocked');
    issueToken(req, res, user);
    res.json(sessionPayload(user));
  })
);

/** POST /api/auth/logout */
router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.json({ ok: true });
});

/** GET /api/auth/me */
router.get(
  '/me',
  optionalAuth,
  route(async (req, res) => {
    if (!req.user) return res.json({ user: null });
    const user = get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.json({ user: null });
    res.json(sessionPayload(user));
  })
);

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  phone: z.string().trim().max(30).optional(),
  city: z.string().trim().max(60).optional(),
  avatar_url: z.string().trim().max(300).optional(),
  language: z.enum(['uz', 'ru', 'en']).optional(),
  theme: z.enum(['light', 'dark']).optional(),
});

/** PATCH /api/auth/me */
router.patch(
  '/me',
  requireAuth,
  route(async (req, res) => {
    const data = profileSchema.parse(req.body);
    update('users', req.user.id, data);
    const user = get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    res.json(sessionPayload(user));
  })
);

/** POST /api/auth/password */
router.post(
  '/password',
  requireAuth,
  route(async (req, res) => {
    const { current_password, new_password } = z
      .object({ current_password: z.string().min(1), new_password: z.string().min(6).max(128) })
      .parse(req.body);
    const user = get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!verifyPassword(current_password, user.password_hash)) bad('wrong_password');
    run('UPDATE users SET password_hash = ? WHERE id = ?', [hashPassword(new_password), req.user.id]);
    res.json({ ok: true });
  })
);

/** GET /api/auth/demo-accounts — quick login hints for the demo build */
router.get('/demo-accounts', (_req, res) => {
  res.json({
    accounts: [
      { role: 'admin', email: 'admin@eventbox.uz', password: 'admin123', label: 'Administrator' },
      { role: 'seller', email: 'seller@eventbox.uz', password: 'seller123', label: 'Sotuvchi / Seller' },
      { role: 'customer', email: 'customer@eventbox.uz', password: 'customer123', label: 'Mijoz / Customer' },
    ],
  });
});

export default router;
