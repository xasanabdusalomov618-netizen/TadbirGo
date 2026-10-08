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
  xizmat: 'common.perService',
  "to'plam": 'common.perSet',
  kishi: 'common.perGuest',
};

export const EVENT_TYPES = ['toy', 'tugilgan_kun', 'korporativ', 'bitiruv', 'boshqa'];

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
  videogaf: 'linear-gradient(135deg,#7f7fd5,#86a8e7)',
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
