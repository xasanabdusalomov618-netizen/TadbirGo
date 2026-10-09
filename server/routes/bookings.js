import { Router } from 'express';
import { z } from 'zod';
import { all, get, insert, update, run, bools, transaction, now } from '../db.js';
import { optionalAuth, requireAuth, requireRole } from '../middleware/auth.js';
import { route, bad, notFound, denied, int } from '../lib/http.js';
import { notify } from '../lib/notify.js';
import { makeBookingCode, SERVICE_FEE_RATE, ACTIVE_STATUSES, COMMISSION_RATE } from '../lib/constants.js';

const router = Router();

function bookingItems(bookingId) {
  return all('SELECT * FROM booking_items WHERE booking_id = ? ORDER BY id', [bookingId]);
}

function serialize(row) {
  if (!row) return null;
  return {
    ...row,
    items: row.items_json ? JSON.parse(row.items_json) : bookingItems(row.id),
    customer: row.customer_id
      ? { id: row.customer_id, name: row.customer_name, phone: row.customer_phone, avatar_url: row.customer_avatar, email: row.customer_email }
      : null,
    seller: {
      id: row.seller_id,
      name: row.seller_name,
      slug: row.seller_slug,
      logo_url: row.seller_logo,
      rating: row.seller_rating,
      is_premium: !!row.seller_premium,
      phone: row.seller_phone,
      telegram: row.seller_telegram,
    },
    delivery_option: row.delivery_name
      ? { id: row.delivery_option_id, code: row.delivery_code, name_uz: row.delivery_name, name_ru: row.delivery_name_ru, name_en: row.delivery_name_en }
      : null,
  };
}

const SELECT_BOOKING = `
  SELECT b.*,
    (SELECT json_group_array(json_object('id', bi.id, 'product_id', bi.product_id, 'name', bi.name, 'image_url', bi.image_url,
      'price', bi.price, 'price_type', bi.price_type, 'quantity', bi.quantity, 'units', bi.units, 'subtotal', bi.subtotal))
     FROM booking_items bi WHERE bi.booking_id = b.id) AS items_json,
    u.name AS customer_name, u.phone AS customer_phone, u.email AS customer_email, u.avatar_url AS customer_avatar,
    s.business_name AS seller_name, s.slug AS seller_slug, s.logo_url AS seller_logo, s.rating AS seller_rating, s.is_premium AS seller_premium, s.phone AS seller_phone, s.telegram AS seller_telegram, s.user_id AS seller_user_id,
    d.code AS delivery_code, d.name_uz AS delivery_name, d.name_ru AS delivery_name_ru, d.name_en AS delivery_name_en
  FROM bookings b
  JOIN users u ON u.id = b.customer_id
  JOIN seller_profiles s ON s.id = b.seller_id
  LEFT JOIN delivery_options d ON d.id = b.delivery_option_id
`;

/** Price a single cart line given the price type. */
export function lineTotal(item, guests = 0) {
  const qty = Math.max(1, int(item.quantity, 1));
  const units = Math.max(1, Number(item.units) || 1);
  switch (item.price_type) {
    case 'person':
      return item.price * Math.max(1, guests || qty);
    case 'event':
    case 'set':
      return item.price * qty;
    case 'hour':
      return item.price * qty * units;
    default:
      return item.price * qty * units;
  }
}

const createSchema = z.object({
  items: z.array(z.object({ product_id: z.coerce.number().int().positive(), quantity: z.coerce.number().int().min(1).default(1), units: z.coerce.number().min(1).default(1) })).min(1, 'cart_empty'),
  event_date: z.string().trim().min(8).max(20).nullish(),
  end_date: z.string().trim().max(20).nullish(),
  event_type: z.string().trim().max(40).default('other'),
  city: z.string().trim().min(2).max(60),
  district: z.string().trim().max(80).nullish(),
  address: z.string().trim().max(300).nullish(),
  guests: z.coerce.number().int().min(0).max(100000).default(0),
  delivery_option_id: z.coerce.number().int().optional(),
  need_installation: z.union([z.boolean(), z.coerce.number()]).default(false),
  need_pickup: z.union([z.boolean(), z.coerce.number()]).default(false),
  distance_km: z.coerce.number().min(0).max(500).default(0),
  payment_method: z.enum(['cash', 'card', 'click', 'payme']).default('cash'),
  notes: z.string().trim().max(1000).nullish(),
  package_id: z.coerce.number().int().optional(),
});

/** POST /api/bookings — one order per seller, built from the cart */
router.post(
  '/',
  requireAuth,
  route(async (req, res) => {
    if (req.user.role !== 'customer' && req.user.role !== 'admin') denied('customers_only');
    const data = createSchema.parse(req.body);

    const products = data.items.map((item) => {
      const product = get('SELECT * FROM products WHERE id = ?', [item.product_id]);
      if (!product || !product.is_active || !product.is_approved) notFound('product_not_found');
      if (product.quantity < 1 || !product.available) bad('product_unavailable');
      if (item.quantity < (product.min_order || 1)) bad('below_min_order');
      if (data.event_date) {
        const blocked = get('SELECT id FROM availability WHERE product_id = ? AND date = ? AND status != ?', [product.id, data.event_date, 'available']);
        if (blocked) bad('date_unavailable');
      }
      return { ...product, ...item, price_type: product.price_type, price: product.price };
    });

    // Group the cart per seller so every vendor manages their own order.
    const bySeller = new Map();
    for (const item of products) {
      if (!bySeller.has(item.seller_id)) bySeller.set(item.seller_id, []);
      bySeller.get(item.seller_id).push(item);
    }

    const delivery = data.delivery_option_id
      ? get('SELECT * FROM delivery_options WHERE id = ?', [data.delivery_option_id])
      : get('SELECT * FROM delivery_options WHERE code = ?', ['standard']);
    const pickupOption = data.need_pickup ? get("SELECT * FROM delivery_options WHERE code = 'pickup'") : null;

    const created = [];

    transaction(() => {
      const sellerIds = [...bySeller.keys()];
      const perSellerDelivery = Math.round((delivery.base_fee + delivery.per_km_fee * data.distance_km) / Math.max(1, sellerIds.length));
      let perSellerInstall = data.need_installation ? Math.round(delivery.installation_fee / Math.max(1, sellerIds.length)) : 0;
      if (pickupOption) perSellerInstall += Math.round(pickupOption.base_fee / Math.max(1, sellerIds.length));

      for (const [sellerId, items] of bySeller.entries()) {
        const seller = get('SELECT * FROM seller_profiles WHERE id = ?', [sellerId]);
        const subtotal = items.reduce((sum, item) => sum + lineTotal(item, data.guests), 0);
        const serviceFee = Math.round(subtotal * SERVICE_FEE_RATE);
        const commission = Math.round(subtotal * (seller.commission_rate || COMMISSION_RATE));
        const total = subtotal + perSellerDelivery + perSellerInstall + serviceFee;

        const bookingId = insert('bookings', {
          code: 'TMP',
          customer_id: req.user.id,
          seller_id: sellerId,
          event_date: data.event_date || null,
          end_date: data.end_date || null,
          event_type: data.event_type,
          city: data.city,
          district: data.district || null,
          address: data.address || null,
          guests: data.guests,
          subtotal,
          delivery_fee: perSellerDelivery,
          installation_fee: perSellerInstall,
          service_fee: serviceFee,
          commission,
          total,
          status: 'yangi',
          delivery_option_id: delivery?.id || null,
          delivery_type: delivery?.code || 'standard',
          payment_method: data.payment_method,
          payment_status: 'pending',
          notes: data.notes || null,
          created_at: now(),
          updated_at: now(),
        });

        for (const item of items) {
          const image = get('SELECT url FROM product_images WHERE product_id = ? ORDER BY sort_order, id LIMIT 1', [item.product_id]);
          insert('booking_items', {
            booking_id: bookingId,
            product_id: item.product_id,
            name: item.name,
            image_url: image?.url || null,
            price: item.price,
            price_type: item.price_type,
            quantity: item.quantity,
            units: item.units || 1,
            subtotal: lineTotal(item, data.guests),
          });
        }

        run('UPDATE bookings SET code = ? WHERE id = ?', [makeBookingCode(bookingId), bookingId]);
        insert('payments', {
          booking_id: bookingId,
          user_id: req.user.id,
          seller_id: sellerId,
          amount: total,
          type: 'booking',
          method: data.payment_method,
          status: 'pending',
          reference: makeBookingCode(bookingId),
        });

        // Reserve the event date on every rented product.
        if (data.event_date) {
          for (const item of items) {
            run('INSERT OR REPLACE INTO availability (product_id, date, status, note) VALUES (?, ?, ?, ?)', [
              item.product_id,
              data.event_date,
              'booked',
              `booking-${bookingId}`,
            ]);
          }
        }

        notify(seller.user_id, 'new_booking', {
          title: { uz: 'Yangi buyurtma', ru: 'Новый заказ', en: 'New booking' },
          body: {
            uz: `${data.city} shahrida ${items.length} ta jihoz uchun yangi buyurtma.`,
            ru: `Новый заказ: ${items.length} позиций в городе ${data.city}.`,
            en: `New order with ${items.length} items in ${data.city}.`,
          },
        }, `/seller/orders`);

        created.push(bookingId);
      }

      if (data.package_id) {
        run("UPDATE event_packages SET status = 'converted' WHERE id = ? AND user_id = ?", [data.package_id, req.user.id]);
      }
    });

    const bookings = created.map((id) => serialize(get(`${SELECT_BOOKING} WHERE b.id = ?`, [id])));
    res.status(201).json({ bookings, total: bookings.reduce((sum, b) => sum + b.total, 0) });
  })
);

/** GET /api/bookings/seller — seller order management */
router.get(
  '/seller',
  requireAuth,
  route(async (req, res) => {
    const seller = get('SELECT * FROM seller_profiles WHERE user_id = ?', [req.user.id]);
    if (!seller && req.user.role !== 'admin') denied('seller_only');
    const status = req.query.status;
    const sellerId = req.query.seller_id ? int(req.query.seller_id) : seller?.id;
    if (!sellerId) bad('seller_required');
    const where = ['b.seller_id = ?'];
    const params = [sellerId];
    if (status && status !== 'all') {
      where.push('b.status = ?');
      params.push(status);
    }
    const rows = all(`${SELECT_BOOKING} WHERE ${where.join(' AND ')} ORDER BY b.id DESC LIMIT 200`, params);
    res.json({ items: rows.map(serialize) });
  })
);

/** GET /api/bookings/my — customer orders */
router.get(
  '/my',
  requireAuth,
  route(async (req, res) => {
    const status = req.query.status;
    const where = ['b.customer_id = ?'];
    const params = [req.user.id];
    if (status && status !== 'all') {
      where.push('b.status = ?');
      params.push(status);
    }
    const rows = all(`${SELECT_BOOKING} WHERE ${where.join(' AND ')} ORDER BY b.id DESC LIMIT 200`, params);
    res.json({ items: rows.map(serialize) });
  })
);

/** GET /api/bookings/:id */
router.get(
  '/:id',
  requireAuth,
  route(async (req, res) => {
    const booking = get(`${SELECT_BOOKING} WHERE b.id = ? OR b.code = ?`, [req.params.id, req.params.id]);
    if (!booking) notFound('booking_not_found');
    if (req.user.role !== 'admin' && booking.customer_id !== req.user.id && booking.seller_user_id !== req.user.id) {
      const seller = get('SELECT user_id FROM seller_profiles WHERE id = ?', [booking.seller_id]);
      if (!seller || seller.user_id !== req.user.id) denied('not_your_booking');
    }
    const timeline = all('SELECT * FROM payments WHERE booking_id = ? ORDER BY id DESC', [booking.id]);
    const review = get('SELECT id, rating FROM reviews WHERE booking_id = ?', [booking.id]);
    res.json({ ...serialize(booking), payments: timeline, review });
  })
);

const statusSchema = z.object({
  status: z.enum(['yangi', 'pending', 'confirmed', 'preparing', 'delivering', 'installing', 'ongoing', 'completed', 'cancelled']),
  cancel_reason: z.string().trim().max(500).optional(),
});

/** PATCH /api/bookings/:id/status — seller accepts/rejects and advances the pipeline */
router.patch(
  '/:id/status',
  requireAuth,
  route(async (req, res) => {
    const { status, cancel_reason } = statusSchema.parse(req.body);
    const booking = get('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
    if (!booking) notFound('booking_not_found');
    const seller = get('SELECT user_id FROM seller_profiles WHERE id = ?', [booking.seller_id]);
    const isOwnerSeller = seller?.user_id === req.user.id;
    const isCustomer = booking.customer_id === req.user.id;
    if (!isOwnerSeller && !isCustomer && req.user.role !== 'admin') denied('not_your_booking');
    if (isCustomer && !['cancelled'].includes(status)) denied('customer_can_only_cancel');
    if (isCustomer && !ACTIVE_STATUSES.includes(booking.status)) denied('cannot_cancel_now');

    update('bookings', booking.id, { status, cancel_reason: cancel_reason || null, updated_at: now() });

    if (status === 'completed') {
      transaction(() => {
        run('UPDATE seller_profiles SET completed_orders = completed_orders + 1, balance = balance + ?, total_earnings = total_earnings + ? WHERE id = ?', [
          booking.total - booking.commission,
          booking.total - booking.commission,
          booking.seller_id,
        ]);
        run("UPDATE payments SET status = 'paid' WHERE booking_id = ?", [booking.id]);
        run("UPDATE bookings SET payment_status = 'paid' WHERE id = ?", [booking.id]);
      });
    }

    if (status === 'cancelled') {
      // Free the reserved date again.
      run("DELETE FROM availability WHERE note = ? AND status = 'booked'", [`booking-${booking.id}`]);
      run("UPDATE payments SET status = 'refunded' WHERE booking_id = ?", [booking.id]);
    }

    const notifyBody = {
      cancelled: {
        uz: `${booking.code} raqamli buyurtma bekor qilindi.`,
        ru: `Заказ ${booking.code} отменён.`,
        en: `Booking ${booking.code} was cancelled.`,
      },
      confirmed: {
        uz: `${booking.code} raqamli buyurtma tasdiqlandi!`,
        ru: `Заказ ${booking.code} подтверждён!`,
        en: `Booking ${booking.code} has been confirmed!`,
      },
      completed: {
        uz: `${booking.code} buyurtmasi yakunlandi. Baho qoldiring!`,
        ru: `Заказ ${booking.code} завершён. Оставьте отзыв!`,
        en: `Booking ${booking.code} is complete. Leave a review!`,
      },
    }[status] || {
      uz: `${booking.code} buyurtmasi holati yangilandi.`,
      ru: `Статус заказа ${booking.code} обновлён.`,
      en: `Booking ${booking.code} status updated.`,
    };

    const targetId = isOwnerSeller ? booking.customer_id : seller?.user_id;
    if (targetId) {
      notify(targetId, 'booking_status', {
        title: { uz: 'Buyurtma holati', ru: 'Статус заказа', en: 'Booking status' },
        body: notifyBody,
      }, `/bookings/${booking.id}`);
    }

    res.json(serialize(get(`${SELECT_BOOKING} WHERE b.id = ?`, [booking.id])));
  })
);

/** POST /api/bookings/:id/pay — simulate a payment */
router.post(
  '/:id/pay',
  requireAuth,
  route(async (req, res) => {
    const booking = get('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
    if (!booking) notFound('booking_not_found');
    if (booking.customer_id !== req.user.id && req.user.role !== 'admin') denied('not_your_booking');
    const method = ['card', 'click', 'payme', 'cash'].includes(req.body?.method) ? req.body.method : booking.payment_method;
    transaction(() => {
      run("UPDATE bookings SET payment_status = 'paid', payment_method = ?, updated_at = ? WHERE id = ?", [method, now(), booking.id]);
      run("INSERT INTO payments (booking_id, user_id, seller_id, amount, type, method, status, reference) VALUES (?, ?, ?, ?, 'booking', ?, 'paid', ?)", [
        booking.id,
        booking.customer_id,
        booking.seller_id,
        booking.total,
        method,
        `pay-${booking.code}`,
      ]);
    });
    res.json(serialize(get(`${SELECT_BOOKING} WHERE b.id = ?`, [booking.id])));
  })
);

export default router;
