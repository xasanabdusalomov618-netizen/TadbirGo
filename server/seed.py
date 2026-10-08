"""Realistic Uzbek demo data for TadbirGo."""
import datetime
from . import db
from .auth import hash_password

COMMISSION = 0.15


def _d(days: int) -> str:
    return (datetime.date.today() + datetime.timedelta(days=days)).isoformat()


def _dt(days: int, hour: int = 12) -> str:
    d = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=days)
    return d.replace(hour=hour, minute=0, second=0).strftime("%Y-%m-%d %H:%M:%S")


def seed_if_empty() -> None:
    if db.query_one("SELECT id FROM users LIMIT 1"):
        return

    # ---------- Categories ----------
    categories = [
        ("stollar", "Stol va stullar", "Столы и стулья", "Tables & chairs", "🪑", 1),
        ("chodirlar", "Chodirlar", "Шатры и палатки", "Tents & canopies", "⛺", 2),
        ("dekor", "Dekor", "Декор и оформление", "Decoration", "🎀", 3),
        ("fotozona", "Fotozona", "Фотозона", "Photo zone", "📸", 4),
        ("audio", "Kolonka va audio", "Колонки и звук", "Sound & audio", "🔊", 5),
        ("projektor", "Projektor", "Проекторы", "Projectors", "📽️", 6),
        ("yoruglik", "Yorug'lik", "Освещение", "Lighting", "💡", 7),
        ("idish", "Idish-tovoqlar", "Посуда", "Tableware", "🍽️", 8),
        ("dj", "DJ", "Диджей", "DJ", "🎧", 9),
        ("fotograf", "Fotograf", "Фотограф", "Photographer", "📷", 10),
        ("videograf", "Videograf", "Видеограф", "Videographer", "🎥", 11),
        ("catering", "Catering", "Кейтеринг", "Catering", "🍢", 12),
        ("joylar", "Event joylari", "Площадки и залы", "Event venues", "🏛️", 13),
        ("yetkazish", "Yetkazib berish", "Доставка", "Delivery", "🚚", 14),
        ("ornatish", "O'rnatish", "Монтаж и установка", "Installation", "🔧", 15),
    ]
    cat_ids = {}
    for slug, uz, ru, en, icon, sort in categories:
        cat_ids[slug] = db.execute(
            "INSERT INTO categories(slug,name_uz,name_ru,name_en,icon,sort) VALUES(?,?,?,?,?,?)",
            (slug, uz, ru, en, icon, sort),
        )

    # ---------- Delivery options ----------
    delivery = [
        ("standard", "delivery", "Standart yetkazib berish (1-2 kun)", "Стандартная доставка (1-2 дня)", "Standard delivery (1-2 days)", 150000),
        ("express", "delivery", "Express yetkazib berish (24 soat)", "Экспресс-доставка (24 часа)", "Express delivery (24 hours)", 300000),
        ("installation", "installation", "O'rnatish va joylashtirish", "Монтаж и установка", "Installation service", 400000),
        ("pickup", "pickup", "Tadbirdan keyin olib ketish", "Вывоз после мероприятия", "Pickup after event", 100000),
    ]
    for slug, kind, uz, ru, en, price in delivery:
        db.execute(
            "INSERT INTO delivery_options(slug,kind,name_uz,name_ru,name_en,price) VALUES(?,?,?,?,?,?)",
            (slug, kind, uz, ru, en, price),
        )

    # ---------- Users & sellers ----------
    def mk_user(name, email, phone, role):
        return db.execute(
            "INSERT INTO users(name,email,password_hash,phone,role,created_at) VALUES(?,?,?,?,?,?)",
            (name, email, hash_password("tadbir123"), phone, role, _dt(-120)),
        )

    admin_id = db.execute(
        "INSERT INTO users(name,email,password_hash,phone,role,created_at) VALUES(?,?,?,?,?,?)",
        ("TadbirGo Admin", "admin@tadbirgo.uz", hash_password("admin123"), "+998 90 000 00 00", "admin", _dt(-180)),
    )
    customer_id = db.execute(
        "INSERT INTO users(name,email,password_hash,phone,role,created_at) VALUES(?,?,?,?,?,?)",
        ("Aziz Karimov", "mijoz@tadbirgo.uz", hash_password("mijoz123"), "+998 91 123 45 67", "customer", _dt(-90)),
    )
    customer2_id = db.execute(
        "INSERT INTO users(name,email,password_hash,phone,role,created_at) VALUES(?,?,?,?,?,?)",
        ("Malika Yusupova", "malika@tadbirgo.uz", hash_password("mijoz123"), "+998 93 555 11 22", "customer", _dt(-80)),
    )

    sellers = [
        ("Diyor Rahimov", "seller1@tadbirgo.uz", "Baxtli To'y Service", "To'y jihozlari ijarasi: stol-stul, chodir, yetkazish. 10 yillik tajriba.", "Toshkent", 1),
        ("Nodira Samatova", "seller2@tadbirgo.uz", "Samarqand Chodir Markazi", "Samarqand bo'ylab eng katta chodirlar va professional o'rnatish jamoasi.", "Samarqand", 1),
        ("Jasur Toshmatov", "seller3@tadbirgo.uz", "Lux Decor Tashkent", "Premium dekor, fotozona va yorug'lik bezaklari. Har bir tadbir uchun individual dizayn.", "Toshkent", 1),
        ("Kamila Nazarova", "seller4@tadbirgo.uz", "Foto Studio Anor", "Professional foto va video xizmatlari, dron suratga olish, jonli efir.", "Buxoro", 1),
        ("Bekzod Alimov", "seller5@tadbirgo.uz", "SoundPro UZ", "Professional ovoz va yorug'lik uskunalari ijarasi. JBL, Yamaha, Shure brendlari.", "Toshkent", 1),
        ("Zilola Qodirova", "seller6@tadbirgo.uz", "Ziyo Catering", "Milliy va Yevropa taomlari. Halol menyu, professional ofitsiantlar jamoasi.", "Farg'ona", 1),
        ("Otabek Ismoilov", "seller7@tadbirgo.uz", "Andijon Bayram Xizmatlari", "Andijon viloyatida to'liq bayram xizmatlari: chodir, stol-stul, idish-tovoq.", "Andijon", 1),
        ("Nilufar Karimova", "seller8@tadbirgo.uz", "Royal Events Buxoro", "Buxoroda tadbir tashkil etish: dekor, fotozona, sharlar va bezaklar.", "Buxoro", 1),
        ("Shohruh Mirzayev", "seller9@tadbirgo.uz", "MegaPro Audio", "Konsert darajasidagi audio tizimlar, DJ va projektor xizmatlari.", "Toshkent", 1),
        ("Farrux Abdullayev", "seller10@tadbirgo.uz", "Green Garden Hall", "Zamonaviy bayram zallari va ochiq maydonlar. 500 kishigacha sig'im.", "Toshkent", 1),
        ("Timur Xolmatov", "seller11@tadbirgo.uz", "Navro'z Chodirlari", "Yangi sotuvchi. Tasdiqlash kutilmoqda.", "Samarqand", 0),
    ]
    seller_ids = {}
    for name, email, company, desc, loc, approved in sellers:
        uid = mk_user(name, email, "+998 90 100 20 30", "seller")
        sid = db.execute(
            "INSERT INTO seller_profiles(user_id,company_name,description,location,phone,approved,premium_until,rating,rating_count,created_at)"
            " VALUES(?,?,?,?,?,?,?,?,?,?)",
            (uid, company, desc, loc, "+998 90 100 20 30", approved,
             _d(30) if approved in (1, 3) else None, 0, 0, _dt(-100)),
        )
        seller_ids[company] = sid

    # ---------- Products ----------
    products = [
        ("Banket stoli (10 kishilik)", "Банкетный стол (10 мест)", "Banquet table (10 seats)",
         "Oq rangdagi yumaloq banket stoli. Diametri 180 sm, 10 kishiga mo'ljallangan. To'y va ziyofatlar uchun ideal.",
         "stollar", "Baxtli To'y Service", 120000, "kun", "Toshkent", 120, "stollar1.jpg", 4.9),
        ("Banquet stuli (yumshoq)", "Банкетный стул (мягкий)", "Banquet chair (soft)",
         "Yumshoq o'rindiqqli banket stuli. Oltin rang metall karkas, krem rang mato. Stol bilan birga tavsiya etiladi.",
         "stollar", "Baxtli To'y Service", 15000, "kun", "Toshkent", 600, "stollar2.jpg", 4.8),
        ("To'y chodiri (300 o'rin)", "Свадебный шатёр (300 мест)", "Wedding tent (300 seats)",
         "Katta hajmdagi oq to'y chodiri. 300 kishigacha sig'im, konditsioner va yoritish bilan. O'rnatish 24 soat oldin.",
         "chodirlar", "Samarqand Chodir Markazi", 3500000, "kun", "Samarqand", 2, "chodir.jpg", 5.0),
        ("Yig'ilma chodir (100 o'rin)", "Сборный шатёр (100 мест)", "Foldable tent (100 seats)",
         "O'rta hajmdagi yig'ilma chodir. 100 kishilik tadbirlar uchun. Tez montaj — 6 soat ichida tayyor.",
         "chodirlar", "Andijon Bayram Xizmatlari", 1200000, "kun", "Andijon", 3, "chodir.jpg", 4.6),
        ("Milliy dekor to'plami", "Набор национального декора", "National decor set",
         "To'y uchun milliy uslubdagi to'liq bezak to'plami: sahna bezagi, gullar, mato drapirovkasi va stol bezaklari.",
         "dekor", "Lux Decor Tashkent", 1800000, "xizmat", "Toshkent", 1, "dekor.jpg", 4.9),
        ("Gul bezaklari va sharlar", "Цветочное оформление и шары", "Flower & balloon decoration",
         "Jonli va sun'iy gullar, havo sharlari kompozitsiyasi. Fotozona va sahna uchun tayyor yechimlar.",
         "dekor", "Royal Events Buxoro", 950000, "xizmat", "Buxoro", 1, "dekor.jpg", 4.5),
        ('Premium fotozona "Bog\'"', 'Фотозона «Сад»', 'Premium photo zone "Garden"',
         "Jonli gullar bilan bezatilgan premium fotozona. 3x4 metr, LED yoritish. Mehmonlar uchun eng sevimli hudud.",
         "fotozona", "Lux Decor Tashkent", 1500000, "kun", "Toshkent", 1, "fotozona.jpg", 4.9),
        ("Neon fotozona", "Неоновая фотозона", "Neon photo zone",
         "Zamonaviy neon yozuvli fotozona. Istalgan yozuv va rangda tayyorlanadi. Tug'ilgan kun va korporativlar uchun.",
         "fotozona", "Royal Events Buxoro", 800000, "kun", "Buxoro", 1, "fotozona.jpg", 4.4),
        ("JBL kolonka + mikser", "Колонки JBL + микшер", "JBL speakers + mixer",
         "2 ta JBL PRX kolonka, 8 kanalli mikser va 2 simsiz mikrofon. 200 kishigacha zallar uchun yetarli.",
         "audio", "SoundPro UZ", 700000, "kun", "Toshkent", 4, "audio.jpg", 4.7),
        ("Konsert audio tizimi (5000W)", "Концертная аудиосистема (5000 Вт)", "Concert audio system (5000W)",
         "Professional konsert tizimi: line-array kolonnalar, sabvuferlar, monitorlar. 1000+ kishilik maydonlar uchun.",
         "audio", "MegaPro Audio", 1600000, "kun", "Toshkent", 2, "audio.jpg", 4.8),
        ("4K projektor + ekran", "Проектор 4K + экран", "4K projector + screen",
         "4K lazerli projektor va 3x2 metr ekran. Prezentatsiya, kino kechalari va to'y slaydlari uchun.",
         "projektor", "MegaPro Audio", 450000, "kun", "Toshkent", 5, "projektor.jpg", 4.6),
        ("Sahna yorug'ligi to'plami", "Световой набор для сцены", "Stage lighting set",
         "8 ta harakatlanuvchi bosh, 12 ta LED par, duman mashinasi va boshqaruv pulti. Professional yorug'likchi bilan.",
         "yoruglik", "SoundPro UZ", 900000, "kun", "Toshkent", 3, "yoruglik.jpg", 4.8),
        ("Girlyanda va LED chiroqlar", "Гирлянды и LED-огни", "String lights & LED decor",
         "Issiq oq rangdagi girlyandalar (200 metr) va LED perdalar. Ochiq maydonlar uchun ajoyib muhit yaratadi.",
         "yoruglik", "Lux Decor Tashkent", 350000, "kun", "Toshkent", 10, "yoruglik.jpg", 4.7),
        ("To'y idishlari (100 kishi)", "Свадебная посуда (100 персон)", "Wedding tableware set (100 guests)",
         "100 kishiga mo'ljallangan to'liq idish-tovoq to'plami: likopchalar, piyolalar, stakanlar, asboblar.",
         "idish", "Ziyo Catering", 600000, "to'plam", "Farg'ona", 5, "idish.jpg", 4.5),
        ("Professional DJ", "Профессиональный диджей", "Professional DJ",
         "Tajribali DJ + zamonaviy uskuna. Milliy va zamonaviy musiqa, MC bilan hamkorlikda ishlaydi.",
         "dj", "MegaPro Audio", 1200000, "xizmat", "Toshkent", 1, "dj.jpg", 4.9),
        ("To'y fotografi (1 kun)", "Свадебный фотограф (полный день)", "Wedding photographer (full day)",
         "Professional to'y fotografi. 12 soatlik suratga olish, 500+ ishlangan foto, 14 kunda tayyor.",
         "fotograf", "Foto Studio Anor", 2000000, "xizmat", "Buxoro", 1, "fotograf.jpg", 5.0),
        ("Videografiya + dron", "Видеосъёмка + дрон", "Videography + drone",
         "Kinematik to'y videosi: 2 kamera, dron suratga olish, 3-5 daqiqalik klip va to'liq versiya.",
         "videograf", "Foto Studio Anor", 2500000, "xizmat", "Buxoro", 1, "video.jpg", 4.9),
        ('Catering "Standart"', 'Кейтеринг «Стандарт»', 'Catering "Standard" (per guest)',
         "Har bir mehmon uchun: salatlar, 3 ta issiq taom, shirinliklar va ichimliklar. Ofitsiantlar xizmati kiritilgan.",
         "catering", "Ziyo Catering", 85000, "kishi", "Farg'ona", 500, "catering.jpg", 4.6),
        ('"Green Garden" bayram zali', 'Банкетный зал «Green Garden»', 'Green Garden event hall',
         "Zamonaviy 500 kishilik bayram zali. Sahna, yoritish, konditsioner va katta avtoturargoh mavjud.",
         "joylar", "Green Garden Hall", 4000000, "kun", "Toshkent", 1, "joylar.jpg", 4.8),
        ("Shahar ichida yetkazish", "Доставка по городу", "City delivery service",
         "Tadbir jihozlarini shahar ichida yetkazib berish. Yuk mashinasi va yukchilar bilan.",
         "yetkazish", "Baxtli To'y Service", 200000, "xizmat", "Toshkent", 1, "", 4.3),
        ("O'rnatish brigadasi", "Бригада монтажников", "Installation crew",
         "Professional montaj jamoasi: chodir, sahna, yoritish va boshqa jihozlarni o'rnatish va yig'ishtirish.",
         "ornatish", "Baxtli To'y Service", 500000, "xizmat", "Toshkent", 1, "", 4.7),
    ]
    prod_ids = {}
    for i, (uz, ru, en, desc, slug, seller, price, ptype, loc, qty, img, rating) in enumerate(products):
        pid = db.execute(
            "INSERT INTO products(seller_id,category_id,name,name_ru,name_en,description,price,price_type,location,"
            "quantity,available,approved,featured_until,rating,rating_count,views,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (seller_ids[seller], cat_ids[slug], uz, ru, en, desc, price, ptype, loc, qty, 1, 1,
             _d(30) if i in (0, 2, 6, 11, 15, 18) else None, rating, 24, 150 + i * 17, _dt(-60 + i)),
        )
        prod_ids[uz] = pid
        if img:
            db.execute("INSERT INTO product_images(product_id,url,position) VALUES(?,?,?)", (pid, f"/media/seed/{img}", 0))
            if slug in ("stollar", "chodirlar", "dekor", "fotozona", "audio", "yoruglik"):
                extra = {"stollar": "stollar2.jpg", "chodirlar": "chodir.jpg", "dekor": "dekor.jpg",
                         "fotozona": "fotozona.jpg", "audio": "audio.jpg", "yoruglik": "yoruglik.jpg"}[slug]
                db.execute("INSERT INTO product_images(product_id,url,position) VALUES(?,?,?)", (pid, f"/media/seed/{extra}", 1))

    # Pending products (admin approval demo)
    db.execute(
        "INSERT INTO products(seller_id,category_id,name,name_ru,name_en,description,price,price_type,location,"
        "quantity,available,approved,rating,views,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        (seller_ids["Samarqand Chodir Markazi"], cat_ids["chodirlar"], "VIP shisha chodir", "VIP шатёр",
         "VIP glass tent", "Yangi shisha devorli VIP chodir. Tasdiqlash kutilmoqda.", 5000000, "kun", "Samarqand", 1, 1, 0, 0, 5, _dt(-1)))

    # ---------- Availability (blocked dates) ----------
    for pname, days in [("Banket stoli (10 kishilik)", [4, 5, 12]),
                        ("Banquet stuli (yumshoq)", [4, 5, 12]),
                        ("To'y chodiri (300 o'rin)", [7, 8, 21]),
                        ("To'y fotografi (1 kun)", [6, 13, 14]),
                        ("Professional DJ", [13])]:
        pid = prod_ids[pname]
        for d in days:
            db.execute("INSERT OR IGNORE INTO availability(product_id,blocked_date) VALUES(?,?)", (pid, _d(d)))

    # ---------- Bookings ----------
    def mk_booking(code, customer, seller, date, etype, loc, guests, subtotal, dfee, ifee, pfee, status, created):
        return db.execute(
            "INSERT INTO bookings(code,customer_id,seller_id,event_date,event_type,location,guests,subtotal,"
            "delivery_fee,installation_fee,pickup_fee,total,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (code, customer, seller, date, etype, loc, guests, subtotal, dfee, ifee, pfee,
             subtotal + dfee + ifee + pfee, status, created))

    def mk_item(bid, pname, qty):
        row = db.query_one("SELECT id,name,price FROM products WHERE id=?", (prod_ids[pname],))
        db.execute("INSERT INTO booking_items(booking_id,product_id,name,quantity,price,total) VALUES(?,?,?,?,?,?)",
                   (bid, row["id"], row["name"], qty, row["price"], row["price"] * qty))

    def mk_payment(bid, user, amount, status, created, method="click"):
        commission = round(amount * COMMISSION) if status == "paid" else 0
        db.execute(
            "INSERT INTO payments(booking_id,user_id,kind,amount,commission_rate,commission,method,status,created_at)"
            " VALUES(?,?,?,?,?,?,?,?,?)",
            (bid, user, "booking", amount, COMMISSION if status == "paid" else 0, commission, method, status, created))

    # 1) Completed booking (2 months ago) with reviews
    sub1 = 10 * 120000 + 100 * 15000
    b1 = mk_booking("TG-240810", customer_id, seller_ids["Baxtli To'y Service"], _d(-58), "toy", "Toshkent, Chilonzor", 100, sub1, 150000, 400000, 100000, "yakunlandi", _dt(-65))
    mk_item(b1, "Banket stoli (10 kishilik)", 10)
    mk_item(b1, "Banquet stuli (yumshoq)", 100)
    mk_payment(b1, customer_id, sub1 + 650000, "paid", _dt(-65))
    for pname, rating, comment in [
        ("Banket stoli (10 kishilik)", 5, "Stollar juda sifatli, o'z vaqtida yetkazib berildi. Rahmat!"),
        ("Banquet stuli (yumshoq)", 5, "Stullar yangi va qulay. Mehmonlar mamnun bo'ldi."),
    ]:
        db.execute("INSERT INTO reviews(booking_id,customer_id,seller_id,product_id,rating,comment,created_at) VALUES(?,?,?,?,?,?,?)",
                   (b1, customer_id, seller_ids["Baxtli To'y Service"], prod_ids[pname], rating, comment, _dt(-57)))

    # 2) Confirmed upcoming booking
    sub2 = 700000 + 900000
    b2 = mk_booking("TG-251001", customer_id, seller_ids["SoundPro UZ"], _d(10), "toy", "Toshkent, Yunusobod", 150, sub2, 150000, 0, 0, "tasdiqlandi", _dt(-7))
    mk_item(b2, "JBL kolonka + mikser", 1)
    mk_item(b2, "Sahna yorug'ligi to'plami", 1)
    mk_payment(b2, customer_id, sub2 + 150000, "paid", _dt(-7))

    # 3) Awaiting seller confirmation
    b3 = mk_booking("TG-251005", customer_id, seller_ids["Foto Studio Anor"], _d(20), "toy", "Buxoro shahri", 120, 2000000, 0, 0, 0, "kutmoqda", _dt(-2))
    mk_item(b3, "To'y fotografi (1 kun)", 1)
    mk_payment(b3, customer_id, 2000000, "paid", _dt(-2))

    # 4) Unpaid new booking
    b4 = mk_booking("TG-251007", customer_id, seller_ids["Lux Decor Tashkent"], _d(30), "tugilgan_kun", "Toshkent, Mirzo Ulug'bek", 40, 800000, 0, 0, 0, "yangi", _dt(0))
    mk_item(b4, "Neon fotozona", 1)
    mk_payment(b4, customer_id, 800000, "pending", _dt(0), "")

    # 5) In preparation (another customer, for seller variety)
    sub5 = 85000 * 80
    b5 = mk_booking("TG-251003", customer2_id, seller_ids["Ziyo Catering"], _d(3), "toy", "Farg'ona shahri", 80, sub5, 150000, 0, 0, "tayyorlanmoqda", _dt(-5))
    mk_item(b5, 'Catering "Standart"', 80)
    mk_payment(b5, customer2_id, sub5 + 150000, "paid", _dt(-5))

    # 6) Delivered / being installed
    b6 = mk_booking("TG-251006", customer2_id, seller_ids["Samarqand Chodir Markazi"], _d(1), "toy", "Samarqand", 250, 3500000, 0, 400000, 0, "ornatilmoqda", _dt(-9))
    mk_item(b6, "To'y chodiri (300 o'rin)", 1)
    mk_payment(b6, customer2_id, 3900000, "paid", _dt(-9))

    # Historic paid bookings for revenue chart
    hist = [
        (-150, seller_ids["Baxtli To'y Service"], 2750000, customer2_id),
        (-120, seller_ids["SoundPro UZ"], 1900000, customer_id),
        (-95, seller_ids["Lux Decor Tashkent"], 3300000, customer2_id),
        (-40, seller_ids["MegaPro Audio"], 2050000, customer_id),
        (-15, seller_ids["Green Garden Hall"], 4150000, customer2_id),
    ]
    for i, (ago, seller, total, cust) in enumerate(hist):
        bh = mk_booking(f"TG-ARX{i+1}", cust, seller, _d(ago + 1), "toy", "Toshkent", 120, total - 150000, 150000, 0, 0, "yakunlandi", _dt(ago))
        mk_item(bh, "Banket stoli (10 kishilik)", 1)
        mk_payment(bh, cust, total, "paid", _dt(ago), "payme")

    # ---------- Seller ratings (recomputed from products) ----------
    db.execute("""
        UPDATE seller_profiles SET
          rating = COALESCE((SELECT ROUND(AVG(rating),2) FROM products WHERE products.seller_id = seller_profiles.id AND rating_count > 0), 0),
          rating_count = COALESCE((SELECT SUM(rating_count) FROM products WHERE products.seller_id = seller_profiles.id), 0)
    """)

    # ---------- Notifications ----------
    notifs = [
        (seller_ids["Baxtli To'y Service"], "booking", "Yangi buyurtma: TG-240810 yakunlandi", "/sotuvchi/buyurtmalar"),
        (customer_id, "status", "Buyurtmangiz TG-251001 tasdiqlandi ✅", "/buyurtmalarim"),
        (customer_id, "status", "TG-251005 buyurtmasi sotuvchi tasdig'ini kutmoqda", "/buyurtmalarim"),
    ]
    seller_user = {c: db.query_one("SELECT user_id FROM seller_profiles WHERE id=?", (s,))["user_id"]
                   for c, s in seller_ids.items()}
    for sid, kind, text, link in notifs:
        db.execute("INSERT INTO notifications(user_id,kind,text,link,is_read,created_at) VALUES(?,?,?,?,0,?)",
                   (seller_user.get(sid, customer_id), kind, text, link, _dt(-1)))

    db.get_conn().commit()
