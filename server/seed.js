/**
 * EventBox UZ — demo data seeder (Uzbekistan-focused realistic content).
 * Runs automatically on first boot and can be re-run with: npm run seed -- --force
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { db, all, get, insert, run, now } from './db.js';
import { hashPassword } from './lib/auth.js';
import { makeBookingCode, COMMISSION_RATE, SERVICE_FEE_RATE } from './lib/constants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRODUCT_MEDIA = path.join(__dirname, '..', 'public', 'media', 'products');
fs.mkdirSync(PRODUCT_MEDIA, { recursive: true });

/* ------------------------------------------------------------------ helpers */
function mulberry32(seed) {
  return function rand() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20241015);
const pick = (list) => list[Math.floor(rand() * list.length)];
const between = (min, max) => Math.floor(rand() * (max - min + 1)) + min;

function dateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/* ------------------------------------------------------- generated artwork */
const GLYPHS = {
  'stol-va-stullar':
    '<path d="M-34 -8h68v10h-68z"/><path d="M-28 2v32M28 2v32"/><path d="M-58 2h14v24h-14zM-58-16h14v18h-14z"/><path d="M44 2h14v24h-14zM44-16h14v18h-14z"/>',
  chodirlar:
    '<path d="M0-48 46 28H-46z"/><path d="M0-48v76"/><path d="M-18 28q18-30 36 0"/>',
  dekor:
    '<circle cx="-30" cy="8" r="17"/><circle cx="0" cy="-20" r="13"/><circle cx="30" cy="8" r="17"/><path d="M0-20v56"/><path d="M-52-34l6 8 8-6-6-8zM52-34l-6 8-8-6 6-8z"/>',
  fotozona:
    '<rect x="-40" y="-26" width="80" height="54" rx="12"/><circle cx="0" cy="1" r="15"/><path d="M-14-26l6-12h16l6 12"/><circle cx="22" cy="-14" r="3"/>',
  'kolonka-va-audio':
    '<rect x="-30" y="-42" width="60" height="84" rx="12"/><circle cx="0" cy="16" r="19"/><circle cx="0" cy="-24" r="8"/><path d="M-40 6h10M40 6H30"/>',
  projektor:
    '<rect x="-42" y="-16" width="74" height="38" rx="10"/><circle cx="26" cy="3" r="12"/><path d="M-42-8h-14v16h14"/><path d="M-30-30h20"/>',
  yoruglik:
    '<path d="M-28-36 26-2H-26z"/><path d="M-26-2h52"/><path d="M-14 12v14M0 12v20M14 12v14"/><circle cx="0" cy="-40" r="6"/>',
  'idish-tovoqlar':
    '<circle cx="0" cy="14" r="27"/><circle cx="0" cy="14" r="15"/><path d="M-48-30v34M-54-30v10a6 6 0 0 0 12 0v-10M48-30v34"/><path d="M44-30c8 6 8 16 0 22"/>',
  dj: '<circle cx="0" cy="0" r="36"/><circle cx="0" cy="0" r="10"/><path d="M28-42l6 0-4 26"/><path d="M-36 18h72"/>',
  fotograf:
    '<rect x="-42" y="-28" width="84" height="58" rx="12"/><circle cx="0" cy="1" r="17"/><circle cx="0" cy="1" r="7"/><path d="M-16-28l6-12h20l6 12"/>',
  videograf:
    '<rect x="-40" y="-26" width="66" height="52" rx="10"/><path d="M26-10l22-14v48l-22-14z"/><path d="M10-26v-8h20v8"/>',
  catering:
    '<path d="M-40 22a40 40 0 0 1 80 0z"/><rect x="-46" y="22" width="92" height="7" rx="3.5"/><circle cx="0" cy="36" r="5"/><path d="M-14-34h28v10h-28z"/>',
  'event-joylari':
    '<path d="M-46 30V-14l30-22 30 22v44z"/><path d="M-24 30V4h20v26"/><rect x="6" y="-20" width="14" height="14" rx="2"/><rect x="-8" y="-20" width="14" height="14" rx="2"/>',
  'yetkazib-berish':
    '<path d="M-42 20V-6h38v26z"/><path d="M-4 4h22l16 16v-20z"/><circle cx="-28" cy="24" r="9"/><circle cx="16" cy="24" r="9"/>',
  ornatish:
    '<path d="M-34 32l34-34 12 12-34 34z"/><circle cx="20" cy="-20" r="11"/><path d="M-40-20h16M-32-28v16"/>',
};

function makePoster(slug, accent, accent2, index) {
  const glyph = GLYPHS[slug] || '<circle cx="0" cy="0" r="30"/>';
  const [c1, c2] = index % 2 === 0 ? [accent, accent2] : [accent2, accent];
  const angle = 30 + index * 40;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600" role="img">
  <defs>
    <linearGradient id="g" gradientTransform="rotate(${angle})">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
    <radialGradient id="glow" cx="70%" cy="20%" r="70%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity=".45"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <pattern id="dots" width="26" height="26" patternUnits="userSpaceOnUse">
      <circle cx="3" cy="3" r="2.4" fill="#ffffff" fill-opacity=".16"/>
    </pattern>
  </defs>
  <rect width="800" height="600" fill="url(#g)"/>
  <rect width="800" height="600" fill="url(#dots)"/>
  <rect width="800" height="600" fill="url(#glow)"/>
  <circle cx="${index % 2 ? 120 : 690}" cy="${index % 2 ? 500 : 110}" r="200" fill="#ffffff" fill-opacity=".08"/>
  <circle cx="${index % 2 ? 640 : 150}" cy="${index % 2 ? 90 : 520}" r="120" fill="#000000" fill-opacity=".07"/>
  <g transform="translate(400 300) scale(3.1)" fill="none" stroke="#ffffff" stroke-opacity=".92"
     stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${glyph}</g>
</svg>`;
}

function productImages(slug, accent, accent2, fileBase, count = 3) {
  const urls = [];
  for (let i = 0; i < count; i += 1) {
    const file = `${fileBase}-${i + 1}.svg`;
    fs.writeFileSync(path.join(PRODUCT_MEDIA, file), makePoster(slug, accent, accent2, i));
    urls.push(`/media/products/${file}`);
  }
  return urls;
}

/* ------------------------------------------------------------------- data */
const CATEGORIES = [
  ['stol-va-stullar', 'Stol va stullar', 'Столы и стулья', 'Tables and chairs', 'Stol va stul', '#6366f1', '#8b5cf6', 1],
  ['chodirlar', 'Chodirlar', 'Шатры и тенты', 'Tents', 'Chodir', '#0ea5e9', '#22d3ee', 2],
  ['dekor', 'Dekor', 'Декор', 'Decoration', 'Sparkles', '#ec4899', '#f472b6', 3],
  ['fotozona', 'Fotozona', 'Фотозона', 'Photo zone', 'Camera', '#a855f7', '#c084fc', 4],
  ['kolonka-va-audio', 'Kolonka va audio', 'Колонки и аудио', 'Speakers and audio', 'Speaker', '#f59e0b', '#fbbf24', 5],
  ['projektor', 'Projektor', 'Проектор', 'Projector', 'Projector', '#14b8a6', '#2dd4bf', 6],
  ['yoruglik', 'Yorug‘lik', 'Освещение', 'Lighting', 'Lightbulb', '#f97316', '#fdba74', 7],
  ['idish-tovoqlar', 'Idish-tovoqlar', 'Посуда', 'Tableware', 'Utensils', '#22c55e', '#4ade80', 8],
  ['dj', 'DJ', 'DJ', 'DJ', 'Disc3', '#8b5cf6', '#a78bfa', 9],
  ['fotograf', 'Fotograf', 'Фотограф', 'Photographer', 'Camera', '#3b82f6', '#60a5fa', 10],
  ['videograf', 'Videograf', 'Видеограф', 'Videographer', 'Video', '#06b6d4', '#38bdf8', 11],
  ['catering', 'Catering', 'Кейтеринг', 'Catering', 'ChefHat', '#ef4444', '#fb923c', 12],
  ['event-joylari', 'Event joylari', 'Площадки для событий', 'Event venues', 'Building2', '#7c3aed', '#a78bfa', 13],
  ['yetkazib-berish', 'Yetkazib berish', 'Доставка', 'Delivery', 'Truck', '#64748b', '#94a3b8', 14],
  ['ornatish', 'O‘rnatish', 'Установка', 'Installation', 'Wrench', '#84cc16', '#a3e635', 15],
];

const SELLERS = [
  ['Toshkent Event Service', 'toshkent-event-service', 'Toshkent', 'Yunusobod', '2010 yildan beri 3000+ tadbir. To‘liq jihozlar bazasi.', '+998 90 123 45 67', '@toshevent', 1, 1],
  ['Samarqand Royal Decor', 'samarqand-royal-decor', 'Samarqand', 'Registon', 'Milliy uslubdagi premium dekor va gul arkalari.', '+998 91 234 56 78', '@samroyaldecor', 1, 0],
  ['Andijon Sound Group', 'andijon-sound-group', 'Andijon', 'Markaz', 'Professional audio, lazer shou va DJ xizmati.', '+998 93 345 67 89', '@andijonsound', 1, 0],
  ['Buxoro Textile Hall', 'buxoro-textile-hall', 'Buxoro', 'Poi-Kalyan', 'Idish-tovoq, dasturxon va milliy matolar ijarasi.', '+998 94 456 78 90', '@buxorotextile', 1, 0],
  ['Farg‘ona Media Studio', 'fargona-media-studio', "Farg'ona", 'Yoshlik', 'Fotograf, videograf va dron bilan suratga olish.', '+998 95 567 89 01', '@farganamedia', 1, 1],
  ['Chinoz Mebel Rent', 'chinoz-mebel-rent', 'Toshkent', 'Chilonzor', 'Banket stollari, stullar va bar mebellari ijarasi.', '+998 97 678 90 12', '@chinozrent', 1, 0],
  ['Zarafshan Catering', 'zarafshan-catering', 'Samarqand', 'Siyob', 'Milliy va Yevropa taomlari, 5000 tagacha mehmon.', '+998 98 789 01 23', '@zarafshancatering', 1, 0],
  ['Turon Light Show', 'turon-light-show', 'Toshkent', 'Mirzo Ulug‘bek', 'Sahna yorug‘ligi, LED ekran va proyektorlar.', '+998 99 890 12 34', '@turonlight', 1, 1],
  ['Namangan Party Rent', 'namangan-party-rent', 'Namangan', 'Davlatobod', 'Tug‘ilgan kun va bolalar bayramlari uchun to‘plamlar.', '+998 90 901 23 45', '@namanganparty', 1, 0],
  ['Xorazm Photo Studio', 'xorazm-photo-studio', 'Xorazm', 'Urganch', 'Fotozona, fotobudka va tezkor print xizmati.', '+998 91 012 34 56', '@xorazmphoto', 0, 0],
];

const DELIVERY = [
  ['standard', 'Standart yetkazib berish', 'Стандартная доставка', 'Standard delivery', 'Truck', 150000, 8000, 300000, 1, 24],
  ['express', 'Tezkor yetkazib berish', 'Экспресс-доставка', 'Express delivery', 'Zap', 250000, 12000, 400000, 2, 4],
  ['installation', 'O‘rnatish xizmati', 'Услуга установки', 'Installation service', 'Wrench', 200000, 6000, 600000, 1, 12],
  ['pickup', 'Tadbirdan keyin olib ketish', 'Самовывоз после события', 'Pickup after event', 'PackageCheck', 120000, 8000, 0, 1, 6],
];

/** name, category, price, price_type, qty, city, sellerIdx, unit_note, description */
const PRODUCTS = [
  ['Banket stoli (10 kishilik)', 'stol-va-stullar', 120000, 'day', 60, 'Toshkent', 6, '1 kun', 'Klassik banket stoli, oq dasturxon bilan. 10 kishiga mo‘ljallangan, yog‘och va metall konstruksiya.'],
  ['Yumshoq banket stuli', 'stol-va-stullar', 25000, 'day', 500, 'Toshkent', 1, '1 dona / kun', 'Qulay yumshoq stul, chexol bilan. To‘y va banketlar uchun eng ko‘p buyurtma qilinadigan model.'],
  ['Premium chivaroy stuli', 'stol-va-stullar', 45000, 'day', 200, 'Samarqand', 2, '1 dona / kun', 'Oltin rangli premium stul, baxmal qoplamali. VIP tadbirlar uchun.'],
  ['Bar stoli to‘plami (3 dona)', 'stol-va-stullar', 180000, 'day', 25, 'Namangan', 9, 'to‘plam / kun', 'Bar stoli + 3 ta bar stuli. Cherniy va oq rangda mavjud.'],
  ['Chodir 10x20 m (200 kishi)', 'chodirlar', 3500000, 'event', 6, 'Toshkent', 1, '1 tadbir', 'Katta banket chodiri, yon devorlari va pol bilan. 200 mehmon uchun qulay.'],
  ['Yozgi chodir 6x6 m', 'chodirlar', 1200000, 'event', 12, 'Buxoro', 4, '1 tadbir', 'Yengil yozgi chodir, quyosh va yomg‘irdan himoya qiladi.'],
  ['To‘y dekor to‘plami', 'dekor', 4500000, 'event', 5, 'Toshkent', 1, '1 tadbir', 'Kelin-kuyov stoli, gul arka, matolar va shamlar bilan to‘liq dekor.'],
  ['Gul arka (tirik gullar)', 'dekor', 1800000, 'event', 10, 'Samarqand', 2, '1 dona', 'Tabiiy gullardan yasalgan arka, rang tanlash imkoniyati bilan.'],
  ['Bolalar bayrami dekori', 'dekor', 1200000, 'event', 8, 'Buxoro', 9, '1 tadbir', 'Tug‘ilgan kun uchun rang-barang sharlar, banner va tematik bezaklar.'],
  ['Fotozona “Royal Gold”', 'fotozona', 2200000, 'event', 4, 'Toshkent', 1, '1 tadbir', 'Oltin rangli fotozona, fon paneli va dekor elementlari bilan.'],
  ['Neon fotozona', 'fotozona', 1500000, 'event', 6, 'Andijon', 3, '1 tadbir', 'Neon yozuvlar va LED fon. Kechki tadbirlar uchun ideal.'],
  ['Professional kolonka to‘plami', 'kolonka-va-audio', 1800000, 'day', 8, 'Toshkent', 8, '1 kun', '2 ta 15" kolonka, miksher pult va subwoofer. 300 kishilik zalga yetadi.'],
  ['Mikrofon to‘plami (4 dona)', 'kolonka-va-audio', 400000, 'day', 20, "Farg'ona", 5, '1 kun', 'Simsiz mikrofonlar, barcha qabul qiluvchilar bilan. Boshlovchi va qo‘shiqchilar uchun.'],
  ['Proyektor Epson 5000 lumen', 'projektor', 900000, 'day', 10, 'Toshkent', 8, '1 kun', 'Yorqin proyektor, ekran bilan birga. Taqdimot va to‘y videolari uchun.'],
  ['LED ekran 4x3 m', 'projektor', 5500000, 'day', 4, 'Samarqand', 8, '1 kun', 'Ichki va tashqi makon uchun modulli LED ekran, montaj bilan.'],
  ['Sahna yorug‘ligi (18 pribor)', 'yoruglik', 2600000, 'day', 5, 'Toshkent', 8, '1 kun', '18 ta bosh harakatlanuvchi pribor, pult va operator bilan.'],
  ['Lazer shou', 'yoruglik', 1900000, 'day', 3, 'Andijon', 3, '1 kun', 'Rangli lazer shou, musiqa bilan sinxron. Kechki tadbirlar uchun.'],
  ['Idish-tovoq to‘plami (100 kishi)', 'idish-tovoqlar', 900000, 'event', 15, 'Toshkent', 4, '100 kishi', 'Tarelka, bokal, vilka-pichoq va choynak to‘plami. To‘liq yuvilgan va qadoqlangan.'],
  ['Kristal bokal va posuda', 'idish-tovoqlar', 350000, 'event', 30, 'Buxoro', 4, '100 dona', 'Kristal bokallar va desert tarelkalari. VIP dasturxon uchun.'],
  ['DJ Alisher (to‘y to‘plami)', 'dj', 3500000, 'event', 2, 'Toshkent', 3, '1 tadbir', '6 soatlik DJ set, profesional pult va qo‘shimcha effektlar.'],
  ['DJ Nikita (corporate set)', 'dj', 2800000, 'event', 3, 'Namangan', 9, '1 tadbir', 'Korporativ tadbirlar uchun fon musiqasi va ochilish seti.'],
  ['Fotograf — premium paket', 'fotograf', 4000000, 'event', 4, 'Toshkent', 5, '1 tadbir', '10 soat suratga olish, 400+ ishlov berilgan kadr, albom va onlayn galereya.'],
  ['Fotograf — boshlang‘ich', 'fotograf', 1800000, 'event', 8, 'Xorazm', 10, '1 tadbir', '4 soat suratga olish, 150 ta kadr, onlayn galereya.'],
  ['Videograf — 4K to‘y klip', 'videograf', 5000000, 'event', 3, 'Samarqand', 5, '1 tadbir', 'Ikki kamerada 4K suratga olish, 5 daqiqalik klip va to‘liq video.'],
  ['Videograf + dron', 'videograf', 6500000, 'event', 2, "Farg'ona", 5, '1 tadbir', 'Yer va havodan suratga olish, montaj va musiqa bilan.'],
  ['Catering: milliy taomlar', 'catering', 120000, 'person', 500, 'Toshkent', 7, '1 kishi', 'Palov, somsa, shashlik, salatlar va shirinliklar. Ofitsiantlar bilan.'],
  ['Catering: Yevropa menyusi', 'catering', 185000, 'person', 300, 'Andijon', 7, '1 kishi', 'Kanape, furshet stoli, issiq taomlar va desert.'],
  ['Tadbir zali “Oq Saroy”', 'event-joylari', 12000000, 'event', 2, 'Toshkent', 1, '1 tadbir', '350 kishilik zali, sahna, garderob va avtoturargoh bilan.'],
  ['Yozgi bog‘ restorani (300 kishi)', 'event-joylari', 18000000, 'event', 1, "Farg'ona", 5, '1 tadbir', 'Ochiq havoda 300 mehmon uchun bog‘ hududi, chodirlar bilan.'],
  ['Yetkazib berish (shahar bo‘ylab)', 'yetkazib-berish', 300000, 'event', 30, 'Toshkent', 6, '1 tadbir', 'Barcha jihozlarni manzilga yetkazib berish, 3 soat ichida.'],
  ['Montaj va o‘rnatish xizmati', 'ornatish', 1500000, 'event', 20, 'Toshkent', 1, '1 tadbir', 'Chodir, sahna va jihozlarni professional montaj qilish.'],
  ['Yorug‘lik va ovoz montaji', 'ornatish', 900000, 'event', 15, 'Samarqand', 8, '1 tadbir', 'Sahna jihozlarini o‘rnatish, kabel ishlari va sozlash.'],
];

const REVIEW_TEXTS = [
  ['Juda sifatli va o‘z vaqtida yetkazib berildi. Tavsiya qilaman!', 'Очень качественно и вовремя. Рекомендую!', 'Great quality and delivered on time. Highly recommended!'],
  ['Hammasi ajoyib bo‘ldi, mehmonlar juda mamnun bo‘lishdi.', 'Всё было отлично, гости остались довольны.', 'Everything was great, our guests loved it.'],
  ['Jihozlar toza va yangi edi. Narx-sifat juda yaxshi.', 'Инвентарь чистый и новый. Цена — качество отличное.', 'Clean and new equipment, excellent value.'],
  ['Operator juda professional, barcha so‘rovlarga tez javob berishdi.', 'Очень профессионално, быстро отвечали на все вопросы.', 'Very professional, quick to answer every request.'],
  ['Biroz kechikish bo‘ldi, lekin natija zo‘r chiqdi.', 'Была небольшая задержка, но результат отличный.', 'Slight delay, but the result was excellent.'],
];

/* ------------------------------------------------------------------- seed */
export function seed({ force = false } = {}) {
  if (force) {
    for (const table of [
      'notifications', 'reviews', 'payments', 'booking_items', 'bookings', 'package_items', 'event_packages',
      'availability', 'product_images', 'products', 'seller_profiles', 'users', 'categories',
      'delivery_options', 'subscriptions', 'advertisements',
    ]) {
      db.exec(`DELETE FROM ${table}`);
    }
    db.exec("DELETE FROM sqlite_sequence");
  }

  if (get('SELECT COUNT(*) AS c FROM users').c > 0 && !force) return;

  // ---- categories
  const categoryIds = {};
  for (const [slug, uz, ru, en, icon, accent, accent2, order] of CATEGORIES) {
    categoryIds[slug] = insert('categories', {
      slug,
      name_uz: uz,
      name_ru: ru,
      name_en: en,
      description_uz: `${uz} — tadbir uchun ijaraga olish`,
      description_ru: `${ru} — аренда для мероприятий`,
      description_en: `${en} — rent for your event`,
      icon,
      accent,
      sort_order: order,
    });
    // keep a second accent for the generated artwork
    db.exec('CREATE TABLE IF NOT EXISTS category_art (slug TEXT PRIMARY KEY, accent2 TEXT)');
    run('INSERT OR REPLACE INTO category_art (slug, accent2) VALUES (?, ?)', [slug, accent2]);
  }

  // ---- delivery options
  for (const [code, uz, ru, en, icon, base, perKm, install, mult, eta] of DELIVERY) {
    insert('delivery_options', {
      code,
      name_uz: uz,
      name_ru: ru,
      name_en: en,
      description_uz: uz,
      description_ru: ru,
      description_en: en,
      icon,
      base_fee: base,
      per_km_fee: perKm,
      installation_fee: install,
      express_multiplier: mult,
      eta_hours: eta,
      sort_order: DELIVERY.findIndex((d) => d[0] === code),
    });
  }

  // ---- users + sellers
  const sellerIds = [];
  SELLERS.forEach((seller, index) => {
    const [business, slug, city, district, description, phone, telegram, approved, premium] = seller;
    const email = index === 0 ? 'seller@eventbox.uz' : `seller${index + 1}@eventbox.uz`;
    const userId = insert('users', {
      name: business,
      email,
      phone,
      password_hash: hashPassword('seller123'),
      role: 'seller',
      city,
      avatar_url: `/media/products/logo-${index + 1}.svg`,
      created_at: now(),
    });
    fs.writeFileSync(
      path.join(PRODUCT_MEDIA, `logo-${index + 1}.svg`),
      makePoster('event-joylari', CATEGORIES[index % CATEGORIES.length][5], CATEGORIES[(index + 3) % CATEGORIES.length][5], index)
    );
    sellerIds.push(
      insert('seller_profiles', {
        user_id: userId,
        business_name: business,
        slug,
        description,
        city,
        district,
        address: `${district} tumani, ${index + 12}-uy`,
        phone,
        telegram,
        logo_url: `/media/products/logo-${index + 1}.svg`,
        is_approved: approved,
        is_premium: premium,
        premium_until: premium ? dateOffset(21) : null,
        commission_rate: premium ? 0.08 : COMMISSION_RATE,
        response_hours: between(1, 5),
        created_at: now(),
      })
    );
  });

  const adminId = insert('users', {
    name: 'EventBox Admin',
    email: 'admin@eventbox.uz',
    phone: '+998 71 200 00 00',
    password_hash: hashPassword('admin123'),
    role: 'admin',
    city: 'Toshkent',
    created_at: now(),
  });

  const customerId = insert('users', {
    name: 'Dilnoza Karimova',
    email: 'customer@eventbox.uz',
    phone: '+998 90 111 22 33',
    password_hash: hashPassword('customer123'),
    role: 'customer',
    city: 'Toshkent',
    created_at: now(),
  });

  // extra customers
  const extraCustomers = [];
  for (let i = 1; i <= 6; i += 1) {
    extraCustomers.push(
      insert('users', {
        name: pick(['Sardor Rahimov', 'Malika Yusupova', 'Javohir Toshmatov', 'Nilufar Azimova', 'Bobur Saidov', 'Zarina Nazarova', 'Otabek Mirzayev', 'Sevara Ismoilova']),
        email: `mijoz${i}@eventbox.uz`,
        phone: `+998 9${between(0, 9)} ${between(100, 999)} ${between(10, 99)} ${between(10, 99)}`,
        password_hash: hashPassword('customer123'),
        role: 'customer',
        city: pick(['Toshkent', 'Samarqand', 'Andijon', 'Buxoro', "Farg'ona", 'Namangan']),
        created_at: now(),
      })
    );
  }

  // ---- products
  const productRows = [];
  PRODUCTS.forEach((row, index) => {
    const [name, categorySlug, price, priceType, qty, city, sellerIdx, unitNote, description] = row;
    const category = CATEGORIES.find((c) => c[0] === categorySlug);
    const accent = category[5];
    const accent2 = category[6];
    const fileBase = `p${String(index + 1).padStart(2, '0')}`;
    const images = productImages(categorySlug, accent, accent2, fileBase, 3);
    const sellerId = sellerIds[(sellerIdx - 1) % sellerIds.length];
    const district = SELLERS[(sellerIdx - 1) % SELLERS.length][3];

    const productId = insert('products', {
      seller_id: sellerId,
      category_id: categoryIds[categorySlug],
      name,
      description,
      price,
      price_type: priceType,
      deposit: priceType === 'event' ? Math.round(price * 0.1) : 0,
      city,
      district,
      address: `${district} tumani`,
      quantity: qty,
      available: 1,
      featured: index % 5 === 0 ? 1 : 0,
      featured_until: index % 5 === 0 ? dateOffset(30) : null,
      min_order: priceType === 'person' ? 20 : 1,
      unit_note: unitNote,
      views: between(40, 900),
      created_at: now(),
      updated_at: now(),
    });
    images.forEach((url, i) => insert('product_images', { product_id: productId, url, is_primary: i === 0 ? 1 : 0, sort_order: i }));
    productRows.push({ id: productId, name, price, priceType, sellerId, categorySlug, city });
  });

  // availability: block a few upcoming dates on some products
  for (const product of productRows) {
    if (rand() < 0.45) {
      const days = between(2, 40);
      run('INSERT OR IGNORE INTO availability (product_id, date, status, note) VALUES (?, ?, ?, ?)', [
        product.id,
        dateOffset(days),
        'blocked',
        'Band qilingan',
      ]);
    }
    if (rand() < 0.25) {
      run('INSERT OR IGNORE INTO availability (product_id, date, status, note) VALUES (?, ?, ?, ?)', [
        product.id,
        dateOffset(between(5, 30)),
        'booked',
        'Boshqa tadbir',
      ]);
    }
  }

  // ---- bookings across the whole lifecycle
  const eventTypes = ['wedding', 'birthday', 'corporate', 'conference', 'graduation'];
  const statuses = ['yangi', 'pending', 'confirmed', 'preparing', 'delivering', 'ongoing', 'completed', 'completed', 'completed', 'cancelled'];
  const bookingCustomers = [customerId, ...extraCustomers];

  statuses.forEach((status, index) => {
    const sellerId = productRows[between(0, productRows.length - 1)].sellerId;
    const sellerProducts = productRows.filter((p) => p.sellerId === sellerId).slice(0, between(2, 4));
    if (!sellerProducts.length) return;
    const guests = pick([80, 120, 150, 200, 250, 300]);
    const items = sellerProducts.map((p) => {
      const quantity = p.priceType === 'person' ? guests : p.priceType === 'event' ? 1 : Math.max(1, Math.round(guests / 10));
      const subtotal = p.priceType === 'person' ? p.price * guests : p.priceType === 'event' ? p.price * quantity : p.price * quantity;
      return { ...p, quantity, subtotal };
    });
    const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
    const deliveryFee = between(1, 3) * 50000;
    const installFee = rand() < 0.5 ? between(200000, 600000) : 0;
    const serviceFee = Math.round(subtotal * SERVICE_FEE_RATE);
    const seller = get('SELECT commission_rate FROM seller_profiles WHERE id = ?', [sellerId]);
    const commission = Math.round(subtotal * (seller.commission_rate || COMMISSION_RATE));
    const total = subtotal + deliveryFee + installFee + serviceFee;
    const eventDate = dateOffset(index < 4 ? between(-40, -5) : between(6, 60));
    const customer = bookingCustomers[index % bookingCustomers.length];
    const deliveryId = get('SELECT id FROM delivery_options ORDER BY sort_order LIMIT 1').id;

    const bookingId = insert('bookings', {
      code: 'TMP',
      customer_id: customer,
      seller_id: sellerId,
      event_date: eventDate,
      end_date: eventDate,
      event_type: eventTypes[index % eventTypes.length],
      city: sellerProducts[0].city,
      district: 'Markaz',
      address: `Tadbir manzili #${index + 1}`,
      guests,
      subtotal,
      delivery_fee: deliveryFee,
      installation_fee: installFee,
      service_fee: serviceFee,
      commission,
      total,
      status,
      delivery_option_id: deliveryId,
      delivery_type: 'standard',
      payment_method: pick(['cash', 'card', 'click', 'payme']),
      payment_status: status === 'completed' ? 'paid' : status === 'cancelled' ? 'refunded' : 'pending',
      notes: '',
      created_at: now(),
      updated_at: now(),
    });
    run('UPDATE bookings SET code = ? WHERE id = ?', [makeBookingCode(bookingId), bookingId]);

    for (const item of items) {
      const image = get('SELECT url FROM product_images WHERE product_id = ? ORDER BY id LIMIT 1', [item.id]);
      insert('booking_items', {
        booking_id: bookingId,
        product_id: item.id,
        name: item.name,
        image_url: image?.url,
        price: item.price,
        price_type: item.priceType,
        quantity: item.quantity,
        units: 1,
        subtotal: item.subtotal,
      });
    }

    insert('payments', {
      booking_id: bookingId,
      user_id: customer,
      seller_id: sellerId,
      amount: total,
      type: 'booking',
      method: 'card',
      status: status === 'completed' ? 'paid' : status === 'cancelled' ? 'refunded' : 'pending',
      reference: `pay-${bookingId}`,
      created_at: now(),
    });

    if (status === 'completed') {
      run('UPDATE seller_profiles SET completed_orders = completed_orders + 1, total_earnings = total_earnings + ?, balance = balance + ? WHERE id = ?', [
        total - commission,
        total - commission,
        sellerId,
      ]);
      const item = items[0];
      const rating = between(4, 5);
      const text = REVIEW_TEXTS[between(0, REVIEW_TEXTS.length - 1)];
      insert('reviews', {
        booking_id: bookingId,
        customer_id: customer,
        seller_id: sellerId,
        product_id: item.id,
        rating,
        comment: text[0],
        seller_reply: rand() < 0.5 ? 'Rahmat! Yana tadbirlaringizda xizmatdamiz.' : null,
        created_at: now(),
      });
    }
  });

  // refresh cached ratings
  for (const p of all('SELECT id FROM products')) {
    const row = get('SELECT COUNT(*) AS c, AVG(rating) AS a FROM reviews WHERE product_id = ?', [p.id]);
    run('UPDATE products SET rating = ?, review_count = ? WHERE id = ?', [Number((row.a || 0).toFixed(2)), row.c, p.id]);
  }
  for (const s of all('SELECT id FROM seller_profiles')) {
    const row = get('SELECT COUNT(*) AS c, AVG(rating) AS a FROM reviews WHERE seller_id = ?', [s.id]);
    run('UPDATE seller_profiles SET rating = ?, review_count = ? WHERE id = ?', [Number((row.a || 0).toFixed(2)), row.c, s.id]);
  }

  // ---- a saved demo package
  const packageId = insert('event_packages', {
    user_id: customerId,
    name: 'To‘y bazmi — 200 mehmon',
    event_type: 'wedding',
    guests: 200,
    event_date: dateOffset(35),
    city: 'Toshkent',
    budget: 45000000,
    items_count: 6,
    estimate_total: 38400000,
    status: 'draft',
    created_at: now(),
  });
  for (const slug of ['stol-va-stullar', 'stol-va-stullar', 'chodirlar', 'dekor', 'kolonka-va-audio', 'fotograf']) {
    const product = all('SELECT p.id FROM products p JOIN categories c ON c.id = p.category_id WHERE c.slug = ? LIMIT 1 OFFSET ?', [
      slug,
      slug === 'stol-va-stullar' ? 1 : 0,
    ])[0];
    if (product) insert('package_items', { package_id: packageId, product_id: product.id, quantity: slug === 'stol-va-stullar' ? 20 : 1 });
  }

  // ---- notifications
  const notifyPayloads = [
    ['booking_status', { uz: 'Buyurtma tasdiqlandi', ru: 'Заказ подтверждён', en: 'Booking confirmed' }, { uz: 'Sotuvchi buyurtmangizni tasdiqladi.', ru: 'Продавец подтвердил ваш заказ.', en: 'The seller confirmed your booking.' }, '/bookings/1'],
    ['new_booking', { uz: 'Yangi buyurtma', ru: 'Новый заказ', en: 'New booking' }, { uz: 'Toshkent shahrida 3 ta jihoz uchun buyurtma.', ru: 'Новый заказ: 3 позиции в Ташкенте.', en: 'New order with 3 items in Tashkent.' }, '/seller/orders'],
    ['system', { uz: 'Xush kelibsiz!', ru: 'Добро пожаловать!', en: 'Welcome!' }, { uz: 'EventBox UZ da profilingiz tayyor.', ru: 'Ваш профиль в EventBox UZ готов.', en: 'Your EventBox UZ profile is ready.' }, '/profile'],
  ];
  notifyPayloads.forEach((payload, i) => {
    insert('notifications', {
      user_id: i === 1 ? get('SELECT user_id FROM seller_profiles LIMIT 1').user_id : customerId,
      type: payload[0],
      payload: JSON.stringify({ title: payload[1], body: payload[2] }),
      link: payload[3],
      is_read: i === 2 ? 1 : 0,
      created_at: now(),
    });
  });

  // ---- advertising slots
  insert('advertisements', {
    seller_id: sellerIds[0],
    title: 'Bahorgi chegirma — 20%',
    image_url: '/media/products/p07-1.svg',
    link: '/products/7',
    placement: 'home',
    budget: 2500000,
    impressions: 12480,
    clicks: 342,
    is_active: 1,
    created_at: now(),
  });
  insert('advertisements', {
    seller_id: sellerIds[4],
    title: '4K video — bepul dron',
    image_url: '/media/products/p24-1.svg',
    link: '/products/24',
    placement: 'home',
    budget: 1800000,
    impressions: 8210,
    clicks: 211,
    is_active: 1,
    created_at: now(),
  });
  insert('advertisements', {
    seller_id: sellerIds[7],
    title: 'LED ekran ijarasi',
    image_url: '/media/products/p15-1.svg',
    link: '/products/15',
    placement: 'explore',
    budget: 3200000,
    impressions: 15300,
    clicks: 508,
    is_active: 1,
    created_at: now(),
  });

  // premium ledger entries
  for (const sellerId of sellerIds.slice(0, 3)) {
    insert('payments', {
      seller_id: sellerId,
      user_id: get('SELECT user_id FROM seller_profiles WHERE id = ?', [sellerId]).user_id,
      amount: between(149000, 299000),
      type: pick(['subscription', 'featured', 'advertising']),
      method: 'card',
      status: 'paid',
      reference: 'seed-monetisation',
      created_at: now(),
    });
  }

  console.log('[seed] demo data created');
}

export function seedIfEmpty() {
  const count = get('SELECT COUNT(*) AS c FROM users').c;
  if (count === 0) seed();
}

const isDirect = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirect) {
  seed({ force: process.argv.includes('--force') });
  console.log('[seed] done');
  process.exit(0);
}
