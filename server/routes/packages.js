import { Router } from 'express';
import { z } from 'zod';
import { all, get, insert, run, transaction, now } from '../db.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { route, notFound, denied, int } from '../lib/http.js';

const router = Router();

const packageSchema = z.object({
  name: z.string().trim().max(120).optional().or(z.literal('')),
  event_type: z.string().trim().max(40).default('other'),
  guests: z.coerce.number().int().min(1).max(100000).default(100),
  event_date: z.string().trim().max(20).optional().or(z.literal('')),
  city: z.string().trim().max(60).optional().or(z.literal('')),
  budget: z.coerce.number().int().min(0).default(0),
  items: z
    .array(z.object({ product_id: z.coerce.number().int().positive(), quantity: z.coerce.number().int().min(1).default(1) }))
    .max(60)
    .default([]),
  estimate_total: z.coerce.number().int().min(0).optional(),
});

function withItems(row) {
  if (!row) return null;
  const items = all(
    `SELECT pi.id, pi.product_id, pi.quantity, p.name, p.price, p.price_type, p.city, p.deposit,
      c.slug AS category_slug,
      (SELECT url FROM product_images i WHERE i.product_id = p.id ORDER BY i.sort_order, i.id LIMIT 1) AS image
     FROM package_items pi
     JOIN products p ON p.id = pi.product_id
     JOIN categories c ON c.id = p.category_id
     WHERE pi.package_id = ?`,
    [row.id]
  );
  return { ...row, items };
}

/** GET /api/packages — saved packages of the current user (guests: none) */
router.get(
  '/',
  optionalAuth,
  route(async (req, res) => {
    if (!req.user) return res.json({ items: [] });
    const rows = all('SELECT * FROM event_packages WHERE user_id = ? ORDER BY id DESC LIMIT 30', [req.user.id]);
    res.json({ items: rows.map(withItems) });
  })
);

/** POST /api/packages — save a generated event package */
router.post(
  '/',
  optionalAuth,
  route(async (req, res) => {
    const data = packageSchema.parse(req.body);
    const id = transaction(() => {
      const packageId = insert('event_packages', {
        user_id: req.user?.id || null,
        name: data.name || null,
        event_type: data.event_type,
        guests: data.guests,
        event_date: data.event_date || null,
        city: data.city || null,
        budget: data.budget,
        items_count: data.items.length,
        estimate_total: data.estimate_total || 0,
        status: 'draft',
        created_at: now(),
      });
      for (const item of data.items) {
        insert('package_items', { package_id: packageId, product_id: item.product_id, quantity: item.quantity });
      }
      return packageId;
    });
    res.status(201).json(withItems(get('SELECT * FROM event_packages WHERE id = ?', [id])));
  })
);

/** GET /api/packages/:id */
router.get(
  '/:id',
  route(async (req, res) => {
    const row = get('SELECT * FROM event_packages WHERE id = ?', [req.params.id]);
    if (!row) notFound('package_not_found');
    res.json(withItems(row));
  })
);

/** DELETE /api/packages/:id */
router.delete(
  '/:id',
  requireAuth,
  route(async (req, res) => {
    const row = get('SELECT * FROM event_packages WHERE id = ?', [req.params.id]);
    if (!row) notFound('package_not_found');
    if (row.user_id !== req.user.id && req.user.role !== 'admin') denied('not_your_package');
    transaction(() => {
      run('DELETE FROM package_items WHERE package_id = ?', [row.id]);
      run('DELETE FROM event_packages WHERE id = ?', [row.id]);
    });
    res.json({ ok: true });
  })
);

export default router;
