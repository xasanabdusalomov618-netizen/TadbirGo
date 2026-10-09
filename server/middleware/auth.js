import { get } from '../db.js';
import { COOKIE_NAME, readToken } from '../lib/auth.js';

function tokenFrom(req) {
  if (req.cookies?.[COOKIE_NAME]) return req.cookies[COOKIE_NAME];
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return null;
}

/** Attaches req.user (without password hash) when a valid token is present. */
export function optionalAuth(req, _res, next) {
  const token = tokenFrom(req);
  const payload = token ? readToken(token) : null;
  if (payload?.sub) {
    const user = get('SELECT id, name, email, phone, role, avatar_url, city, language, theme, is_blocked, created_at FROM users WHERE id = ?', [payload.sub]);
    if (user && !user.is_blocked) {
      user.is_blocked = !!user.is_blocked;
      req.user = user;
    }
  }
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'auth_required' });
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'auth_required' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'forbidden' });
    next();
  };
}

/** Resolves the seller profile that belongs to the current user. */
export function requireSeller(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'auth_required' });
  if (req.user.role === 'admin') return next();
  if (req.user.role !== 'seller') return res.status(403).json({ error: 'seller_only' });
  const seller = get('SELECT * FROM seller_profiles WHERE user_id = ?', [req.user.id]);
  if (!seller) return res.status(403).json({ error: 'no_seller_profile' });
  req.seller = seller;
  next();
}
