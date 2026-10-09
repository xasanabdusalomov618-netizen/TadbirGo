/** Tiny fetch wrapper for the EventBox API (cookies are sent automatically). */
const BASE = '/api';

async function request(method, path, body, options = {}) {
  const init = { method, credentials: 'same-origin', headers: {} };
  if (body !== undefined && !(body instanceof FormData)) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  } else if (body instanceof FormData) {
    init.body = body;
  }

  const res = await fetch(BASE + path, init);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: 'server_error', raw: text };
  }

  if (!res.ok) {
    const error = new Error(data?.error || 'request_failed');
    error.status = res.status;
    error.details = data?.fields || data?.details;
    error.payload = data;
    throw error;
  }
  return data;
}

export const api = {
  get: (path, options) => request('GET', path, undefined, options),
  post: (path, body, options) => request('POST', path, body ?? {}, options),
  put: (path, body) => request('PUT', path, body ?? {}),
  patch: (path, body) => request('PATCH', path, body ?? {}),
  del: (path) => request('DELETE', path),

  upload: async (files) => {
    const form = new FormData();
    files.forEach((file) => form.append('images', file));
    return request('POST', '/upload', form);
  },
};

/** Translates an API error code into a human message using the active locale. */
export function errorMessage(error, t) {
  const map = {
    invalid_credentials: t('auth.wrongPassword', 'Email yoki parol noto‘g‘ri'),
    email_taken: t('errors.emailTaken', 'Bu email allaqachon ro‘yxatdan o‘tgan'),
    auth_required: t('errors.loginRequiredText'),
    forbidden: t('errors.forbiddenText'),
    seller_only: t('errors.sellerOnlyText'),
    not_your_booking: t('errors.forbiddenText'),
    date_unavailable: t('product.notAvailableOnDate'),
    product_unavailable: t('common.unavailable'),
    below_min_order: t('product.minOrder'),
    cart_empty: t('cart.empty'),
    review_only_after_completion: t('bookings.review'),
    already_reviewed: t('bookings.reviewDone'),
    validation_error: t('auth.requiredFields'),
    server_error: t('errors.serverError'),
    file_too_large: t('errors.serverError'),
    unsupported_file_type: t('errors.serverError'),
  };
  if (error?.details && typeof error.details === 'object') {
    const first = Object.values(error.details)[0];
    if (typeof first === 'string') return map[first] || first;
  }
  return map[error?.message] || t('errors.somethingWrong');
}
