import { Router } from 'express';
import { z } from 'zod';
import { all, get, insert, update, run, bools, boolsAll, transaction, now } from '../db.js';
import { optionalAuth, requireAuth, requireSeller } from '../middleware/auth.js';
import { route, notFound, bad } from '../lib/http.js';
import { notify } from '../lib/notify.js';
import { PREMIUM_PRICE } from '../lib/constants.js';

const router = Router();

const SELLER_SELECT = `
  SELECT s.*, u.name AS owner_name, u.email AS email, u.phone AS user_phone, u.avatar_url AS avatar_url,
    (SELECT COUNT(*) FROM products p WHERE p.seller_id = s.id AND p.is_active = 1) AS product_count
  FROM seller_profiles s JOIN users u ON u.id = s.user_id
`;

function serialize(row) {
  if (!row) return null;
  return bools(row, ['is_approved', 'is_premium', 'featured']);
}

/** GET /api/sellers */
router.get('/', (_req, res) => {
  const rows = all(`${SELLER_SELECT} WHERE s.is_approved = 1 ORDER BY s.is_premium DESC, s.rating DESC, s.review_count DESC`);
  res.json({ items: rows.map(serialize) });
});

/** GET /api/sellers/me — the signed-in seller's profile + numbers */
router.get(
  '/me',
  requireAuth,
  requireSeller,
  route(async (req, res) => {
    const sellerId = req.seller?.id || get('SELECT id FROM seller_profiles WHERE user_id = ?', [req.user.id])?.id;
    if (!sellerId) notFound('seller_not_found');
    const row = get(`${SELLER_SELECT} WHERE s.id = ?`, [sellerId]);
    const stats = get(
      `SELECT
        COUNT(*) AS total_orders,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_orders,
        SUM(CASE WHEN status IN ('yangi','pending') THEN 1 ELSE 0 END) AS pending_orders,
        SUM(CASE WHEN status NOT IN ('cancelled') THEN total ELSE 0 END) AS gross_revenue,
        SUM(CASE WHEN status = 'completed' THEN total - commission ELSE 0 END) AS net_earnings,
        SUM(commission) AS total_commission
       FROM bookings WHERE seller_id = ?`,
      [sellerId]
    );
    const monthly = all(
      `SELECT strftime('%Y-%m', created_at) AS month, SUM(total - commission) AS net, COUNT(*) AS orders
       FROM bookings WHERE seller_id = ? AND status != 'cancelled'
       GROUP BY month ORDER BY month DESC LIMIT 12`,
      [sellerId]
    );
    res.json({ seller: serialize(row), stats, monthly: monthly.reverse() });
  })
);

const profileSchema = z.object({
  business_name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(2000).optional(),
  city: z.string().trim().max(60).optional(),
  district: z.string().trim().max(80).optional(),
  address: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(30).optional(),
  telegram: z.string().trim().max(60).optional(),
  logo_url: z.string().trim().max(500).optional(),
  response_hours: z.coerce.number().int().min(1).max(72).optional(),
});

/** PATCH /api/sellers/me */
router.patch(
  '/me',
  requireAuth,
  requireSeller,
  route(async (req, res) => {
    const data = profileSchema.parse(req.body);
    const sellerId = req.seller?.id || get('SELECT id FROM seller_profiles WHERE user_id = ?', [req.user.id])?.id;
    update('seller_profiles', sellerId, { ...data, updated_at: now() });
    res.json({ seller: serialize(get(`${SELLER_SELECT} WHERE s.id = ?`, [sellerId])) });
  })
);

/** POST /api/sellers/me/premium — subscribe to Premium (monetisation) */
router.post(
  '/me/premium',
  requireAuth,
  requireSeller,
  route(async (req, res) => {
    const sellerId = req.seller?.id || get('SELECT id FROM seller_profiles WHERE user_id = ?', [req.user.id])?.id;
    const seller = get('SELECT * FROM seller_profiles WHERE id = ?', [sellerId]);
    if (seller.is_premium) bad('already_premium');

    transaction(() => {
      insert('payments', {
        seller_id: sellerId,
        user_id: seller.user_id,
        amount: PREMIUM_PRICE,
        type: 'subscription',
        method: 'card',
        status: 'paid',
        reference: 'premium-monthly',
      });
      run(`UPDATE seller_profiles SET is_premium = 1, premium_until = date('now', '+30 days') WHERE id = ?`, [sellerId]);
      insert('subscriptions', {
        seller_id: sellerId,
        plan: 'premium',
        price: PREMIUM_PRICE,
        starts_at: now(),
        ends_at: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
        status: 'active',
      });
    });

    notify(seller.user_id, 'premium', {
      title: { uz: 'Premium faollashtirildi', ru: 'Премиум активирован', en: 'Premium activated' },
      body: {
        uz: 'E’lonlaringiz ustuvor ko‘rsatiladi va komissiya 8% ga tushadi.',
        ru: 'Ваши объявления в приоритете, комиссия снижена до 8%.',
        en: 'Your listings get priority and the commission drops to 8%.',
      },
    }, '/seller/earnings');

    res.json({ ok: true, seller: serialize(get(`${SELLER_SELECT} WHERE s.id = ?`, [sellerId])) });
  })
);

/** POST /api/sellers/me/payout — withdraw available balance */
router.post(
  '/me/payout',
  requireAuth,
  requireSeller,
  route(async (req, res) => {
    const sellerId = req.seller?.id || get('SELECT id FROM seller_profiles WHERE user_id = ?', [req.user.id])?.id;
    const seller = get('SELECT * FROM seller_profiles WHERE id = ?', [sellerId]);
    const amount = Math.min(seller.balance, Math.max(0, Number(req.body?.amount) || seller.balance));
    if (amount <= 0) bad('nothing_to_withdraw');

    transaction(() => {
      run('UPDATE seller_profiles SET balance = balance - ? WHERE id = ?', [amount, sellerId]);
      insert('payments', {
        seller_id: sellerId,
        user_id: seller.user_id,
        amount,
        type: 'payout',
        method: 'card',
        status: 'paid',
        reference: 'payout',
      });
    });
    res.json({ ok: true, amount });
  })
);

/** GET /api/sellers/me/products */
router.get(
  '/me/products',
  requireAuth,
  requireSeller,
  route(async (req, res) => {
    const sellerId = req.seller?.id || get('SELECT id FROM seller_profiles WHERE user_id = ?', [req.user.id])?.id;
    const rows = all(
      `SELECT p.*, c.name_uz AS category_name, c.slug AS category_slug,
        (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order, pi.id LIMIT 1) AS image
       FROM products p JOIN categories c ON c.id = p.category_id
       WHERE p.seller_id = ? ORDER BY p.id DESC`,
      [sellerId]
    );
    res.json({ items: boolsAll(rows, ['available', 'featured', 'is_approved', 'is_active']) });
  })
);

/** GET /api/sellers/:slug — public seller page */
router.get(
  '/:slug',
  route(async (req, res) => {
    const seller = get(`${SELLER_SELECT} WHERE s.slug = ? OR s.id = ?`, [req.params.slug, Number(req.params.slug) || 0]);
    if (!seller || !seller.is_approved) notFound('seller_not_found');
    const products = all(
      `SELECT p.*, c.slug AS category_slug, c.name_uz AS category_name,
        (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order, pi.id LIMIT 1) AS image
       FROM products p JOIN categories c ON c.id = p.category_id
       WHERE p.seller_id = ? AND p.is_active = 1 AND p.is_approved = 1
       ORDER BY p.featured DESC, p.rating DESC`,
      [seller.id]
    );
    const reviews = all(
      `SELECT r.id, r.rating, r.comment, r.seller_reply, r.created_at, u.name AS customer_name, u.avatar_url AS customer_avatar, p.name AS product_name
       FROM reviews r JOIN users u ON u.id = r.customer_id LEFT JOIN products p ON p.id = r.product_id
       WHERE r.seller_id = ? ORDER BY r.id DESC LIMIT 20`,
      [seller.id]
    );
    res.json({ seller: serialize(seller), products, reviews });
  })
);

export default router;
