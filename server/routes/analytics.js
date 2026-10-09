import { Router } from 'express';
import { all, get } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { route, bad } from '../lib/http.js';

const router = Router();

/** GET /api/analytics/seller — earnings, orders, top products, charts */
router.get(
  '/seller',
  requireAuth,
  route(async (req, res) => {
    const seller = get('SELECT * FROM seller_profiles WHERE user_id = ?', [req.user.id]);
    const sellerId = req.user.role === 'admin' && req.query.seller_id ? Number(req.query.seller_id) : seller?.id;
    if (!sellerId) bad('seller_required');

    const months = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const row = get(
        `SELECT COALESCE(SUM(total - commission), 0) AS net, COALESCE(SUM(total), 0) AS gross, COUNT(*) AS orders
         FROM bookings WHERE seller_id = ? AND strftime('%Y-%m', created_at) = ? AND status != 'cancelled'`,
        [sellerId, key]
      );
      months.push({
        month: key,
        label: d.toLocaleDateString('en', { month: 'short' }),
        net: row?.net || 0,
        gross: row?.gross || 0,
        orders: row?.orders || 0,
      });
    }

    const summary = get(
      `SELECT
        COUNT(*) AS total_orders,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status IN ('yangi','pending') THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN total - commission ELSE 0 END), 0) AS net_earnings,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN total ELSE 0 END), 0) AS gross,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN commission ELSE 0 END), 0) AS commission_paid
       FROM bookings WHERE seller_id = ?`,
      [sellerId]
    );

    const topProducts = all(
      `SELECT p.id, p.name, p.price, p.price_type,
        (SELECT url FROM product_images i WHERE i.product_id = p.id ORDER BY i.sort_order, i.id LIMIT 1) AS image,
        SUM(bi.quantity) AS units, COUNT(DISTINCT bi.booking_id) AS orders, COALESCE(SUM(bi.subtotal), 0) AS revenue
       FROM booking_items bi JOIN products p ON p.id = bi.product_id
       WHERE p.seller_id = ? GROUP BY p.id ORDER BY revenue DESC LIMIT 6`,
      [sellerId]
    );

    const statusBreakdown = all('SELECT status, COUNT(*) AS count FROM bookings WHERE seller_id = ? GROUP BY status', [sellerId]);

    const payouts = all(
      `SELECT id, amount, type, status, method, reference, created_at FROM payments WHERE seller_id = ? ORDER BY id DESC LIMIT 12`,
      [sellerId]
    );

    res.json({ summary, months, topProducts, statusBreakdown, payouts });
  })
);

/** GET /api/analytics/home — public platform counters for the landing page */
router.get('/home', (_req, res) => {
  const counters = get(
    `SELECT
      (SELECT COUNT(*) FROM users) AS users,
      (SELECT COUNT(*) FROM seller_profiles WHERE is_approved = 1) AS sellers,
      (SELECT COUNT(*) FROM products WHERE is_active = 1) AS listings,
      (SELECT COUNT(*) FROM bookings) AS bookings,
      (SELECT COUNT(*) FROM categories) AS categories,
      (SELECT COUNT(DISTINCT city) FROM products WHERE is_active = 1) AS cities,
      (SELECT COALESCE(SUM(total), 0) FROM bookings WHERE status != 'cancelled') AS volume`
  );
  const featured = all(
    `SELECT p.id, p.name, p.price, p.price_type, p.rating, p.review_count, p.city, p.featured,
      c.slug AS category_slug, c.name_uz AS category_name, c.accent AS accent,
      s.business_name AS seller_name, s.rating AS seller_rating,
      (SELECT url FROM product_images i WHERE i.product_id = p.id ORDER BY i.sort_order, i.id LIMIT 1) AS image
     FROM products p
     JOIN categories c ON c.id = p.category_id
     JOIN seller_profiles s ON s.id = p.seller_id
     WHERE p.is_active = 1 AND p.is_approved = 1 AND s.is_approved = 1
     ORDER BY p.featured DESC, p.rating DESC, p.views DESC LIMIT 8`
  );
  const ads = all('SELECT * FROM advertisements WHERE is_active = 1 ORDER BY id DESC LIMIT 3');
  res.json({ counters, featured, ads });
});

export default router;
