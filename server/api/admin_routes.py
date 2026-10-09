"""Admin dashboard endpoints."""
import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from .. import db
from ..auth import require_admin
from ..commission import MAX_RATE, MIN_RATE, global_rate_pct

router = APIRouter(prefix="/api/admin", tags=["admin"])

BOOKING_STATUSES = {
    "yangi": "Yangi", "kutmoqda": "Tasdiqlanishni kutmoqda", "tasdiqlandi": "Tasdiqlandi",
    "tayyorlanmoqda": "Tayyorlanmoqda", "yetkazilmoqda": "Yetkazilmoqda", "ornatilmoqda": "O'rnatilmoqda",
    "jarayonida": "Tadbir jarayonida", "yakunlandi": "Yakunlandi", "bekor": "Bekor qilindi",
}


class StatusOverrideIn(BaseModel):
    status: str
    note: str = ""


class DisputeResolveIn(BaseModel):
    action: str  # refund | partial | dismiss
    amount: int = Field(0, ge=0)
    note: str = Field("", max_length=1000)


class CategoryIn(BaseModel):
    name_uz: str = Field(min_length=2, max_length=80)
    name_ru: str = Field("", max_length=80)
    name_en: str = Field("", max_length=80)
    icon: str = Field("", max_length=8)
    commission_rate: float | None = None


class SettingsIn(BaseModel):
    commission_rate: float = Field(ge=MIN_RATE, le=MAX_RATE)


class SuspendIn(BaseModel):
    suspended: bool


def _check_rate(rate: float | None) -> None:
    if rate is not None and not (MIN_RATE <= rate <= MAX_RATE):
        raise HTTPException(422, f"Komissiya {MIN_RATE:g}% dan {MAX_RATE:g}% gacha bo'lishi kerak")


def _slugify(name: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "kategoriya"
    slug, n = base, 2
    while db.query_one("SELECT id FROM categories WHERE slug=?", (slug,)):
        slug = f"{base}-{n}"
        n += 1
    return slug


@router.get("/stats")
def stats(user=Depends(require_admin)):
    base = db.query_one(
        """SELECT
             (SELECT COUNT(*) FROM users) AS users,
             (SELECT COUNT(*) FROM users WHERE role='customer') AS customers,
             (SELECT COUNT(*) FROM seller_profiles) AS sellers,
             (SELECT COUNT(*) FROM seller_profiles WHERE approved=0) AS pending_sellers,
             (SELECT COUNT(*) FROM bookings) AS bookings,
             (SELECT COUNT(*) FROM products WHERE available=1) AS active_listings,
             (SELECT COUNT(*) FROM products WHERE approved=0) AS pending_products,
             (SELECT COUNT(*) FROM reviews) AS reviews,
             COALESCE((SELECT SUM(amount) FROM payments WHERE status='paid' AND kind='booking'),0) AS revenue,
             COALESCE((SELECT SUM(commission) FROM payments WHERE status='paid' AND kind='booking'),0) AS commission,
             (SELECT COUNT(*) FROM disputes WHERE status='open') AS open_disputes
        """)
    monthly = db.query(
        """SELECT strftime('%Y-%m', created_at) AS m, SUM(amount) AS revenue
           FROM payments WHERE status='paid' AND kind='booking'
           GROUP BY m ORDER BY m DESC LIMIT 6""")
    status_rows = db.query("SELECT status, COUNT(*) AS n FROM bookings GROUP BY status")
    recent = db.query("SELECT * FROM bookings ORDER BY id DESC LIMIT 8")
    from .booking_routes import serialize_booking
    return {
        **base,
        "monthly": list(reversed(monthly)),
        "status_counts": {r["status"]: r["n"] for r in status_rows},
        "recent_bookings": [serialize_booking(b) for b in recent],
    }


@router.get("/users")
def users(user=Depends(require_admin)):
    rows = db.query(
        """SELECT u.id, u.name, u.email, u.phone, u.role, u.created_at,
                  (SELECT COUNT(*) FROM bookings b WHERE b.customer_id=u.id) AS bookings_count
           FROM users u ORDER BY u.id DESC""")
    return {"items": rows}


@router.get("/sellers")
def sellers(user=Depends(require_admin)):
    rows = db.query(
        """SELECT sp.*, u.name AS owner_name, u.email AS owner_email,
                  (SELECT COUNT(*) FROM products p WHERE p.seller_id=sp.id) AS products_count,
                  (SELECT COUNT(*) FROM bookings b WHERE b.seller_id=sp.id) AS bookings_count
           FROM seller_profiles sp JOIN users u ON u.id = sp.user_id ORDER BY sp.approved ASC, sp.id DESC""")
    return {"items": rows}


@router.post("/sellers/{seller_id}/approve")
def approve_seller(seller_id: int, user=Depends(require_admin)):
    prof = db.query_one("SELECT * FROM seller_profiles WHERE id=?", (seller_id,))
    if not prof:
        raise HTTPException(404, "Sotuvchi topilmadi")
    db.execute("UPDATE seller_profiles SET approved=1, verification_status='verified' WHERE id=?", (seller_id,))
    db.execute("INSERT INTO notifications(user_id,kind,text,link,created_at) VALUES(?,?,?,?,?)",
               (prof["user_id"], "account", "Sotuvchi hisobingiz tasdiqlandi! Endi mahsulot qo'shishingiz mumkin.", "/sotuvchi", db.now()))
    return {"ok": True}


@router.get("/products")
def products(user=Depends(require_admin)):
    from .catalog import serialize_product
    rows = db.query("SELECT * FROM products ORDER BY approved ASC, id DESC")
    return {"items": [serialize_product(p) for p in rows]}


@router.post("/products/{product_id}/approve")
def approve_product(product_id: int, user=Depends(require_admin)):
    p = db.query_one("SELECT p.*, sp.user_id AS owner FROM products p JOIN seller_profiles sp ON sp.id=p.seller_id WHERE p.id=?", (product_id,))
    if not p:
        raise HTTPException(404, "Mahsulot topilmadi")
    db.execute("UPDATE products SET approved=1 WHERE id=?", (product_id,))
    db.execute("INSERT INTO notifications(user_id,kind,text,link,created_at) VALUES(?,?,?,?,?)",
               (p["owner"], "product", f"Mahsulotingiz tasdiqlandi: {p['name']}", "/sotuvchi/mahsulotlar", db.now()))
    return {"ok": True}


@router.delete("/products/{product_id}")
def remove_product(product_id: int, user=Depends(require_admin)):
    p = db.query_one("SELECT * FROM products WHERE id=?", (product_id,))
    if not p:
        raise HTTPException(404, "Mahsulot topilmadi")
    db.execute("DELETE FROM products WHERE id=?", (product_id,))
    return {"ok": True}


@router.get("/bookings")
def bookings(user=Depends(require_admin)):
    from .booking_routes import serialize_booking
    rows = db.query("SELECT * FROM bookings ORDER BY id DESC LIMIT 200")
    return {"items": [serialize_booking(b) for b in rows]}


# ---------- Analytics extras ----------
@router.get("/revenue-by-category")
def revenue_by_category(user=Depends(require_admin)):
    rows = db.query(
        """SELECT c.id, c.name_uz, c.name_ru, c.name_en, c.icon,
                  COALESCE(SUM(bi.total), 0) AS gross,
                  COUNT(DISTINCT bi.booking_id) AS bookings
           FROM categories c
           LEFT JOIN products p ON p.category_id = c.id
           LEFT JOIN booking_items bi ON bi.product_id = p.id
           LEFT JOIN bookings b ON b.id = bi.booking_id AND b.status NOT IN ('yangi','bekor')
           GROUP BY c.id ORDER BY gross DESC""")
    for r in rows:
        r["gross"] = r["gross"] or 0
    return {"items": rows}


# ---------- Disputes ----------
@router.get("/disputes")
def list_disputes(user=Depends(require_admin)):
    rows = db.query(
        """SELECT d.*, b.code, b.total, b.status AS booking_status, b.customer_id, b.seller_id,
                  u.name AS opened_by_name,
                  cu.name AS customer_name, sp.company_name AS seller_name
           FROM disputes d
           JOIN bookings b ON b.id = d.booking_id
           JOIN users u ON u.id = d.opened_by
           JOIN users cu ON cu.id = b.customer_id
           JOIN seller_profiles sp ON sp.id = b.seller_id
           ORDER BY CASE d.status WHEN 'open' THEN 0 ELSE 1 END, d.id DESC""")
    return {"items": rows, "open": sum(1 for r in rows if r["status"] == "open")}


def _notify(user_id: int, kind: str, text: str, link: str = "") -> None:
    db.execute("INSERT INTO notifications(user_id,kind,text,link,created_at) VALUES(?,?,?,?,?)",
               (user_id, kind, text, link, db.now()))


def _parties(booking: dict) -> list[int]:
    srow = db.query_one("SELECT user_id FROM seller_profiles WHERE id=?", (booking["seller_id"],))
    ids = [booking["customer_id"]]
    if srow:
        ids.append(srow["user_id"])
    return ids


@router.post("/disputes/{dispute_id}/resolve")
def resolve_dispute(dispute_id: int, data: DisputeResolveIn, user=Depends(require_admin)):
    d = db.query_one("SELECT * FROM disputes WHERE id=?", (dispute_id,))
    if not d:
        raise HTTPException(404, "Nizo topilmadi")
    if d["status"] != "open":
        raise HTTPException(400, "Bu nizo allaqachon yopilgan")
    b = db.query_one("SELECT * FROM bookings WHERE id=?", (d["booking_id"],))
    payment = db.query_one("SELECT * FROM payments WHERE booking_id=? AND kind='booking' ORDER BY id DESC",
                           (d["booking_id"],))
    refund = 0
    link = f"/buyurtma/{b['id']}"
    if data.action == "dismiss":
        new_status = "rejected"
        resolution = "Nizo rad etildi"
    elif data.action in ("refund", "partial"):
        if not payment or payment["status"] != "paid":
            raise HTTPException(400, "To'langan buyurtma bo'yicha qaytarish mumkin")
        if data.action == "refund":
            refund = payment["amount"]
        else:
            if data.amount <= 0 or data.amount > payment["amount"]:
                raise HTTPException(422, "Qaytarish summasi noto'g'ri")
            refund = data.amount
        share = refund / payment["amount"]
        new_commission = round(payment["commission"] * (1 - share))
        if data.action == "refund":
            db.execute("UPDATE payments SET status='refunded', commission=0 WHERE id=?", (payment["id"],))
            db.execute("UPDATE bookings SET status='bekor' WHERE id=?", (b["id"],))
        else:
            db.execute("UPDATE payments SET status='partial_refund', commission=? WHERE id=?",
                       (new_commission, payment["id"]))
        new_status = "resolved"
        resolution = f"Qaytarildi: {refund:,} so'm".replace(",", " ")
    else:
        raise HTTPException(422, "Noto'g'ri amal")
    if data.note.strip():
        resolution += f". {data.note.strip()}"
    db.execute("UPDATE disputes SET status=?, resolution=?, refund_amount=?, resolved_at=? WHERE id=?",
               (new_status, resolution, refund, db.now(), dispute_id))
    for uid in _parties(b):
        _notify(uid, "dispute", f"{b['code']} nizosi yopildi: {resolution}", link)
    return {"ok": True}


# ---------- Order status override ----------
@router.post("/bookings/{booking_id}/status")
def override_status(booking_id: int, data: StatusOverrideIn, user=Depends(require_admin)):
    b = db.query_one("SELECT * FROM bookings WHERE id=?", (booking_id,))
    if not b:
        raise HTTPException(404, "Buyurtma topilmadi")
    if data.status not in BOOKING_STATUSES:
        raise HTTPException(422, "Noto'g'ri holat")
    if data.status == b["status"]:
        raise HTTPException(400, "Buyurtma allaqachon shu holatda")
    db.execute("UPDATE bookings SET status=? WHERE id=?", (data.status, booking_id))
    suffix = f" ({data.note.strip()})" if data.note.strip() else ""
    for uid in _parties(b):
        _notify(uid, "status", f"{b['code']} holati admin tomonidan o'zgartirildi: "
                f"{BOOKING_STATUSES[data.status]}{suffix}", f"/buyurtma/{booking_id}")
    from .booking_routes import serialize_booking
    return serialize_booking(db.query_one("SELECT * FROM bookings WHERE id=?", (booking_id,)), with_items=True,
                             user=user)


# ---------- Seller moderation ----------
@router.post("/sellers/{seller_id}/suspend")
def suspend_seller(seller_id: int, data: SuspendIn, user=Depends(require_admin)):
    prof = db.query_one("SELECT * FROM seller_profiles WHERE id=?", (seller_id,))
    if not prof:
        raise HTTPException(404, "Sotuvchi topilmadi")
    db.execute("UPDATE seller_profiles SET suspended=? WHERE id=?", (1 if data.suspended else 0, seller_id))
    _notify(prof["user_id"], "account",
            "Hisobingiz vaqtincha to'xtatildi. Batafsil ma'lumot uchun qo'llab-quvvatlashga murojaat qiling."
            if data.suspended else "Hisobingiz qayta faollashtirildi.", "/sotuvchi")
    return {"ok": True}


# ---------- Categories & commission ----------
@router.get("/categories")
def admin_categories(user=Depends(require_admin)):
    rows = db.query(
        """SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id=c.id) AS products_count
           FROM categories c ORDER BY c.sort, c.id""")
    return {"items": rows, "global_rate": global_rate_pct()}


@router.post("/categories")
def create_category(data: CategoryIn, user=Depends(require_admin)):
    _check_rate(data.commission_rate)
    slug = _slugify(data.name_en or data.name_uz)
    sort = (db.query_one("SELECT COALESCE(MAX(sort),0)+1 AS n FROM categories") or {"n": 1})["n"]
    cid = db.execute(
        "INSERT INTO categories(slug,name_uz,name_ru,name_en,icon,sort,commission_rate) VALUES(?,?,?,?,?,?,?)",
        (slug, data.name_uz.strip(), data.name_ru.strip() or data.name_uz.strip(),
         data.name_en.strip() or data.name_uz.strip(), data.icon or "📦", sort, data.commission_rate))
    return {"ok": True, "id": cid}


@router.put("/categories/{category_id}")
def update_category(category_id: int, data: CategoryIn, user=Depends(require_admin)):
    _check_rate(data.commission_rate)
    if not db.query_one("SELECT id FROM categories WHERE id=?", (category_id,)):
        raise HTTPException(404, "Kategoriya topilmadi")
    db.execute(
        "UPDATE categories SET name_uz=?, name_ru=?, name_en=?, icon=?, commission_rate=? WHERE id=?",
        (data.name_uz.strip(), data.name_ru.strip() or data.name_uz.strip(),
         data.name_en.strip() or data.name_uz.strip(), data.icon or "📦", data.commission_rate, category_id))
    return {"ok": True}


@router.delete("/categories/{category_id}")
def delete_category(category_id: int, user=Depends(require_admin)):
    n = db.query_one("SELECT COUNT(*) AS n FROM products WHERE category_id=?", (category_id,))["n"]
    if n:
        raise HTTPException(409, f"Kategoriyada {n} ta mahsulot bor. Avval ularni ko'chiring.")
    db.execute("DELETE FROM categories WHERE id=?", (category_id,))
    return {"ok": True}


@router.get("/settings")
def get_settings(user=Depends(require_admin)):
    return {"commission_rate": global_rate_pct(), "min": MIN_RATE, "max": MAX_RATE}


@router.put("/settings")
def put_settings(data: SettingsIn, user=Depends(require_admin)):
    db.execute("INSERT OR REPLACE INTO settings(key,value) VALUES('commission_rate',?)", (str(data.commission_rate),))
    return {"ok": True, "commission_rate": data.commission_rate}
