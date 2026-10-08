import { Router } from 'express';
import { z } from 'zod';
import { all, get, insert, update, run, bools, boolsAll, transaction, now } from '../db.js';
import { optionalAuth, requireAuth, requireSeller } from '../middleware/auth.js';
import { route, bad, notFound, denied, int } from '../lib/http.js';
import { refreshProductRating } from '../lib/ratings.js';
import { notify } from '../lib/notify.js';
import { FEATURED_PRICE } from '../lib/constants.js';

const router = Router();

const PRODUCT_BOOLS = ['available', 'featured', 'is_approved', 'is_active'];

function productImages(productId) {
  return all('SELECT url, is_primary, sort_order FROM product_images WHERE product_id = ? ORDER BY sort_order, id', [productId]);
}

function serialize(row) {
  if (!row) return null;
  const p = bools(row, [...PRODUCT_BOOLS]);
  return {
    id: p.id,
    seller_id: p.seller_id,
    category_id: p.category_id,
    name: p.name,
    description: p.description,
    price: p.price,
    price_type: p.price_type,
    deposit: p.deposit,
    city: p.city,
    district: p.district,
    address: p.address,
    quantity: p.quantity,
    available: p.available,
    rating: p.rating,
    review_count: p.review_count,
    featured: p.featured,
    featured_until: p.featured_until,
    is_approved: p.is_approved,
    is_active: p.is_active,
    views: p.views,
    min_order: p.min_order,
    unit_note: p.unit_note,
    created_at: p.created_at,
    updated_at: p.updated_at,
    images: (row.images_json ? JSON.parse(row.images_json) : []).filter(Boolean),
    category: {
      id: row.category_id,
      slug: row.category_slug,
      name_uz: row.category_uz,
      name_ru: row.category_ru,
      name_en: row.category_en,
      icon: row.category_icon,
      accent: row.category_accent,
    },
    seller: {
      id: row.seller_id,
      name: row.seller_name,
      slug: row.seller_slug,
      city: row.seller_city,
      logo_url: row.seller_logo,
      rating: row.seller_rating,
      phone: row.seller_phone,
      review_count: row.seller_review_count,
      is_premium: !!row.seller_premium,
      is_approved: !!row.seller_approved,
      response_hours: row.seller_response_hours,
    },
  };
}

const SELECT_PRODUCT = `
  SELECT p.*,
    (SELECT json_group_array(url) FROM (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order, pi.id)) AS images_json,
    c.slug AS category_slug, c.name_uz AS category_uz, c.name_ru AS category_ru, c.name_en AS category_en,
    c.icon AS category_icon, c.accent AS category_accent,
    s.business_name AS seller_name, s.slug AS seller_slug, s.city AS seller_city, s.logo_url AS seller_logo, s.phone AS seller_phone,
    s.rating AS seller_rating, s.review_count AS seller_review_count, s.is_premium AS seller_premium,
    s.is_approved AS seller_approved, s.response_hours AS seller_response_hours
  FROM products p
  JOIN categories c ON c.id = p.category_id
  JOIN seller_profiles s ON s.id = p.seller_id
`;

/** GET /api/products — search + filter + sort + paginate */
router.get(
  '/',
  optionalAuth,
  route(async (req, res) => {
    const {
      q, category, city, district, min_price, max_price, date, price_type,
      sort = 'popular', featured, seller_id, status, page = '1', limit = '12',
    } = req.query;

    const where = ["p.is_active = 1", "s.is_approved = 1"];
    const params = [];

    if (q) {
      where.push('(p.name LIKE ? OR p.description LIKE ? OR s.business_name LIKE ?)');
      const like = `%${q}%`;
      params.push(like, like, like);
    }
    if (category) {
      where.push('(c.slug = ? OR c.id = ?)');
      params.push(category, int(category, 0));
    }
    if (city && city !== 'all') {
      where.push('p.city = ?');
      params.push(city);
    }
    if (district) {
      where.push('p.district LIKE ?');
      params.push(`%${district}%`);
    }
    if (min_price) {
      where.push('p.price >= ?');
      params.push(int(min_price));
    }
    if (max_price) {
      where.push('p.price <= ?');
      params.push(int(max_price));
    }
    if (price_type) {
      where.push('p.price_type = ?');
      params.push(price_type);
    }
    if (featured === '1') where.push('p.featured = 1');
    if (seller_id) {
      where.push('p.seller_id = ?');
      params.push(int(seller_id));
    }
    // Admin / seller-owner previews can see unapproved or inactive listings.
    if (status === 'pending') {
      if (req.user?.role !== 'admin') denied();
      where.length = 0;
      where.push('p.is_approved = 0');
    } else if (status === 'all' && req.user?.role === 'admin') {
      where.length = 0;
      where.push('1 = 1');
    }

    let availabilityJoin = '';
    if (date) {
      where.push(`NOT EXISTS (SELECT 1 FROM availability av WHERE av.product_id = p.id AND av.date = ? AND av.status != 'available')`);
      params.push(date);
      where.push('p.available = 1');
    }

    const orderBy = {
      popular: 'p.featured DESC, p.views DESC, p.rating DESC',
      newest: 'p.id DESC',
      price_asc: 'p.price ASC',
      price_desc: 'p.price DESC',
      rating: 'p.rating DESC, p.review_count DESC',
    }[sort] || 'p.featured DESC, p.views DESC';

    const pageNum = Math.max(1, int(page, 1));
    const perPage = Math.min(48, Math.max(1, int(limit, 12)));
    const offset = (pageNum - 1) * perPage;

    const total = get(`SELECT COUNT(*) AS c FROM products p JOIN categories c ON c.id = p.category_id JOIN seller_profiles s ON s.id = p.seller_id ${availabilityJoin} WHERE ${where.join(' AND ')}`, params).c;
    const rows = all(`${SELECT_PRODUCT} WHERE ${where.join(' AND ')} ORDER BY ${orderBy} LIMIT ? OFFSET ?`, [...params, perPage, offset]);

    res.json({
      items: rows.map(serialize),
      total,
      page: pageNum,
      pages: Math.max(1, Math.ceil(total / perPage)),
      limit: perPage,
    });
  })
);

/** GET /api/products/recommendations — package builder engine */
router.get(
  '/recommendations',
  route(async (req, res) => {
    const guests = Math.max(1, int(req.query.guests, 100));
    const budget = Math.max(0, int(req.query.budget, 0));
    const city = req.query.city;
    const eventDate = req.query.event_date;

    const where = ['p.is_active = 1', 'p.is_approved = 1', 's.is_approved = 1', 'p.available = 1'];
    const params = [];
    if (city && city !== 'all') {
      where.push('p.city = ?');
      params.push(city);
    }
    if (eventDate) {
      where.push(`NOT EXISTS (SELECT 1 FROM availability av WHERE av.product_id = p.id AND av.date = ? AND av.status != 'available')`);
      params.push(eventDate);
    }
    const rows = all(`${SELECT_PRODUCT} WHERE ${where.join(' AND ')} ORDER BY p.featured DESC, p.rating DESC, p.views DESC LIMIT 200`, params).map(serialize);

    // How many guests one unit of a category covers (drives the suggested quantity).
    const COVERAGE = {
      'stol-va-stullar': 1,
      chodirlar: 100,
      dekor: 400,
      fotozona: 400,
      'kolonka-va-audio': 150,
      projektor: 400,
      yoruglik: 150,
      'idish-tovoqlar': 100,
      dj: 400,
      fotograf: 400,
      videograf: 400,
      catering: 1,
      'event-joylari': 400,
      'yetkazib-berish': 400,
      ornatish: 400,
    };

    const coverageFor = (product) => {
      const slug = product.category?.slug || '';
      const name = (product.name || '').toLowerCase();
      if (slug === 'stol-va-stullar') return /stul|chair|kreslo/.test(name) ? 1 : 10;
      if (slug === 'catering') return 1;
      return COVERAGE[slug] || 400;
    };

    const quantityFor = (product) => {
      if (product.price_type === 'person') return Math.max(1, guests);
      const coverage = coverageFor(product);
      return Math.max(1, Math.ceil(guests / coverage));
    };

    const lineTotalFor = (product, qty) => {
      if (product.price_type === 'person') return product.price * Math.max(1, guests);
      return product.price * qty;
    };

    // One best pick per category keeps the package balanced.
    const byCategory = new Map();
    for (const product of rows) {
      const key = product.category?.slug || `other-${product.id}`;
      const current = byCategory.get(key);
      if (!current || (product.rating || 0) > (current.rating || 0)) byCategory.set(key, product);
    }

    // Event build order: venue → tables/chairs → decor → tech → media → food → logistics
    const order = ['event-joylari', 'stol-va-stullar', 'chodirlar', 'dekor', 'fotozona', 'kolonka-va-audio', 'projektor', 'yoruglik', 'idish-tovoqlar', 'catering', 'dj', 'fotograf', 'videograf', 'yetkazib-berish', 'ornatish'];
    const picks = [...byCategory.values()].sort((a, b) => {
      const ia = order.indexOf(a.category?.slug);
      const ib = order.indexOf(b.category?.slug);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });

    let running = 0;
    const recommended = [];
    const skipped = [];
    for (const product of picks) {
      const qty = quantityFor(product);
      const lineTotal = lineTotalFor(product, qty);
      const enriched = { ...product, suggested_quantity: qty, line_total: lineTotal };
      if (budget && running + lineTotal > budget) {
        skipped.push(enriched);
        continue;
      }
      running += lineTotal;
      recommended.push(enriched);
    }

    res.json({
      guests,
      budget,
      estimated_total: running,
      remaining_budget: budget ? Math.max(0, budget - running) : null,
      recommended,
      alternatives: skipped.slice(0, 12),
    });
  })
);

/** GET /api/products/:id */
router.get(
  '/:id',
  optionalAuth,
  route(async (req, res) => {
    const row = get(`${SELECT_PRODUCT} WHERE p.id = ?`, [req.params.id]);
    if (!row) notFound('product_not_found');
    const product = serialize(row);
    run('UPDATE products SET views = views + 1 WHERE id = ?', [product.id]);
    res.json({
      ...product,
      availability: all(`SELECT date, status, note FROM availability WHERE product_id = ? AND date >= date('now') ORDER BY date LIMIT 120`, [product.id]),
      reviews: all(
        `SELECT r.id, r.rating, r.comment, r.seller_reply, r.created_at, u.name AS customer_name, u.avatar_url AS customer_avatar
         FROM reviews r JOIN users u ON u.id = r.customer_id
         WHERE r.product_id = ? ORDER BY r.id DESC LIMIT 20`,
        [product.id]
      ),
    });
  })
);

/** GET /api/products/:id/availability?from=&to= */
router.get(
  '/:id/availability',
  route(async (req, res) => {
    const { from, to } = req.query;
    const rows = all(
      `SELECT date, status, note FROM availability WHERE product_id = ? ${from ? 'AND date >= ?' : ''} ${to ? 'AND date <= ?' : ''} ORDER BY date`,
      [req.params.id, ...(from ? [from] : []), ...(to ? [to] : [])]
    );
    res.json({ dates: rows });
  })
);

const productSchema = z.object({
  name: z.string().trim().min(3, 'name_too_short').max(120),
  description: z.string().trim().max(4000).optional().or(z.literal('')),
  category_id: z.coerce.number().int().positive(),
  price: z.coerce.number().int().min(0),
  price_type: z.enum(['hour', 'day', 'event', 'person', 'set']).default('day'),
  deposit: z.coerce.number().int().min(0).default(0),
  city: z.string().trim().min(2).max(60),
  district: z.string().trim().max(80).optional().or(z.literal('')),
  address: z.string().trim().max(200).optional().or(z.literal('')),
  quantity: z.coerce.number().int().min(0).default(1),
  min_order: z.coerce.number().int().min(1).default(1),
  unit_note: z.string().trim().max(120).optional().or(z.literal('')),
  available: z.union([z.boolean(), z.coerce.number()]).default(true),
  images: z.array(z.string().max(500)).max(8).default([]),
  blocked_dates: z.array(z.string().max(20)).max(180).default([]),
});

function assertOwner(product, req) {
  if (!product) notFound('product_not_found');
  if (req.user.role === 'admin') return;
  if (!req.seller || product.seller_id !== req.seller.id) denied('not_your_product');
}

/** POST /api/products */
router.post(
  '/',
  requireAuth,
  requireSeller,
  route(async (req, res) => {
    const data = productSchema.parse(req.body);
    const sellerId = req.seller?.id || int(req.body.seller_id, 0);
    if (!sellerId) bad('seller_required');

    const id = transaction(() => {
      const newId = insert('products', {
        seller_id: sellerId,
        category_id: data.category_id,
        name: data.name,
        description: data.description || null,
        price: data.price,
        price_type: data.price_type,
        deposit: data.deposit,
        city: data.city,
        district: data.district || null,
        address: data.address || null,
        quantity: data.quantity,
        min_order: data.min_order,
        unit_note: data.unit_note || null,
        available: data.available ? 1 : 0,
        is_approved: 1,
        created_at: now(),
        updated_at: now(),
      });
      data.images.forEach((url, index) => {
        insert('product_images', { product_id: newId, url, is_primary: index === 0 ? 1 : 0, sort_order: index });
      });
      for (const date of data.blocked_dates) {
        if (date) insert('availability', { product_id: newId, date, status: 'blocked' });
      }
      return newId;
    });

    res.status(201).json(serialize(get(`${SELECT_PRODUCT} WHERE p.id = ?`, [id])));
  })
);

/** PUT /api/products/:id */
router.put(
  '/:id',
  requireAuth,
  requireSeller,
  route(async (req, res) => {
    const product = get('SELECT * FROM products WHERE id = ?', [req.params.id]);
    assertOwner(product, req);
    const data = productSchema.parse(req.body);

    transaction(() => {
      update('products', product.id, {
        category_id: data.category_id,
        name: data.name,
        description: data.description || null,
        price: data.price,
        price_type: data.price_type,
        deposit: data.deposit,
        city: data.city,
        district: data.district || null,
        address: data.address || null,
        quantity: data.quantity,
        min_order: data.min_order,
        unit_note: data.unit_note || null,
        available: data.available ? 1 : 0,
        updated_at: now(),
      });
      run('DELETE FROM product_images WHERE product_id = ?', [product.id]);
      data.images.forEach((url, index) => {
        insert('product_images', { product_id: product.id, url, is_primary: index === 0 ? 1 : 0, sort_order: index });
      });
    });

    res.json(serialize(get(`${SELECT_PRODUCT} WHERE p.id = ?`, [product.id])));
  })
);

/** PATCH /api/products/:id/availability — set blocked / booked dates */
router.patch(
  '/:id/availability',
  requireAuth,
  requireSeller,
  route(async (req, res) => {
    const product = get('SELECT * FROM products WHERE id = ?', [req.params.id]);
    assertOwner(product, req);
    const { dates, status = 'blocked' } = z
      .object({ dates: z.array(z.string().max(20)).max(365), status: z.enum(['available', 'blocked']).default('blocked') })
      .parse(req.body);

    transaction(() => {
      run(`DELETE FROM availability WHERE product_id = ? AND date >= date('now')`, [product.id]);
      for (const date of dates) {
        if (date) run('INSERT OR REPLACE INTO availability (product_id, date, status) VALUES (?, ?, ?)', [product.id, date, status]);
      }
      run('UPDATE products SET updated_at = ? WHERE id = ?', [now(), product.id]);
    });

    res.json({ ok: true, dates: all('SELECT date, status FROM availability WHERE product_id = ? ORDER BY date', [product.id]) });
  })
);

/** PATCH /api/products/:id/status — publish / pause listing */
router.patch(
  '/:id/status',
  requireAuth,
  requireSeller,
  route(async (req, res) => {
    const product = get('SELECT * FROM products WHERE id = ?', [req.params.id]);
    assertOwner(product, req);
    const { is_active, available } = z
      .object({ is_active: z.boolean().optional(), available: z.boolean().optional() })
      .parse(req.body);
    update('products', product.id, {
      ...(is_active !== undefined ? { is_active: is_active ? 1 : 0 } : {}),
      ...(available !== undefined ? { available: available ? 1 : 0 } : {}),
      updated_at: now(),
    });
    res.json(serialize(get(`${SELECT_PRODUCT} WHERE p.id = ?`, [product.id])));
  })
);

/** POST /api/products/:id/feature — buy a featured placement (monetisation) */
router.post(
  '/:id/feature',
  requireAuth,
  requireSeller,
  route(async (req, res) => {
    const product = get('SELECT * FROM products WHERE id = ?', [req.params.id]);
    assertOwner(product, req);
    const seller = get('SELECT * FROM seller_profiles WHERE id = ?', [product.seller_id]);
    if (!seller) notFound('seller_not_found');

    transaction(() => {
      run('UPDATE seller_profiles SET balance = balance - ? WHERE id = ?', [FEATURED_PRICE, seller.id]);
      insert('payments', {
        seller_id: seller.id,
        user_id: seller.user_id,
        amount: FEATURED_PRICE,
        type: 'featured',
        method: 'balance',
        status: 'paid',
        reference: `featured-product-${product.id}`,
      });
      run(`UPDATE products SET featured = 1, featured_until = date('now', '+30 days'), updated_at = ? WHERE id = ?`, [now(), product.id]);
    });

    notify(seller.user_id, 'featured', {
      title: { uz: 'E’lon TOPga chiqarildi', ru: 'Объявление в TOP', en: 'Listing promoted' },
      body: {
        uz: `"${product.name}" 30 kun davomida tavsiya etilganlar ro‘yxatida.`,
        ru: `«${product.name}» в рекомендациях на 30 дней.`,
        en: `"${product.name}" is featured for 30 days.`,
      },
    }, `/products/${product.id}`);

    res.json({ ok: true });
  })
);

/** DELETE /api/products/:id */
router.delete(
  '/:id',
  requireAuth,
  requireSeller,
  route(async (req, res) => {
    const product = get('SELECT * FROM products WHERE id = ?', [req.params.id]);
    assertOwner(product, req);
    transaction(() => {
      run('DELETE FROM package_items WHERE product_id = ?', [product.id]);
      run('DELETE FROM reviews WHERE product_id = ?', [product.id]);
      run('DELETE FROM products WHERE id = ?', [product.id]);
    });
    res.json({ ok: true });
  })
);

export default router;
