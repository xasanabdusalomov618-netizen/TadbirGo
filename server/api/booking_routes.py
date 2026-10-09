"""Checkout, bookings, payments, reviews."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from .. import db
from ..auth import get_current_user, require_seller
from ..commission import blended_rate_pct, booking_commission, global_rate_pct

router = APIRouter(prefix="/api", tags=["bookings"])

DISPUTE_REASONS = {"no_show", "damaged", "late_delivery", "wrong_items", "payment", "other"}

STATUS_FLOW = {
    "yangi": ["bekor"],
    "kutmoqda": ["tasdiqlandi", "bekor"],
    "tasdiqlandi": ["tayyorlanmoqda", "bekor"],
    "tayyorlanmoqda": ["yetkazilmoqda", "bekor"],
    "yetkazilmoqda": ["ornatilmoqda", "jarayonida"],
    "ornatilmoqda": ["jarayonida"],
    "jarayonida": ["yakunlandi"],
    "yakunlandi": [],
    "bekor": [],
}

STATUS_LABEL_UZ = {
    "yangi": "Yangi", "kutmoqda": "Tasdiqlanishni kutmoqda", "tasdiqlandi": "Tasdiqlandi",
    "tayyorlanmoqda": "Tayyorlanmoqda", "yetkazilmoqda": "Yetkazilmoqda", "ornatilmoqda": "O'rnatilmoqda",
    "jarayonida": "Tadbir jarayonida", "yakunlandi": "Yakunlandi", "bekor": "Bekor qilindi",
}


class CheckoutItem(BaseModel):
    product_id: int
    quantity: int = Field(ge=1, le=1000)


class CheckoutIn(BaseModel):
    items: list[CheckoutItem] = Field(min_length=1)
    event_date: str
    event_type: str = "toy"
    location: str = Field(min_length=3)
    guests: int = Field(0, ge=0)
    delivery: str = "standard"   # standard | express | none
    installation: bool = False
    pickup: bool = False


class StatusIn(BaseModel):
    status: str


class PayIn(BaseModel):
    method: str = "click"


class ReviewIn(BaseModel):
    booking_id: int
    product_id: int
    rating: int = Field(ge=1, le=5)
    comment: str = ""
    photo_url: str = ""


class DisputeIn(BaseModel):
    reason: str
    description: str = Field("", max_length=1000)


def _notify(user_id: int, kind: str, text: str, link: str = "") -> None:
    db.execute("INSERT INTO notifications(user_id,kind,text,link,created_at) VALUES(?,?,?,?,?)",
               (user_id, kind, text, link, db.now()))


def serialize_disputes(booking_id: int) -> list:
    return db.query(
        """SELECT d.id, d.reason, d.description, d.status, d.resolution, d.refund_amount,
                  d.created_at, d.resolved_at, u.name AS opened_by_name, d.opened_by
           FROM disputes d JOIN users u ON u.id = d.opened_by
           WHERE d.booking_id=? ORDER BY d.id DESC""", (booking_id,))


def booking_seller_name(bid_seller: int) -> str:
    s = db.query_one("SELECT company_name FROM seller_profiles WHERE id=?", (bid_seller,))
    return s["company_name"] if s else ""


def serialize_booking(b: dict, with_items: bool = False, user=None) -> dict:
    out = dict(b)
    out["seller_name"] = booking_seller_name(b["seller_id"])
    customer = db.query_one("SELECT name FROM users WHERE id=?", (b["customer_id"],))
    out["customer_name"] = customer["name"] if customer else ""
    out["items_count"] = db.query_one(
        "SELECT COALESCE(SUM(quantity),0) AS n FROM booking_items WHERE booking_id=?", (b["id"],))["n"]
    payment = db.query_one("SELECT * FROM payments WHERE booking_id=? AND kind='booking' ORDER BY id DESC", (b["id"],))
    out["payment_status"] = payment["status"] if payment else "none"
    out["payment_method"] = payment["method"] if payment else ""
    if with_items:
        out["items"] = db.query(
            """SELECT bi.*, p.price_type, pi.url AS image
               FROM booking_items bi
               LEFT JOIN products p ON p.id = bi.product_id
               LEFT JOIN product_images pi ON pi.product_id = bi.product_id AND pi.position = 0
               WHERE bi.booking_id = ?""", (b["id"],))
        if payment:
            out["payment"] = payment
        if user and user["id"] == b["customer_id"]:
            reviewed = {r["product_id"] for r in db.query(
                "SELECT product_id FROM reviews WHERE booking_id=?", (b["id"],))}
            out["can_review"] = b["status"] == "yakunlandi"
            out["reviewed_products"] = list(reviewed)
            out["reviews"] = db.query(
                "SELECT * FROM reviews WHERE booking_id=?", (b["id"],))
    if with_items and user:  # detail views only; access is checked by the caller
        out["disputes"] = serialize_disputes(b["id"])
    return out


@router.post("/checkout")
def checkout(data: CheckoutIn, user=Depends(get_current_user)):
    if data.event_date < db.today():
        raise HTTPException(422, "Tadbir sanasi o'tmishda bo'lmasligi kerak")
    if not data.items:
        raise HTTPException(422, "Savat bo'sh")

    # validate items & group by seller
    groups: dict[int, list] = {}
    products = {}
    for item in data.items:
        p = db.query_one("SELECT * FROM products WHERE id=?", (item.product_id,))
        seller_row = db.query_one("SELECT suspended FROM seller_profiles WHERE id=?", (p["seller_id"],)) if p else None
        if not p or not p["approved"] or not p["available"] or (seller_row and seller_row["suspended"]):
            raise HTTPException(422, f"Mahsulot (id={item.product_id}) hozirda mavjud emas")
        if item.quantity > p["quantity"]:
            raise HTTPException(422, f"«{p['name']}» uchun yetarli miqdor yo'q (mavjud: {p['quantity']})")
        blocked = db.query_one(
            "SELECT id FROM availability WHERE product_id=? AND blocked_date=?", (p["id"], data.event_date))
        if blocked:
            raise HTTPException(422, f"«{p['name']}» {data.event_date} sanasiga band. Boshqa sana tanlang.")
        products[p["id"]] = p
        groups.setdefault(p["seller_id"], []).append((p, item.quantity))

    # delivery fees
    opt = {o["slug"]: o for o in db.query("SELECT * FROM delivery_options")}
    delivery_fee = 0
    if data.delivery in ("standard", "express") and opt.get(data.delivery):
        delivery_fee = opt[data.delivery]["price"]
    installation_fee = opt["installation"]["price"] if data.installation and opt.get("installation") else 0
    pickup_fee = opt["pickup"]["price"] if data.pickup and opt.get("pickup") else 0

    grand_subtotal = sum(p["price"] * qty for group in groups.values() for p, qty in group)

    created_bookings = []
    n_groups = len(groups)
    remainder_d = delivery_fee
    remainder_i = installation_fee
    remainder_p = pickup_fee
    for idx, (seller_id, items) in enumerate(sorted(groups.items())):
        subtotal = sum(p["price"] * qty for p, qty in items)
        if idx == n_groups - 1:
            dfee, ifee, pfee = remainder_d, remainder_i, remainder_p
        else:
            share = subtotal / grand_subtotal if grand_subtotal else 0
            dfee = round(delivery_fee * share // 1000) * 1000
            ifee = round(installation_fee * share // 1000) * 1000
            pfee = round(pickup_fee * share // 1000) * 1000
            remainder_d -= dfee
            remainder_i -= ifee
            remainder_p -= pfee
        import random
        total = subtotal + dfee + ifee + pfee
        code = "TG-" + str(random.randint(10**7, 10**8 - 1))
        bid = db.execute(
            "INSERT INTO bookings(code,customer_id,seller_id,event_date,event_type,location,guests,subtotal,"
            "delivery_fee,installation_fee,pickup_fee,total,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (code, user["id"], seller_id, data.event_date, data.event_type, data.location.strip(),
             data.guests, subtotal, dfee, ifee, pfee, total, "yangi", db.now()),
        )
        for p, qty in items:
            db.execute(
                "INSERT INTO booking_items(booking_id,product_id,name,quantity,price,total) VALUES(?,?,?,?,?,?)",
                (bid, p["id"], p["name"], qty, p["price"], p["price"] * qty))
        db.execute(
            "INSERT INTO payments(booking_id,user_id,kind,amount,commission_rate,commission,method,status,created_at)"
            " VALUES(?,?,?,?,?,?,?,?,?)",
            (bid, user["id"], "booking", total, global_rate_pct() / 100, 0, "", "pending", db.now()))
        srow = db.query_one("SELECT user_id, company_name FROM seller_profiles WHERE id=?", (seller_id,))
        if srow:
            db.execute("INSERT INTO notifications(user_id,kind,text,link,created_at) VALUES(?,?,?,?,?)",
                       (srow["user_id"], "booking",
                        f"Yangi buyurtma: {code} ({total:,} so'm)".replace(",", " "), "/sotuvchi/buyurtmalar", db.now()))
        created_bookings.append({"id": bid, "code": code, "seller_id": seller_id,
                                 "seller_name": booking_seller_name(seller_id), "total": total,
                                 "status": "yangi"})

    return {"bookings": created_bookings, "total": sum(b["total"] for b in created_bookings)}


@router.get("/bookings")
def my_bookings(user=Depends(get_current_user)):
    if user["role"] == "seller":
        prof = db.query_one("SELECT id FROM seller_profiles WHERE user_id=?", (user["id"],))
        if not prof:
            raise HTTPException(404, "Sotuvchi profili topilmadi")
        rows = db.query("SELECT * FROM bookings WHERE seller_id=? ORDER BY id DESC", (prof["id"],))
    elif user["role"] == "admin":
        rows = db.query("SELECT * FROM bookings ORDER BY id DESC LIMIT 200")
    else:
        rows = db.query("SELECT * FROM bookings WHERE customer_id=? ORDER BY id DESC", (user["id"],))
    return {"items": [serialize_booking(b, user=user) for b in rows]}


@router.get("/bookings/{booking_id}")
def booking_detail(booking_id: int, user=Depends(get_current_user)):
    b = db.query_one("SELECT * FROM bookings WHERE id=?", (booking_id,))
    if not b:
        raise HTTPException(404, "Buyurtma topilmadi")
    prof = db.query_one("SELECT id FROM seller_profiles WHERE user_id=?", (user["id"],)) if user["role"] == "seller" else None
    if user["role"] not in ("admin",) and b["customer_id"] != user["id"] and (not prof or b["seller_id"] != prof["id"]):
        raise HTTPException(403, "Bu buyurtmani ko'rishga ruxsat yo'q")
    out = serialize_booking(b, with_items=True, user=user)
    out["next_statuses"] = STATUS_FLOW.get(b["status"], [])
    return out


@router.post("/bookings/{booking_id}/pay")
def pay_booking(booking_id: int, data: PayIn, user=Depends(get_current_user)):
    b = db.query_one("SELECT * FROM bookings WHERE id=?", (booking_id,))
    if not b:
        raise HTTPException(404, "Buyurtma topilmadi")
    if b["customer_id"] != user["id"]:
        raise HTTPException(403, "Ruxsat yo'q")
    if b["status"] != "yangi":
        raise HTTPException(400, "Buyurtma allaqachon to'langan yoki o'zgargan")
    payment = db.query_one("SELECT * FROM payments WHERE booking_id=? AND kind='booking' ORDER BY id DESC", (booking_id,))
    if not payment or payment["status"] == "paid":
        raise HTTPException(400, "To'lov topilmadi yoki allaqachon to'langan")
    method = data.method if data.method in ("click", "payme", "naqd") else "click"
    db.execute("UPDATE payments SET status='paid', method=?, commission=?, commission_rate=? WHERE id=?",
               (method, booking_commission(booking_id), blended_rate_pct(booking_id) / 100, payment["id"]))
    db.execute("UPDATE bookings SET status='kutmoqda' WHERE id=?", (booking_id,))
    srow = db.query_one("SELECT user_id FROM seller_profiles WHERE id=?", (b["seller_id"],))
    if srow:
        db.execute("INSERT INTO notifications(user_id,kind,text,link,created_at) VALUES(?,?,?,?,?)",
                   (srow["user_id"], "booking",
                    f"{b['code']} buyurtmasi to'landi. Tasdiqlashingiz kutilmoqda.", "/sotuvchi/buyurtmalar", db.now()))
    fresh = db.query_one("SELECT * FROM bookings WHERE id=?", (booking_id,))
    return serialize_booking(fresh, with_items=True, user=user)


@router.post("/bookings/{booking_id}/cancel")
def cancel_booking(booking_id: int, user=Depends(get_current_user)):
    b = db.query_one("SELECT * FROM bookings WHERE id=?", (booking_id,))
    if not b:
        raise HTTPException(404, "Buyurtma topilmadi")
    if b["customer_id"] != user["id"]:
        raise HTTPException(403, "Ruxsat yo'q")
    if b["status"] not in ("yangi", "kutmoqda"):
        raise HTTPException(400, "Bu bosqichda buyurtmani bekor qilib bo'lmaydi")
    db.execute("UPDATE bookings SET status='bekor' WHERE id=?", (booking_id,))
    fresh = db.query_one("SELECT * FROM bookings WHERE id=?", (booking_id,))
    return serialize_booking(fresh, user=user)


@router.post("/bookings/{booking_id}/status")
def update_status(booking_id: int, data: StatusIn, user=Depends(require_seller)):
    prof = db.query_one("SELECT * FROM seller_profiles WHERE user_id=?", (user["id"],))
    b = db.query_one("SELECT * FROM bookings WHERE id=?", (booking_id,))
    if not b:
        raise HTTPException(404, "Buyurtma topilmadi")
    if user["role"] != "admin" and (not prof or b["seller_id"] != prof["id"]):
        raise HTTPException(403, "Bu buyurtma sizga tegishli emas")
    target = data.status
    if target == "bekor":
        target = "bekor"
    allowed = STATUS_FLOW.get(b["status"], [])
    if data.status not in allowed:
        raise HTTPException(400, f"Hozirgi holatdan «{STATUS_LABEL_UZ.get(data.status, data.status)}» ga o'tib bo'lmaydi")
    new_status = "bekor" if data.status == "bekor" else data.status
    db.execute("UPDATE bookings SET status=? WHERE id=?", (new_status, booking_id))
    db.execute("INSERT INTO notifications(user_id,kind,text,link,created_at) VALUES(?,?,?,?,?)",
               (b["customer_id"], "status",
                f"{b['code']} buyurtma holati: {STATUS_LABEL_UZ[new_status]}", f"/buyurtma/{booking_id}", db.now()))
    fresh = db.query_one("SELECT * FROM bookings WHERE id=?", (booking_id,))
    return serialize_booking(fresh, user=user)


@router.post("/bookings/{booking_id}/dispute")
def open_dispute(booking_id: int, data: DisputeIn, user=Depends(get_current_user)):
    b = db.query_one("SELECT * FROM bookings WHERE id=?", (booking_id,))
    if not b:
        raise HTTPException(404, "Buyurtma topilmadi")
    prof = db.query_one("SELECT id FROM seller_profiles WHERE user_id=?", (user["id"],))
    is_party = b["customer_id"] == user["id"] or (prof is not None and prof["id"] == b["seller_id"])
    if not is_party:
        raise HTTPException(403, "Bu buyurtma bo'yicha nizo ochishga ruxsat yo'q")
    if data.reason not in DISPUTE_REASONS:
        raise HTTPException(422, "Noto'g'ri sabab")
    if b["status"] in ("yangi", "bekor"):
        raise HTTPException(400, "Bu holatda nizo ochib bo'lmaydi")
    if db.query_one("SELECT id FROM disputes WHERE booking_id=? AND status='open'", (booking_id,)):
        raise HTTPException(400, "Bu buyurtma bo'yicha ochiq nizo mavjud")
    db.execute(
        "INSERT INTO disputes(booking_id,opened_by,reason,description,status,created_at) VALUES(?,?,?,?,'open',?)",
        (booking_id, user["id"], data.reason, data.description.strip(), db.now()))
    link = f"/buyurtma/{booking_id}"
    if user["id"] != b["customer_id"]:
        _notify(b["customer_id"], "dispute", f"{b['code']} bo'yicha nizo ochildi. Admin ko'rib chiqadi.", link)
    if prof is None or prof["id"] != b["seller_id"]:
        srow = db.query_one("SELECT user_id FROM seller_profiles WHERE id=?", (b["seller_id"],))
        if srow:
            _notify(srow["user_id"], "dispute", f"{b['code']} bo'yicha nizo ochildi. Admin ko'rib chiqadi.", link)
    for a in db.query("SELECT id FROM users WHERE role='admin'"):
        _notify(a["id"], "dispute", f"Yangi nizo: {b['code']}", "/admin")
    return serialize_booking(db.query_one("SELECT * FROM bookings WHERE id=?", (booking_id,)),
                             with_items=True, user=user)


@router.post("/reviews")
def create_review(data: ReviewIn, user=Depends(get_current_user)):
    b = db.query_one("SELECT * FROM bookings WHERE id=?", (data.booking_id,))
    if not b or b["customer_id"] != user["id"]:
        raise HTTPException(404, "Buyurtma topilmadi")
    if b["status"] != "yakunlandi":
        raise HTTPException(400, "Faqat yakunlangan buyurtmalarga sharh qoldirish mumkin")
    item = db.query_one("SELECT * FROM booking_items WHERE booking_id=? AND product_id=?",
                        (data.booking_id, data.product_id))
    if not item:
        raise HTTPException(400, "Bu mahsulot buyurtmada emas")
    exists = db.query_one("SELECT id FROM reviews WHERE booking_id=? AND product_id=?",
                          (data.booking_id, data.product_id))
    if exists:
        raise HTTPException(400, "Bu mahsulotga allaqachon sharh qoldirilgan")
    photo = data.photo_url.strip()
    if photo and not photo.startswith("/media/uploads/"):
        raise HTTPException(422, "Rasm manzili noto'g'ri")
    db.execute(
        "INSERT INTO reviews(booking_id,customer_id,seller_id,product_id,rating,comment,photo_url,created_at) VALUES(?,?,?,?,?,?,?,?)",
        (data.booking_id, user["id"], b["seller_id"], data.product_id, data.rating, data.comment.strip(), photo, db.now()))
    # recompute product rating
    agg = db.query_one("SELECT ROUND(AVG(rating),2) AS r, COUNT(*) AS n FROM reviews WHERE product_id=?",
                       (data.product_id,))
    db.execute("UPDATE products SET rating=?, rating_count=? WHERE id=?",
               (agg["r"] or 0, agg["n"], data.product_id))
    # recompute seller rating
    db.execute("""
        UPDATE seller_profiles SET
          rating = COALESCE((SELECT ROUND(AVG(rating),2) FROM products
                             WHERE products.seller_id = seller_profiles.id AND rating_count > 0), 0),
          rating_count = COALESCE((SELECT SUM(rating_count) FROM products
                                   WHERE products.seller_id = seller_profiles.id), 0)
        WHERE id = ?""", (b["seller_id"],))
    srow = db.query_one("SELECT user_id FROM seller_profiles WHERE id=?", (b["seller_id"],))
    if srow:
        db.execute("INSERT INTO notifications(user_id,kind,text,link,created_at) VALUES(?,?,?,?,?)",
                   (srow["user_id"], "review", f"Yangi sharh: {data.rating}★", "/sotuvchi", db.now()))
    return {"ok": True}


@router.get("/products/{product_id}/reviews")
def product_reviews(product_id: int):
    rows = db.query(
        """SELECT r.id, r.rating, r.comment, r.photo_url, r.created_at, u.name AS customer_name
           FROM reviews r JOIN users u ON u.id = r.customer_id
           WHERE r.product_id = ? ORDER BY r.created_at DESC""", (product_id,))
    return {"items": rows}
