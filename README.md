# EventBox UZ

**Tadbiringizni 10 daqiqada yig‘ing** — to‘y, tug‘ilgan kun, korporativ va boshqa tadbirlar uchun
jihoz va xizmatlar marketpleysi. O‘zbekiston bo‘ylab: Toshkent, Samarqand, Andijon, Buxoro, Farg‘ona,
Namangan, Xorazm.

A full-stack, production-ready marketplace: real authentication, a relational database, CRUD for every
entity, a package builder, availability calendar, cart → checkout → booking lifecycle, seller and admin
dashboards with analytics, monetisation, dark mode and a 3-language interface (O‘zbek / Русский / English)
in a **Soft UI (neumorphic)** design system.

---

## ✨ Asosiy imkoniyatlar / Key features

### Mijoz (Customer)
- Ro‘yxatdan o‘tish va kirish (JWT, httpOnly cookie)
- Qidirish + filtrlash: kategoriya, shahar, narx oralig‘i, sana bo‘yicha mavjudlik
- E’lon sahifasi: galereya, sotuvchi, sharhlar, sana tekshiruvi, miqdor hisob-kitobi
- **Paket konstruktori** — mehmonlar soni, sana, shahar va byudjet bo‘yicha to‘liq tadbir paketi
- Savat, yetkazib berish (standart / tezkor), o‘rnatish, tadbirdan keyin olib ketish
- Buyurtma berish va 9 bosqichli holat (status) kuzatuvi
- Tugallangan buyurtma uchun baho va sharh

### Sotuvchi (Seller)
- E’lon yaratish: nomi, tavsif, narx turi (soat/kun/tadbir/kishi/to‘plam), shahar, miqdor, zakalat
- Rasm yuklash (multipart upload, 8 tagacha), band sanalar (availability calendar)
- Buyurtmalarni qabul qilish / rad etish / keyingi bosqichga o‘tkazish
- Daromadlar: oylik grafik, balans, komissiya, pul yechish (payout)
- **Premium** obuna (komissiya 12% → 8%, ustuvor ko‘rsatish) va **TOP** (featured) e’lon

### Admin
- Platforma statistikasi: foydalanuvchilar, sotuvchilar, e’lonlar, buyurtmalar, aylanma, komissiya
- Oylik tushum grafigi, holatlar bo‘yicha taqsimot, top kategoriyalar va sotuvchilar
- Foydalanuvchilarni boshqarish (rol, bloklash), sotuvchi va e’lonlarni tasdiqlash, e’lonni o‘chirish
- Reklama slotlari va moliyaviy hisobot (ledger)

### Monetizatsiya
| Manba | Tavsif |
|---|---|
| Komissiya | 10–20% (standart 12%, Premium 8%) |
| Premium obuna | 299 000 so‘m / oy |
| TOP e’lon | 149 000 so‘m / 30 kun |
| Yetkazib berish | masofaga qarab (baza + km) |
| O‘rnatish | qo‘shimcha xizmat |
| Reklama | banner slotlari (home / explore / sidebar) |

---

## 🛠 Texnologiyalar / Stack

| Qatlam | Texnologiya |
|---|---|
| Frontend | React 18, Vite 5, React Router 6, Tailwind CSS 3, Recharts, Lucide icons, react-i18next |
| Backend | Node.js 22 (ESM), Express 4, Zod validation, Multer (uploads), JWT + bcryptjs |
| Database | SQLite through Node's built-in `node:sqlite` (zero native compilation) — 16 relational tables |
| Design | Custom Soft UI (neumorphic) design tokens, light + dark themes, 3 languages |

---

## 🚀 Ishga tushirish / Getting started

```bash
npm install     # install dependencies
npm run dev     # API on :4000 + Vite dev server on :5173 (proxied /api and /media)
npm run seed    # rebuild demo data (add -- --force to wipe & reseed)
npm run build   # production bundle
npm start       # serve the built app + API from Express (port 4000)
```

Open <http://localhost:5173> — the Vite dev server proxies `/api` and `/media` to the Express API,
so authentication cookies work on a single origin.

### Demo accounts

| Rol | Email | Parol |
|---|---|---|
| Admin | `admin@eventbox.uz` | `admin123` |
| Sotuvchi | `seller@eventbox.uz` | `seller123` |
| Mijoz | `customer@eventbox.uz` | `customer123` |

The login screen has one-click buttons that fill these in.

### Seed data
15 categories, 10 verified sellers, 32 listings with generated artwork, availability records,
10 bookings across the whole lifecycle, reviews, notifications, packages, payments and ad slots.

---

## 🗄 Ma'lumotlar bazasi / Database schema

```
users              seller_profiles     categories        products
product_images     availability        delivery_options  bookings
booking_items      event_packages      package_items     reviews
payments           notifications       subscriptions     advertisements
```

Relations are enforced with foreign keys (`PRAGMA foreign_keys = ON`), cascades where appropriate,
and indexes on the hot lookup paths (seller, category, city, booking, availability, notifications).

### Booking statuses
`yangi → pending → confirmed → preparing → delivering → installing → ongoing → completed`
plus `cancelled` (seller rejects or customer cancels; reserved dates are released automatically).

---

## 🔐 Xavfsizlik / Security
- Passwords hashed with bcrypt (cost 10); **passwords are never returned by any endpoint**
- JWT in an `httpOnly`, `SameSite=Lax` cookie (Secure when served over HTTPS)
- Central `optionalAuth` → `requireAuth` → `requireRole('admin')` / `requireSeller` middleware chain
- Every mutating endpoint validates its payload with Zod; validation errors come back per field
- Parameterised SQL everywhere (no string interpolation of user input)
- Ownership checks: sellers only see/edit their own listings and bookings
- Uploads are type- and size-limited (images only, ≤ 5 MB)

---

## 🌍 Til va mavzu / Language & theme
- **Languages:** O‘zbek (default), Русский, English — switchable from the navbar; the choice is
  persisted in `localStorage` and on the user profile
- **Themes:** Light and dark Soft UI — follows the OS preference on first visit, toggle in the navbar,
  persisted per user
- Category and delivery-option names are stored in all three languages in the database

---

## 📡 API overview

```
POST   /api/auth/register | /login | /logout      PATCH /api/auth/me      POST /api/auth/password
GET    /api/categories                            (admin: POST / PUT / DELETE)
GET    /api/products                              (search, filters, sort, pagination)
GET    /api/products/recommendations              (package builder engine)
GET    /api/products/:id  |  /:id/availability    (seller: POST / PUT / PATCH / DELETE)
GET    /api/sellers  |  /api/sellers/:slug        GET|PATCH /api/sellers/me
POST   /api/sellers/me/premium | /payout          GET /api/sellers/me/products
GET    /api/delivery-options
POST   /api/bookings   GET /api/bookings/my | /seller | /:id
PATCH  /api/bookings/:id/status   POST /api/bookings/:id/pay
GET/POST/DELETE  /api/packages    POST /api/reviews   POST /api/reviews/:id/reply
GET    /api/notifications                         GET  /api/analytics/home | /seller
GET    /api/admin/stats | /users | /sellers | /products | /bookings | /ads | /payments
POST   /api/upload (multipart)
```

---

## 📁 Loyiha tuzilishi / Project structure

```
server/          Express API — routes, middleware, seed, schema.sql, db.js
client/          React app — pages, components, contexts, i18n locales
public/media/    Generated product artwork + uploaded images
```
