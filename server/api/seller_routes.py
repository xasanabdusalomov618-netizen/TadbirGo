"""Seller cabinet: products CRUD, overview, earnings, premium & featured."""
import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel, Field

from .. import db
from ..auth import get_current_user, require_seller, seller_profile_for
from ..commission import global_rate_pct

router = APIRouter(prefix="/api/seller", tags=["seller"])

PREMIUM_PRICE = 500_000
FEATURE_PRICE = 100_000


def _profile(user):
    prof = seller_profile_for(user)
    if not prof:
        raise HTTPException(404, "Sotuvchi profili topilmadi")
    return prof


class ProductIn(BaseModel):
    name: str = Field(min_length=3, max_length=120)
    name_ru: str = ""
    name_en: str = ""
    description: str = ""
    price: int = Field(ge=1000)
    price_type: str = "kun"
    category_id: int
    location: str = Field(min_length=2)
    quantity: int = Field(1, ge=1, le=10000)
    available: bool = True
    images: list[str] = []
    blocked_dates: list[str] = []


@router.get("/overview")
def overview(user=Depends(require_seller)):
    prof = _profile(user)
    month_start = datetime.date.today().replace(day=1).isoformat()
    stats = db.query_one(
        """SELECT
             (SELECT COUNT(*) FROM products WHERE seller_id=?) AS product_count,
             (SELECT COUNT(*) FROM bookings WHERE seller_id=?) AS booking_count,
             (SELECT COUNT(*) FROM bookings WHERE seller_id=? AND status='kutmoqda') AS pending_count,
             COALESCE((SELECT SUM(amount) FROM payments p JOIN bookings b ON b.id=p.booking_id
                       WHERE b.seller_id=? AND p.kind='booking' AND p.status='paid'),0) AS revenue_total,
             COALESCE((SELECT SUM(amount) FROM payments p JOIN bookings b ON b.id=p.booking_id
                       WHERE b.seller_id=? AND p.kind='booking' AND p.status='paid' AND p.created_at >= ?),0) AS revenue_month
        """, (prof["id"], prof["id"], prof["id"], prof["id"], prof["id"], month_start))
    monthly = db.query(
        """SELECT strftime('%Y-%m', p.created_at) AS m, SUM(p.amount) AS revenue
           FROM payments p JOIN bookings b ON b.id = p.booking_id
           WHERE b.seller_id=? AND p.status='paid' AND p.kind='booking'
           GROUP BY m ORDER BY m DESC LIMIT 8""", (prof["id"],))
    recent = db.query("SELECT * FROM bookings WHERE seller_id=? ORDER BY id DESC LIMIT 5", (prof["id"],))
    from .booking_routes import serialize_booking
    return {
        "profile": prof,
        "stats": stats,
        "monthly": list(reversed(monthly)),
        "recent_bookings": [serialize_booking(b) for b in recent],
    }


@router.get("/products")
def my_products(user=Depends(require_seller)):
    prof = _profile(user)
    from .catalog import serialize_product
    rows = db.query("SELECT * FROM products WHERE seller_id=? ORDER BY id DESC", (prof["id"],))
    return {"items": [serialize_product(p) for p in rows]}


@router.post("/products")
def create_product(data: ProductIn, user=Depends(require_seller)):
    prof = _profile(user)
    cat = db.query_one("SELECT id FROM categories WHERE id=?", (data.category_id,))
    if not cat:
        raise HTTPException(422, "Kategoriya topilmadi")
    if data.price_type not in ("kun", "soat", "dona", "xizmat", "to'plam", "kishi"):
        raise HTTPException(422, "Noto'g'ri narx turi")
    pid = db.execute(
        "INSERT INTO products(seller_id,category_id,name,name_ru,name_en,description,price,price_type,location,"
        "quantity,available,approved,rating,rating_count,views,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,0,0,0,?)",
        (prof["id"], data.category_id, data.name.strip(), data.name_ru.strip(), data.name_en.strip(),
         data.description.strip(), data.price, data.price_type, data.location.strip(),
         data.quantity, 1 if data.available else 0, 0, db.now()),
    )
    for i, url in enumerate(data.images[:6]):
        db.execute("INSERT INTO product_images(product_id,url,position) VALUES(?,?,?)", (pid, url, i))
    for d in set(data.blocked_dates):
        db.execute("INSERT OR IGNORE INTO availability(product_id,blocked_date) VALUES(?,?)", (pid, d))
    admin = db.query("SELECT id FROM users WHERE role='admin'")
    for a in admin:
        db.execute("INSERT INTO notifications(user_id,kind,text,link,created_at) VALUES(?,?,?,?,?)",
                   (a["id"], "product", f"Yangi mahsulot tasdiqlash uchun: {data.name}", "/admin", db.now()))
    return {"id": pid, "ok": True}


@router.put("/products/{product_id}")
def update_product(product_id: int, data: ProductIn, user=Depends(require_seller)):
    prof = _profile(user)
    p = db.query_one("SELECT * FROM products WHERE id=? AND seller_id=?", (product_id, prof["id"]))
    if not p:
        raise HTTPException(404, "Mahsulot topilmadi")
    db.execute(
        "UPDATE products SET name=?, name_ru=?, name_en=?, description=?, price=?, price_type=?, category_id=?,"
        " location=?, quantity=?, available=? WHERE id=?",
        (data.name.strip(), data.name_ru.strip(), data.name_en.strip(), data.description.strip(),
         data.price, data.price_type, data.category_id, data.location.strip(), data.quantity,
         1 if data.available else 0, product_id),
    )
    db.execute("DELETE FROM product_images WHERE product_id=?", (product_id,))
    for i, url in enumerate(data.images[:6]):
        db.execute("INSERT INTO product_images(product_id,url,position) VALUES(?,?,?)", (product_id, url, i))
    db.execute("DELETE FROM availability WHERE product_id=?", (product_id,))
    for d in set(data.blocked_dates):
        db.execute("INSERT OR IGNORE INTO availability(product_id,blocked_date) VALUES(?,?)", (product_id, d))
    return {"ok": True}


@router.delete("/products/{product_id}")
def delete_product(product_id: int, user=Depends(require_seller)):
    prof = _profile(user)
    p = db.query_one("SELECT * FROM products WHERE id=? AND seller_id=?", (product_id, prof["id"]))
    if not p:
        raise HTTPException(404, "Mahsulot topilmadi")
    db.execute("DELETE FROM products WHERE id=?", (product_id,))
    return {"ok": True}


@router.get("/earnings")
def earnings(user=Depends(require_seller)):
    prof = _profile(user)
    rows = db.query(
        """SELECT p.amount, p.commission, p.status, p.created_at, p.method, b.code, b.id AS booking_id
           FROM payments p JOIN bookings b ON b.id = p.booking_id
           WHERE b.seller_id=? AND p.kind='booking' AND p.status='paid' ORDER BY p.created_at DESC""",
        (prof["id"],))
    gross = sum(r["amount"] for r in rows)
    commission = sum(r["commission"] for r in rows)
    monthly = db.query(
        """SELECT strftime('%Y-%m', p.created_at) AS m, SUM(p.amount) AS gross, SUM(p.commission) AS commission
           FROM payments p JOIN bookings b ON b.id=p.booking_id
           WHERE b.seller_id=? AND p.status='paid' AND p.kind='booking'
           GROUP BY m ORDER BY m DESC LIMIT 8""", (prof["id"],))
    return {
        "gross": gross,
        "commission": commission,
        "net": gross - commission,
        "commission_rate": global_rate_pct() / 100,
        "payments": rows,
        "monthly": list(reversed(monthly)),
    }


@router.post("/premium")
def buy_premium(user=Depends(require_seller)):
    prof = _profile(user)
    until = (datetime.date.today() + datetime.timedelta(days=30)).isoformat()
    db.execute("UPDATE seller_profiles SET premium_until=? WHERE id=?", (until, prof["id"]))
    db.execute(
        "INSERT INTO payments(user_id,kind,amount,commission_rate,commission,method,status,created_at)"
        " VALUES(?,?,?,?,0,'click','paid',?)",
        (user["id"], "premium", PREMIUM_PRICE, 0, db.now()))
    return {"ok": True, "premium_until": until, "price": PREMIUM_PRICE}


@router.post("/products/{product_id}/feature")
def feature_product(product_id: int, user=Depends(require_seller)):
    prof = _profile(user)
    p = db.query_one("SELECT * FROM products WHERE id=? AND seller_id=?", (product_id, prof["id"]))
    if not p:
        raise HTTPException(404, "Mahsulot topilmadi")
    until = (datetime.date.today() + datetime.timedelta(days=7)).isoformat()
    db.execute("UPDATE products SET featured_until=? WHERE id=?", (until, product_id))
    db.execute(
        "INSERT INTO payments(user_id,kind,amount,commission_rate,commission,method,status,created_at)"
        " VALUES(?,?,?,?,0,'click','paid',?)",
        (user["id"], "featured", FEATURE_PRICE, 0, db.now()))
    return {"ok": True, "featured_until": until, "price": FEATURE_PRICE}


@router.post("/upload")
async def upload_image(file: UploadFile = File(...), user=Depends(get_current_user)):
    import os
    import uuid
    from ..main import BASE_DIR
    allowed = {"jpg", "jpeg", "png", "webp"}
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in allowed:
        raise HTTPException(422, "Faqat JPG, PNG yoki WEBP rasm yuklash mumkin")
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(422, "Rasm hajmi 5MB dan oshmasligi kerak")
    name = f"{uuid.uuid4().hex}.{ext}"
    up_dir = os.path.join(BASE_DIR, "media", "uploads")
    os.makedirs(up_dir, exist_ok=True)
    with open(os.path.join(up_dir, name), "wb") as f:
        f.write(content)
    return {"url": f"/media/uploads/{name}"}
