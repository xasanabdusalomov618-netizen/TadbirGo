/** Shared server-side constants (booking lifecycle, pricing rules, locations). */

/** Booking lifecycle — order matters, it drives the seller pipeline UI. */
export const BOOKING_STATUSES = [
  'yangi',
  'pending',
  'confirmed',
  'preparing',
  'delivering',
  'installing',
  'ongoing',
  'completed',
  'cancelled',
];

export const ACTIVE_STATUSES = ['yangi', 'pending', 'confirmed', 'preparing', 'delivering', 'installing', 'ongoing'];

/** Next step offered to a seller for each status. */
export const NEXT_STATUS = {
  yangi: 'confirmed',
  confirmed: 'preparing',
  preparing: 'delivering',
  delivering: 'installing',
  installing: 'ongoing',
  ongoing: 'completed',
};

export const PRICE_TYPES = ['hour', 'day', 'event', 'person', 'set'];

export const CITIES = ['Toshkent', 'Samarqand', 'Andijon', 'Buxoro', "Farg'ona", 'Namangan', 'Xorazm', 'Qarshi', 'Nukus', 'Jizzax'];

export const EVENT_TYPES = ['wedding', 'birthday', 'corporate', 'conference', 'graduation', 'other'];

/** Marketplace monetisation defaults. */
export const COMMISSION_RATE = 0.12; // 12% marketplace commission
export const SERVICE_FEE_RATE = 0.03; // 3% buyer service fee
export const PREMIUM_PRICE = 299000; // Premium seller subscription / month (UZS)
export const FEATURED_PRICE = 149000; // Featured listing / month (UZS)
export const BOOKING_CODE_PREFIX = 'EB';

export function makeBookingCode(id) {
  return `${BOOKING_CODE_PREFIX}-${String(Date.now()).slice(-5)}${String(id).padStart(3, '0')}`;
}
