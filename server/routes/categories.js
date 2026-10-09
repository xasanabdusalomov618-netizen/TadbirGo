import { Router } from 'express';
import { z } from 'zod';
import { all, get, insert, update, run, boolsAll } from '../db.js';
import { optionalAuth, requireAuth, requireRole } from '../middleware/auth.js';
import { route, notFound } from '../lib/http.js';

const router = Router();

function withCounts(rows) {
  return rows.map((c) => ({
    ...c,
    is_active: !!c.is_active,
    product_count:
      get('SELECT COUNT(*) AS c FROM products WHERE category_id = ? AND is_active = 1 AND is_approved = 1', [c.id])?.c || 0,
  }));
}

/** GET /api/categories */
router.get('/', (_req, res) => {
  const rows = all('SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order, id');
  res.json({ items: withCounts(rows) });
});

/** GET /api/categories/with-counts — includes empty categories, used by admin */
router.get('/with-counts', (_req, res) => {
  res.json({ items: withCounts(all('SELECT * FROM categories ORDER BY sort_order, id')) });
});

/** GET /api/categories/:slug */
router.get(
  '/:slug',
  route(async (req, res) => {
    const category = get('SELECT * FROM categories WHERE slug = ? OR id = ?', [req.params.slug, Number(req.params.slug) || 0]);
    if (!category) notFound('category_not_found');
    res.json(withCounts([category])[0]);
  })
);

const schema = z.object({
  slug: z.string().trim().min(2).max(60),
  name_uz: z.string().trim().min(2).max(80),
  name_ru: z.string().trim().min(2).max(80),
  name_en: z.string().trim().min(2).max(80),
  description_uz: z.string().trim().max(400).optional().or(z.literal('')),
  description_ru: z.string().trim().max(400).optional().or(z.literal('')),
  description_en: z.string().trim().max(400).optional().or(z.literal('')),
  icon: z.string().trim().max(40).default('Package'),
  accent: z.string().trim().max(20).default('#6366f1'),
  sort_order: z.coerce.number().int().default(0),
});

router.post('/', requireAuth, requireRole('admin'), (req, res, next) => {
  Promise.resolve()
    .then(() => {
      const data = schema.parse(req.body);
      const id = insert('categories', data);
      res.status(201).json(get('SELECT * FROM categories WHERE id = ?', [id]));
    })
    .catch(next);
});

router.put('/:id', requireAuth, requireRole('admin'), (req, res, next) => {
  Promise.resolve()
    .then(() => {
      const data = schema.partial().parse(req.body);
      update('categories', req.params.id, data);
      res.json(get('SELECT * FROM categories WHERE id = ?', [req.params.id]));
    })
    .catch(next);
});

router.delete('/:id', requireAuth, requireRole('admin'), (req, res, next) => {
  Promise.resolve()
    .then(() => {
      if (get('SELECT COUNT(*) AS c FROM products WHERE category_id = ?', [req.params.id]).c > 0) {
        return res.status(400).json({ error: 'category_in_use' });
      }
      run('DELETE FROM categories WHERE id = ?', [req.params.id]);
      res.json({ ok: true });
    })
    .catch(next);
});

export default router;
