"""Admin dashboard endpoints."""
from fastapi import APIRouter, Depends, HTTPException

from .. import db
from ..auth import require_admin

router = APIRouter(prefix="/api/admin", tags=["admin"])


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
             COALESCE((SELECT SUM(commission) FROM payments WHERE status='paid' AND kind='booking'),0) AS commission
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
    db.execute("UPDATE seller_profiles SET approved=1 WHERE id=?", (seller_id,))
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
