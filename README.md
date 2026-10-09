# 🎉 TadbirGo / EventBox UZ

**Tadbiringizni 10 daqiqada yig‘ing** — to‘y, tug‘ilgan kun va korporativ tadbirlar uchun jihoz va
xizmatlarni (stol-stul, chodir, dekor, fotozona, audio, yorug‘lik, fotograf, DJ, catering va h.k.)
**bitta platformadan** topish, bron qilish va yetkazib olish marketpleysi. O‘zbekiston bo‘ylab:
Toshkent, Samarqand, Andijon, Buxoro, Farg‘ona, Namangan, Xorazm.

---

## ⚠️ Bu repoda ikki implementatsiya bor

Loyiha ikki mustaqil stack’da yozilgan — ikkalasi ham to‘liq ishlaydi, bir xil ma’lumotlar modeli va
bir xil mahsulot mantig‘iga ega. Qaysi birini ishlatish sizga qoladi:

| | **A — FastAPI (Python)** | **B — Express (Node.js)** |
|---|---|---|
| Backend | Python 3 + FastAPI + SQLite | Node.js 22 (ESM) + Express 4 + SQLite (`node:sqlite`) |
| Frontend | `frontend/` — React 18 + Vite | `client/` — React 18 + Vite + Tailwind (Soft UI) |
| Portlar | API `8000` (frontend build’ni o‘zi beradi), Vite `5173` | API `4000`, Vite `5173` (`/api` proksi) |
| Validatsiya | Pydantic | Zod |
| Ishga tushirish | `uvicorn server.main:app` | `npm run dev` |

Papkalar bir-biriga aralashmaydi: **`server/`** papkasida ikkala backend’ning fayllari yonma-yon turadi
(`server/main.py`, `server/api/*.py` — Python; `server/index.js`, `server/routes/*.js` — Node).
`frontend/` faqat A’ga, `client/` va `public/` faqat B’ga tegishli.

---

# 🅰️ A. FastAPI implementatsiyasi (Python)

## ✨ Asosiy imkoniyatlar
- 🛍 **Katalog** — 15 kategoriya, qidiruv, kategoriya/manzil/narx/sana bo‘yicha filtrlar
- 🧩 **Paket tuzuvchi** — tadbir turi, mehmonlar soni va byudjetni kiriting; tizim byudjetga mos
  to‘plamni avtomatik yig‘adi
- 🛒 **Savat va checkout** — yetkazib berish (standart/express), o‘rnatish va tadbirdan keyin olib ketish
- 📦 **Buyurtma holati** — 9 bosqich: Yangi → Tasdiqlanishni kutmoqda → Tasdiqlandi → Tayyorlanmoqda →
  Yetkazilmoqda → O‘rnatilmoqda → Tadbir jarayonida → Yakunlandi / Bekor qilindi
- ⭐ **Reyting va sharhlar** — yakunlangan buyurtmalardan keyin baho
- 🏪 **Sotuvchi paneli** — mahsulot qo‘shish (rasm yuklash, narx, band sanalar), buyurtmalarni
  qabul/rad qilish, daromad va komissiya statistikasi, Premium obuna va reklama (featured)
- ⚙️ **Admin panel** — foydalanuvchilar, sotuvchilarni tasdiqlash, mahsulotlarni moderatsiya,
  platforma statistikasi va oylik daromad grafigi
- 🌗 **Tun/Kun rejimi** va 🌐 **3 til**: O‘zbekcha, Русский, English

## 🔑 Demo hisoblar (A)

| Rol | Email | Parol |
|---|---|---|
| Admin | `admin@tadbirgo.uz` | `admin123` |
| Sotuvchi | `seller1@tadbirgo.uz` | `tadbir123` |
| Mijoz | `mijoz@tadbirgo.uz` | `mijoz123` |

## 🚀 Ishga tushirish (A)

```bash
# Backend — API + build qilingan frontend 8000-portda
python3 -m uvicorn server.main:app --host 0.0.0.0 --port 8000

# Frontend development (ixtiyoriy)
cd frontend && npm install && npm run dev
```

Birinchi ishga tushirishda baza avtomatik yaratiladi va O‘zbek demo ma’lumotlari bilan to‘ldiriladi
(11 sotuvchi, 22 mahsulot, namunaviy buyurtmalar). Smoke test: `python3 scripts/smoke_test.py`.

---

# 🅱️ B. Express implementatsiyasi (Node.js)

Production-ready marketplace: real autentifikatsiya, relyatsion baza, har bir entity uchun CRUD,
paket konstruktori, mavjudlik kalendari, savat → checkout → buyurtma hayoti, sotuvchi va admin
panellari analitikasi, monetizatsiya, tungi rejim va 3 tilli interfeys — **Soft UI (neumorphic)**
dizayn tizimida.

## ✨ Asosiy imkoniyatlar

### Mijoz (Customer)
- Ro‘yxatdan o‘tish va kirish (JWT, httpOnly cookie)
- Qidirish + filtrlash: kategoriya, shahar, narx oralig‘i, sana bo‘yicha mavjudlik, sotuvchi
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

## 🛠 Texnologiyalar

| Qatlam | Texnologiya |
|---|---|
| Frontend | React 18, Vite 5, React Router 6, Tailwind CSS 3, Recharts, Lucide icons, react-i18next |
| Backend | Node.js 22 (ESM), Express 4, Zod validation, Multer (uploads), JWT + bcryptjs |
| Database | SQLite — Node’ning o‘rnatilgan `node:sqlite` moduli orqali (native kompilyatsiyasiz), 16 jadval |
| Design | Soft UI (neumorphic) dizayn tokenlari, yorug‘ + tungi mavzu, 3 til |

## 🚀 Ishga tushirish (B)

```bash
npm install     # bog'liqliklarni o'rnatish
npm run dev     # API :4000 + Vite dev server :5173 (/api va /media proksi orqali)
npm run seed    # demo ma'lumotlarni qayta yaratish (-- --force bilan tozalab qayta urug'lantirish)
npm run build   # production bundle
npm start       # build qilingan app + API Express orqali (:4000)
```

<http://localhost:5173> — Vite dev serveri `/api` va `/media`’ni Express API’ga proksi qiladi, shuning
uchun autentifikatsiya cookie’lari bitta origin’da ishlaydi.

### Demo hisoblar (B)

| Rol | Email | Parol |
|---|---|---|
| Admin | `admin@eventbox.uz` | `admin123` |
| Sotuvchi | `seller@eventbox.uz` | `seller123` |
| Mijoz | `customer@eventbox.uz` | `customer123` |

Kirish sahifasida bu hisoblarni bir bosish bilan to‘ldiradigan tugmalar bor.

### Seed ma’lumotlari
15 kategoriya, 10 tasdiqlangan sotuvchi (1 tasi tasdiq kutmoqda), 32 e’lon (generatsiya qilingin
rasmlar bilan), mavjudlik yozuvlari, butun hayot sikli bo‘ylab 10 buyurtma, sharhlar,
bildirishnomalar, paketlar, to‘lovlar va reklama slotlari.

## 📡 API overview (B)

```
POST   /api/auth/register | /login | /logout      PATCH /api/auth/me      POST /api/auth/password
GET    /api/categories                            (admin: POST / PUT / DELETE)
GET    /api/products                              (qidiruv, filtrlar, saralash, sahifalash)
GET    /api/products/recommendations              (paket konstruktori dvigateli)
GET    /api/products/:id  |  /:id/availability    (sotuvchi: POST / PUT / PATCH / DELETE)
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

## 🗄 Ma’lumotlar bazasi (ikkala implementatsiya uchun umumiy model)

```
users              seller_profiles     categories        products
product_images     availability        delivery_options  bookings
booking_items      event_packages      package_items     reviews
payments           notifications       subscriptions     advertisements
```

Aloqalar foreign key’lar bilan ta’minlangan (`PRAGMA foreign_keys = ON`), kerakli joylarda kaskadlar,
va tez-tez ishlatiladigan so‘rovlar uchun indekslar (seller, category, city, booking, availability,
notifications).

### Buyurtma statuslari
`yangi → pending → confirmed → preparing → delivering → installing → ongoing → completed`
va `cancelled` (sotuvchi rad etsa yoki mijoz bekor qilsa; band sanalar avtomatik bo‘shatiladi).

## 💰 Monetizatsiya

| Manba | Tavsif |
|---|---|
| Komissiya | 10–20% (standart 12%, Premium 8%) |
| Premium obuna | 299 000 so‘m / oy |
| TOP e’lon | 149 000 so‘m / 30 kun |
| Yetkazib berish | masofaga qarab (baza + km) |
| O‘rnatish | qo‘shimcha xizmat |
| Reklama | banner slotlari (home / explore / sidebar) |

## 🔐 Xavfsizlik
- Parollar bcrypt bilan hashlanadi (cost 10); **hech bir endpoint parolni qaytarmaydi**
- JWT `httpOnly`, `SameSite=Lax` cookie’da (HTTPS orqali `Secure`)
- Markaziy `optionalAuth` → `requireAuth` → `requireRole('admin')` / `requireSeller` middleware zanjiri
- Har bir o‘zgartiruvchi endpoint payload’ni Zod/Pydantic bilan validatsiya qiladi
- Hamma joyda parametrlangan SQL (foydalanuvchi kiritgan ma’lumot string interpolatsiya qilinmaydi)
- Egalik tekshiruvlari: sotuvchi faqat o‘z e’lonlari va buyurtmalarini ko‘radi/o‘zgartiradi
- Yuklamalar turi va hajmi bo‘yicha cheklangan (faqat rasm, ≤ 5 MB)

## 🌍 Til va mavzu
- **Tillar:** O‘zbek (default), Русский, English — navbar’dan almashtiriladi; tanlov `localStorage`’da
  va foydalanuvchi profilida saqlanadi
- **Mavzular:** Yorug‘ va tungi Soft UI — birinchi tashrifda OS sozlamasiga ergashadi, navbar’dan
  almashtiriladi
- Kategoriya va yetkazib berish turlarining nomlari bazada uchala tilda saqlanadi

## 📁 Loyiha tuzilishi

```
server/          Ikkala backend: server/main.py + server/api/*.py (A) va
                 server/index.js + server/routes/*.js (B)
frontend/        A implementatsiyasining React ilovasi
client/          B implementatsiyasining React ilovasi (pages, components, contexts, i18n)
public/media/    Generatsiya qilingan mahsulot rasmlari va yuklangan fayllar
media/seed/      A implementatsiyasi uchun demo rasmlar
scripts/         A implementatsiyasi uchun smoke test (Python)
```
