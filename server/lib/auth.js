import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'eventbox-uz-dev-secret-please-change-in-production';
const TOKEN_TTL = '30d';
export const COOKIE_NAME = 'eb_token';

export function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, v: user.token_version || 0 }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export function readToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/** Cookie flags: httpOnly + SameSite=Lax, Secure when served over HTTPS (the live preview is). */
export function cookieOptions(req) {
  const secure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  };
}
