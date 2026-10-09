import { Router } from 'express';
import { all, boolsAll } from '../db.js';

const router = Router();

/** GET /api/delivery-options — standard, express, installation, pickup */
router.get('/', (_req, res) => {
  res.json({ items: boolsAll(all('SELECT * FROM delivery_options WHERE is_active = 1 ORDER BY sort_order, id'), ['is_active']) });
});

export default router;
