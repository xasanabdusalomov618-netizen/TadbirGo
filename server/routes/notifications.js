import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { notificationList, unreadCount, markRead } from '../lib/notify.js';
import { route, int } from '../lib/http.js';

const router = Router();

router.get(
  '/',
  requireAuth,
  route(async (req, res) => {
    res.json({ items: notificationList(req.user.id, Math.min(50, int(req.query.limit, 20))), unread: unreadCount(req.user.id) });
  })
);

router.patch(
  '/read/:id',
  requireAuth,
  route(async (req, res) => {
    markRead(req.user.id, req.params.id);
    res.json({ ok: true, unread: unreadCount(req.user.id) });
  })
);

router.patch(
  '/read-all',
  requireAuth,
  route(async (req, res) => {
    markRead(req.user.id);
    res.json({ ok: true, unread: 0 });
  })
);

export default router;
