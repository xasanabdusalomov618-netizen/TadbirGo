# 🎉 TadbirGo

**Tadbiringizni 10 daqiqada yig'ing!** — To'y, tug'ilgan kun va korporativ tadbirlar uchun jihoz va xizmatlarni ijaraga berish marketplace'i.

O'zbekistondagi tadbirlar uchun barcha kerakli jihoz va xizmatlarni (stol-stul, chodir, dekor, fotozona, audio, yorug'lik, fotograf, DJ, catering va h.k.) **bitta platformadan** toping, bron qiling va yetkazib oldiring.

## ✨ Asosiy imkoniyatlar

- 🛍 **Katalog** — 15 kategoriya, qidiruv, kategoriya/manzil/narx/sana bo'yicha filtrlar
- 🧩 **Paket tuzuvchi** — tadbir turi, mehmonlar soni va byudjetni kiriting; tizim byudjetga mos to'plamni avtomatik yig'adi
- 🛒 **Savat va checkout** — yetkazib berish (standart/express), o'rnatish va tadbirdan keyin olib ketish xizmatlari
- 📦 **Buyurtma holati** — 9 bosqichli jarayon: Yangi → Tasdiqlanishni kutmoqda → Tasdiqlandi → Tayyorlanmoqda → Yetkazilmoqda → O'rnatilmoqda → Tadbir jarayonida → Yakunlandi / Bekor qilindi
- ⭐ **Reyting va sharhlar** — yakunlangan buyurtmalardan keyin mahsulotlarga baho
- 🏪 **Sotuvchi paneli** — mahsulot qo'shish (rasm yuklash, narx, band sanalar), buyurtmalarni qabul/rad qilish, daromad va komissiya statistikasi, Premium obuna va reklama (featured)
- ⚙️ **Admin panel** — foydalanuvchilar, sotuvchilarni tasdiqlash, mahsulotlarni moderatsiya, platforma statistikasi va oylik daromad grafigi
- 🌗 **Tun/Kun rejimi** va 🌐 **3 til**: O'zbekcha, Русский, English

## 🔑 Demo hisoblar

| Rol | Email | Parol |
|---|---|---|
| Admin | `admin@tadbirgo.uz` | `admin123` |
| Sotuvchi | `seller1@tadbirgo.uz` | `tadbir123` |
| Mijoz | `mijoz@tadbirgo.uz` | `mijoz123` |

## 🛠 Texnologiyalar

- **Backend:** Python 3, FastAPI, SQLite (relatsion model: users, seller_profiles, categories, products, product_images, availability, bookings, booking_items, event_packages, package_items, delivery_options, reviews, payments, notifications)
- **Frontend:** React 18 + Vite, React Router, mobil-birinchi responsiv dizayn
- **Autentifikatsiya:** JWT (PBKDF2 parol hashlash), rol asosidagi ruxsatlar (customer/seller/admin)

## 🚀 Ishga tushirish

```bash
# Backend (API + build qilingan frontend 8000-portda)
python3 -m uvicorn server.main:app --host 0.0.0.0 --port 8000

# Frontend development (ixtiyoriy)
cd frontend && npm install && npm run dev
```

Birinchi ishga tushirishda baza avtomatik yaratiladi va Uzbek demo ma'lumotlar bilan to'ldiriladi (11 sotuvchi, 22 mahsulot, namunaviy buyurtmalar).

## 💰 Monetizatsiya (tayyor)

- 15% marketplace komissiyasi (har bir to'lovda hisoblanadi)
- Sotuvchi Premium obunasi (30 kun)
- Featured (reklama) mahsulotlar (7 kun)
- Yetkazib berish va o'rnatish to'lovlari
