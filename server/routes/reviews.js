import { Router } from 'express';
import { z } from 'zod';
import { all, get, insert, update, run, now } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { route, bad, notFound, denied } from '../lib/http.js';
import { refreshProductRating, refreshSellerRating } from '../lib/ratings.js';
import { notify } from '../lib/notify.js';

const router = Router();

/** GET /api/reviews?product_id=&seller_id= */
router.get('/', (req, res) => {
  const { product_id, seller_id, limit = '50' } = req.query;
  const where = [];
  const params = [];
  if (product_id) {
    where.push('r.product_id = ?');
    params.push(product_id);
  }
  if (seller_id) {
    where.push('r.seller_id = ?');
    params.push(seller_id);
  }
  const rows = all(
    `SELECT r.id, r.rating, r.comment, r.seller_reply, r.created_at, r.product_id, r.booking_id,
      u.name AS customer_name, u.avatar_url AS customer_avatar, p.name AS product_name, b.code AS booking_code
     FROM reviews r
     JOIN users u ON u.id = r.customer_id
     LEFT JOIN products p ON p.id = r.product_id
     LEFT JOIN bookings b ON b.id = r.booking_id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY r.id DESC LIMIT ?`,
    [...params, Math.min(100, Number(limit) || 50)]
  );
  res.json({ items: rows });
});

const reviewSchema = z.object({
  booking_id: z.coerce.number().int().positive(),
  product_id: z.coerce.number().int().positive().optional(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional().or(z.literal('')),
});

/** POST /api/reviews — only after a completed booking */
router.post(
  '/',
  requireAuth,
  route(async (req, res) => {
    const data = reviewSchema.parse(req.body);
    const booking = get('SELECT * FROM bookings WHERE id = ?', [data.booking_id]);
    if (!booking) notFound('booking_not_found');
    if (booking.customer_id !== req.user.id) denied('not_your_booking');
    if (booking.status !== 'completed') bad('review_only_after_completion');

    let productId = data.product_id || null;
    if (productId) {
      const inBooking = get('SELECT id FROM booking_items WHERE booking_id = ? AND product_id = ?', [booking.id, productId]);
      if (!inBooking) bad('product_not_in_booking');
    } else if (get('SELECT id FROM reviews WHERE booking_id = ? AND product_id IS NULL', [booking.id])) {
      bad('already_reviewed');
    }

    const existing = get('SELECT id FROM reviews WHERE booking_id = ? AND product_id IS ?', [booking.id, productId]);
    if (existing) bad('already_reviewed');

    const id = insert('reviews', {
      booking_id: booking.id,
      customer_id: req.user.id,
      seller_id: booking.seller_id,
      product_id: productId,
      rating: data.rating,
      comment: data.comment || null,
      created_at: now(),
    });

    refreshProductRating(productId);
    refreshSellerRating(booking.seller_id);

    const seller = get('SELECT user_id FROM seller_profiles WHERE id = ?', [booking.seller_id]);
    if (seller) {
      notify(seller.user_id, 'review', {
        title: { uz: 'Yangi sharh', ru: 'Новый отзыв', en: 'New review' },
        body: {
          uz: `${booking.code} buyurtmasi uchun ${data.rating} yulduz qo‘yildi.`,
          ru: `За заказ ${booking.code} поставили ${data.rating} звёзд.`,
          en: `Booking ${booking.code} received ${data.rating} stars.`,
        },
      }, '/seller/orders');
    }

    res.status(201).json(get('SELECT * FROM reviews WHERE id = ?', [id]));
  })
);

/** POST /api/reviews/:id/reply — seller answers a review */
router.post(
  '/:id/reply',
  requireAuth,
  route(async (req, res) => {
    const review = get('SELECT * FROM reviews WHERE id = ?', [req.params.id]);
    if (!review) notFound('review_not_found');
    const seller = get('SELECT * FROM seller_profiles WHERE id = ?', [review.seller_id]);
    if (seller.user_id !== req.user.id && req.user.role !== 'admin') denied('not_your_review');
    const { reply } = z.object({ reply: z.string().trim().min(2).max(1000) }).parse(req.body);
    update('reviews', review.id, { seller_reply: reply });
    res.json(get('SELECT * FROM reviews WHERE id = ?', [review.id]));
  })
);

export default router;
