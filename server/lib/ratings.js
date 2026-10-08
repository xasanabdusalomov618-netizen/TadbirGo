import { get, run } from '../db.js';

/** Recompute the cached rating/review counters on a product. */
export function refreshProductRating(productId) {
  if (!productId) return;
  const row = get('SELECT COUNT(*) AS c, AVG(rating) AS avg FROM reviews WHERE product_id = ?', [productId]);
  run('UPDATE products SET rating = ?, review_count = ? WHERE id = ?', [
    Number((row?.avg || 0).toFixed(2)),
    row?.c || 0,
    productId,
  ]);
}

/** Recompute the cached rating/review counters on a seller profile. */
export function refreshSellerRating(sellerId) {
  const row = get('SELECT COUNT(*) AS c, AVG(rating) AS avg FROM reviews WHERE seller_id = ?', [sellerId]);
  run('UPDATE seller_profiles SET rating = ?, review_count = ? WHERE id = ?', [
    Number((row?.avg || 0).toFixed(2)),
    row?.c || 0,
    sellerId,
  ]);
}
