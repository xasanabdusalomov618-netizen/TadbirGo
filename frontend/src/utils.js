export function locName(item, lang) {
  if (!item) return '';
  if (lang === 'ru' && item.name_ru) return item.name_ru;
  if (lang === 'en' && item.name_en) return item.name_en;
  return item.name;
}

export function locCat(cat, lang) {
  if (!cat) return '';
  if (lang === 'ru') return cat.name_ru;
  if (lang === 'en') return cat.name_en;
  return cat.name_uz;
}

export function locDelivery(opt, lang) {
  if (!opt) return '';
  if (lang === 'ru') return opt.name_ru;
  if (lang === 'en') return opt.name_en;
  return opt.name_uz;
}

export const PRICE_TYPE_KEYS = {
  kun: 'common.perDay',
  soat: 'common.perHour',
  dona: 'common.perPiece',
  xizmat: 'common.perService',
  "to'plam": 'common.perSet',
  kishi: 'common.perGuest',
};

export const EVENT_TYPES = ['toy', 'yubiley', 'korporativ', 'tugilgan_kun', 'konferensiya'];

/** Cities for location pickers and the checkout map preview (lat, lon). */
export const CITIES = [
  { key: 'toshkent', name: 'Toshkent', lat: 41.2995, lon: 69.2401 },
  { key: 'samarqand', name: 'Samarqand', lat: 39.6542, lon: 66.9597 },
  { key: 'buxoro', name: 'Buxoro', lat: 39.7681, lon: 64.4556 },
  { key: 'andijon', name: 'Andijon', lat: 40.7821, lon: 72.3442 },
  { key: 'fargona', name: "Farg'ona", lat: 40.3894, lon: 71.7843 },
  { key: 'namangan', name: 'Namangan', lat: 40.9983, lon: 71.6726 },
  { key: 'xiva', name: 'Xiva', lat: 41.3783, lon: 60.3639 },
  { key: 'nukus', name: 'Nukus', lat: 42.4731, lon: 59.6103 },
];

/** Match free-text address to a known city (case/diacritics-insensitive). */
export function cityFromText(text = '') {
  const norm = String(text).toLowerCase().replace(/[‘’`ʻʼ']/g, '').replace(/ /g, '');
  return CITIES.find((c) => norm.includes(c.key)) || null;
}

export const STATUS_ORDER = [
  'yangi', 'kutmoqda', 'tasdiqlandi', 'tayyorlanmoqda',
  'yetkazilmoqda', 'ornatilmoqda', 'jarayonida', 'yakunlandi',
];

export const CATEGORY_GRADIENTS = {
  stollar: 'linear-gradient(135deg,#667eea,#764ba2)',
  chodirlar: 'linear-gradient(135deg,#f6d365,#fda085)',
  dekor: 'linear-gradient(135deg,#fbc2eb,#a6c1ee)',
  fotozona: 'linear-gradient(135deg,#fa709a,#fee140)',
  audio: 'linear-gradient(135deg,#30cfd0,#330867)',
  projektor: 'linear-gradient(135deg,#5ee7df,#b490ca)',
  yoruglik: 'linear-gradient(135deg,#fddb92,#d1fdff)',
  idish: 'linear-gradient(135deg,#a1c4fd,#c2e9fb)',
  dj: 'linear-gradient(135deg,#4facfe,#00f2fe)',
  fotograf: 'linear-gradient(135deg,#89f7fe,#66a6ff)',
  videograf: 'linear-gradient(135deg,#7f7fd5,#86a8e7)',
  boshlovchi: 'linear-gradient(135deg,#2563eb,#dc2626)',
  animator: 'linear-gradient(135deg,#ef4444,#f59e0b)',
  xizmatchi: 'linear-gradient(135deg,#0ea5e9,#2563eb)',
  catering: 'linear-gradient(135deg,#f9a826,#ff5e62)',
  joylar: 'linear-gradient(135deg,#c471f5,#fa71cd)',
  yetkazish: 'linear-gradient(135deg,#43e97b,#38f9d7)',
  ornatish: 'linear-gradient(135deg,#f77062,#fe5196)',
};

export function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function monthLabel(ym, lang) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  const locale = lang === 'uz' ? 'uz-UZ' : lang === 'ru' ? 'ru-RU' : 'en-GB';
  return d.toLocaleDateString(locale, { month: 'short', year: '2-digit' });
}
