/** Formatting helpers: UZS money, dates, numbers and localised category names. */

export function money(value, opts = {}) {
  const n = Math.round(Number(value) || 0);
  if (opts.compact && Math.abs(n) >= 1000000) {
    const millions = n / 1000000;
    return `${millions.toFixed(millions >= 10 ? 0 : 1).replace('.', ',')} mln so'm`;
  }
  if (opts.compact && Math.abs(n) >= 1000) {
    return `${Math.round(n / 1000)} ming so'm`;
  }
  return `${new Intl.NumberFormat('ru-RU').format(n).replace(/ /g, ' ')} so'm`;
}

export function num(value) {
  return new Intl.NumberFormat('ru-RU').format(Math.round(Number(value) || 0)).replace(/ /g, ' ');
}

export function compactNumber(value) {
  const n = Math.round(Number(value) || 0);
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace('.', ',')} mln`;
  if (n >= 1000) return `${Math.round(n / 1000)} ming`;
  return String(n);
}

export function priceUnit(priceType, t) {
  const map = {
    hour: t('common.perHour'),
    day: t('common.perDay'),
    event: t('common.perEvent'),
    person: t('common.perPerson'),
    set: t('common.perSet'),
  };
  return map[priceType] || t('common.perDay');
}

export function formatDate(value, lang = 'uz', opts = {}) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const locale = { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-GB' }[lang] || 'uz-UZ';
  return date.toLocaleDateString(locale, {
    day: 'numeric',
    month: opts.short ? 'short' : 'long',
    year: opts.year === false ? undefined : 'numeric',
  });
}

export function formatDateTime(value, lang = 'uz') {
  if (!value) return '—';
  const date = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return String(value);
  return formatDate(date, lang, { short: true });
}

export function timeAgo(value, lang = 'uz') {
  if (!value) return '';
  const date = new Date(String(value).replace(' ', 'T'));
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const dict = {
    uz: { now: 'hozir', m: 'daqiqa oldin', h: 'soat oldin', d: 'kun oldin' },
    ru: { now: 'только что', m: 'мин назад', h: 'ч назад', d: 'дн назад' },
    en: { now: 'just now', m: 'min ago', h: 'h ago', d: 'd ago' },
  }[lang] || {};
  if (seconds < 60) return dict.now || '';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} ${dict.m || ''}`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} ${dict.h || ''}`;
  return `${Math.floor(seconds / 86400)} ${dict.d || ''}`;
}

/** Picks the localised field from an object carrying name_uz / name_ru / name_en. */
export function localize(row, field, lang = 'uz') {
  if (!row) return '';
  return row[`${field}_${lang}`] || row[`${field}_uz`] || row[field] || '';
}

export function localizePayload(payload, lang = 'uz') {
  if (!payload) return { title: '', body: '' };
  return {
    title: payload.title?.[lang] || payload.title?.uz || '',
    body: payload.body?.[lang] || payload.body?.uz || '',
  };
}

export function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function monthLabel(month, lang = 'uz') {
  const [year, m] = month.split('-');
  const date = new Date(Number(year), Number(m) - 1, 1);
  const locale = { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-GB' }[lang] || 'uz-UZ';
  return date.toLocaleDateString(locale, { month: 'short' });
}
