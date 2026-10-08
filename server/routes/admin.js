import { Router } from 'express';
import { z } from 'zod';
import { all, get, update, run, boolsAll, now } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { route, notFound, int } from '../lib/http.js';
import { notify } from '../lib/notify.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

/** GET /api/admin/stats — platform dashboard */
router.get(
  '/stats',
  route(async (_req, res) => {
    const totals = get(
      `SELECT
        (SELECT COUNT(*) FROM users) AS users,
        (SELECT COUNT(*) FROM users WHERE role = 'seller') AS sellers,
        (SELECT COUNT(*) FROM users WHERE role = 'customer') AS customers,
        (SELECT COUNT(*) FROM seller_profiles WHERE is_approved = 0) AS pending_sellers,
        (SELECT COUNT(*) FROM products WHERE is_active = 1) AS listings,
        (SELECT COUNT(*) FROM products WHERE is_approved = 0) AS pending_products,
        (SELECT COUNT(*) FROM bookings) AS bookings,
        (SELECT COUNT(*) FROM bookings WHERE status IN ('yangi','pending')) AS active_bookings,
        (SELECT COALESCE(SUM(total), 0) FROM bookings WHERE status != 'cancelled') AS revenue,
        (SELECT COALESCE(SUM(commission), 0) FROM bookings WHERE status = 'completed') AS commission,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE type IN ('subscription','featured','advertising') AND status = 'paid') AS extra_revenue`
    );

    // Monthly revenue for the last 12 months (completed + in-flight orders).
    const monthly = all(
      `SELECT strftime('%Y-%m', created_at) AS month,
        COALESCE(SUM(total), 0) AS revenue,
        COALESCE(SUM(commission), 0) AS commission,
        COUNT(*) AS bookings
       FROM bookings WHERE status != 'cancelled'
       GROUP BY month ORDER BY month DESC LIMIT 12`
    ).reverse();

    const byStatus = all('SELECT status, COUNT(*) AS count FROM bookings GROUP BY status');
    const topCategories = all(
      `SELECT c.name_uz, c.name_ru, c.name_en, c.slug, COUNT(bi.id) AS orders, COALESCE(SUM(bi.subtotal), 0) AS revenue
       FROM booking_items bi
       JOIN products p ON p.id = bi.product_id
       JOIN categories c ON c.id = p.category_id
       GROUP BY c.id ORDER BY orders DESC LIMIT 8`
    );
    const topSellers = all(
      `SELECT s.id, s.business_name, s.slug, s.rating, s.is_premium,
        COUNT(b.id) AS orders, COALESCE(SUM(b.total), 0) AS revenue
       FROM seller_profiles s LEFT JOIN bookings b ON b.seller_id = s.id AND b.status != 'cancelled'
       GROUP BY s.id ORDER BY revenue DESC LIMIT 8`
    ).map((s) => ({ ...s, is_premium: !!s.is_premium }));
    const recentBookings = all(
      `SELECT b.id, b.code, b.total, b.status, b.created_at, u.name AS customer_name, s.business_name AS seller_name
       FROM bookings b JOIN users u ON u.id = b.customer_id JOIN seller_profiles s ON s.id = b.seller_id
       ORDER BY b.id DESC LIMIT 8`
    );
    const recentUsers = all("SELECT id, name, email, role, created_at FROM users ORDER BY id DESC LIMIT 8");

    res.json({ totals, monthly, byStatus, topCategories, topSellers, recentBookings, recentUsers });
  })
);

/** GET /api/admin/users */
router.get(
  '/users',
  route(async (req, res) => {
    const { q, role, page = '1' } = req.query;
    const where = [];
    const params = [];
    if (q) {
      where.push('(u.name LIKE ? OR u.email LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }
    if (role && role !== 'all') {
      where.push('u.role = ?');
      params.push(role);
    }
    const perPage = 20;
    const pageNum = Math.max(1, int(page, 1));
    const total = get(`SELECT COUNT(*) AS c FROM users u ${where.length ? `WHERE ${where.join(' AND ')}` : ''}`, params).c;
    const items = all(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.city, u.created_at, u.is_blocked, u.avatar_url,
        s.business_name, s.slug, s.is_approved, s.is_premium, s.rating
       FROM users u LEFT JOIN seller_profiles s ON s.user_id = u.id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY u.id DESC LIMIT ? OFFSET ?`,
      [...params, perPage, (pageNum - 1) * perPage]
    ).map((u) => ({ ...u, is_blocked: !!u.is_blocked, is_approved: !!u.is_approved, is_premium: !!u.is_premium }));
    res.json({ items, total, page: pageNum, pages: Math.max(1, Math.ceil(total / perPage)) });
  })
);

/** PATCH /api/admin/users/:id */
router.patch(
  '/users/:id',
  route(async (req, res) => {
    const data = z
      .object({
        role: z.enum(['customer', 'seller', 'admin']).optional(),
        is_blocked: z.boolean().optional(),
        name: z.string().trim().min(2).max(80).optional(),
      })
      .parse(req.body);
    const user = get('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) notFound('user_not_found');
    update('users', user.id, {
      ...(data.role ? { role: data.role } : {}),
      ...(data.is_blocked !== undefined ? { is_blocked: data.is_blocked ? 1 : 0 } : {}),
      ...(data.name ? { name: data.name } : {}),
    });
    res.json({ ok: true, user: get('SELECT id, name, email, role, is_blocked FROM users WHERE id = ?', [user.id]) });
  })
);

/** GET /api/admin/sellers */
router.get(
  '/sellers',
  route(async (_req, res) => {
    const items = all(
      `SELECT s.*, u.name AS owner_name, u.email, u.phone,
        (SELECT COUNT(*) FROM products p WHERE p.seller_id = s.id) AS product_count
       FROM seller_profiles s JOIN users u ON u.id = s.user_id ORDER BY s.id DESC`
    );
    res.json({ items: boolsAll(items, ['is_approved', 'is_premium', 'featured']) });
  })
);

/** PATCH /api/admin/sellers/:id */
router.patch(
  '/sellers/:id',
  route(async (req, res) => {
    const data = z
      .object({
        is_approved: z.boolean().optional(),
        is_premium: z.boolean().optional(),
        featured: z.boolean().optional(),
        commission_rate: z.coerce.number().min(0).max(0.5).optional(),
      })
      .parse(req.body);
    const seller = get('SELECT * FROM seller_profiles WHERE id = ?', [req.params.id]);
    if (!seller) notFound('seller_not_found');
    update('seller_profiles', seller.id, {
      ...(data.is_approved !== undefined ? { is_approved: data.is_approved ? 1 : 0 } : {}),
      ...(data.is_premium !== undefined ? { is_premium: data.is_premium ? 1 : 0 } : {}),
      ...(data.featured !== undefined ? { featured: data.featured ? 1 : 0 } : {}),
      ...(data.commission_rate !== undefined ? { commission_rate: data.commission_rate } : {}),
    });
    if (data.is_approved !== undefined) {
      notify(seller.user_id, 'approval', {
        title: {
          uz: data.is_approved ? 'Profil tasdiqlandi' : 'Profil tasdiqdan olib tashlandi',
          ru: data.is_approved ? 'Профиль одобрен' : 'Одобрение снято',
          en: data.is_approved ? 'Profile approved' : 'Approval revoked',
        },
        body: {
          uz: data.is_approved ? 'E’lonlaringiz endi barcha mijozlarga ko‘rinadi.' : 'E’lonlaringiz vaqtincha yashirildi.',
          ru: data.is_approved ? 'Ваши объявления видны всем клиентам.' : 'Ваши объявления временно скрыты.',
          en: data.is_approved ? 'Your listings are now public.' : 'Your listings are temporarily hidden.',
        },
      }, '/seller');
    }
    res.json({ ok: true });
  })
);

/** GET /api/admin/products?status=pending|all */
router.get(
  '/products',
  route(async (req, res) => {
    const where = req.query.status === 'pending' ? 'WHERE p.is_approved = 0' : '';
    const items = all(
      `SELECT p.*, c.name_uz AS category_name, s.business_name AS seller_name, s.slug AS seller_slug,
        (SELECT url FROM product_images i WHERE i.product_id = p.id ORDER BY i.sort_order, i.id LIMIT 1) AS image
       FROM products p
       JOIN categories c ON c.id = p.category_id
       JOIN seller_profiles s ON s.id = p.seller_id
       ${where} ORDER BY p.id DESC LIMIT 100`
    );
    res.json({ items: boolsAll(items, ['available', 'featured', 'is_approved', 'is_active']) });
  })
);

/** PATCH /api/admin/products/:id */
router.patch(
  '/products/:id',
  route(async (req, res) => {
    const data = z.object({ is_approved: z.boolean().optional(), is_active: z.boolean().optional(), featured: z.boolean().optional() }).parse(req.body);
    const product = get('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!product) notFound('product_not_found');
    update('products', product.id, {
      ...(data.is_approved !== undefined ? { is_approved: data.is_approved ? 1 : 0 } : {}),
      ...(data.is_active !== undefined ? { is_active: data.is_active ? 1 : 0 } : {}),
      ...(data.featured !== undefined ? { featured: data.featured ? 1 : 0 } : {}),
      updated_at: now(),
    });
    res.json({ ok: true });
  })
);

/** DELETE /api/admin/products/:id — remove an inappropriate listing */
router.delete(
  '/products/:id',
  route(async (req, res) => {
    const product = get('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!product) notFound('product_not_found');
    const seller = get('SELECT * FROM seller_profiles WHERE id = ?', [product.seller_id]);
    run('DELETE FROM products WHERE id = ?', [product.id]);
    if (seller) {
      notify(seller.user_id, 'removal', {
        title: { uz: 'E’lon olib tashlandi', ru: 'Объявление удалено', en: 'Listing removed' },
        body: {
          uz: `«${product.name}» qoidalarga zid deb topildi va olib tashlandi.`,
          ru: `«${product.name}» удалено как нарушающее правила.`,
          en: `"${product.name}" was removed for violating the rules.`,
        },
      });
    }
    res.json({ ok: true });
  })
);

/** GET /api/admin/bookings */
router.get(
  '/bookings',
  route(async (req, res) => {
    const status = req.query.status;
    const params = [];
    let where = '';
    if (status && status !== 'all') {
      where = 'WHERE b.status = ?';
      params.push(status);
    }
    const items = all(
      `SELECT b.id, b.code, b.total, b.status, b.event_date, b.city, b.created_at, b.payment_status,
        u.name AS customer_name, s.business_name AS seller_name
       FROM bookings b JOIN users u ON u.id = b.customer_id JOIN seller_profiles s ON s.id = b.seller_id
       ${where} ORDER BY b.id DESC LIMIT 200`,
      params
    );
    res.json({ items });
  })
);

/** GET /api/admin/payments — commission & monetisation ledger */
router.get(
  '/payments',
  route(async (_req, res) => {
    const items = all(
      `SELECT p.*, s.business_name AS seller_name, u.name AS user_name
       FROM payments p
       LEFT JOIN seller_profiles s ON s.id = p.seller_id
       LEFT JOIN users u ON u.id = p.user_id
       ORDER BY p.id DESC LIMIT 100`
    );
    res.json({ items });
  })
);

/** GET /api/admin/ads — advertising inventory */
router.get('/ads', (_req, res) => {
  res.json({ items: boolsAll(all('SELECT * FROM advertisements ORDER BY id DESC'), ['is_active']) });
});

/** POST /api/admin/ads */
router.post(
  '/ads',
  route(async (req, res) => {
    const data = z
      .object({
        title: z.string().trim().min(2).max(120),
        image_url: z.string().trim().max(500).optional().or(z.literal('')),
        link: z.string().trim().max(300).optional().or(z.literal('')),
        placement: z.enum(['home', 'explore', 'sidebar']).default('home'),
        budget: z.coerce.number().int().min(0).default(0),
        seller_id: z.coerce.number().int().optional(),
      })
      .parse(req.body);
    const id = run(
      'INSERT INTO advertisements (title, image_url, link, placement, budget, seller_id, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)',
      [data.title, data.image_url || null, data.link || null, data.placement, data.budget, data.seller_id || null, now()]
    ).lastInsertRowid;
    res.status(201).json(get('SELECT * FROM advertisements WHERE id = ?', [id]));
  })
);

/** DELETE /api/admin/ads/:id */
router.delete('/ads/:id', (req, res) => {
  run('DELETE FROM advertisements WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

export default router;
