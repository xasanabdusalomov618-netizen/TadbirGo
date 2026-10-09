"""Public catalog endpoints: categories, products, locations."""
from fastapi import APIRouter, HTTPException, Query

from .. import db

router = APIRouter(prefix="/api", tags=["catalog"])


def serialize_product(p: dict, with_extra: bool = False) -> dict:
    cat = db.query_one("SELECT * FROM categories WHERE id=?", (p["category_id"],)) or {}
    seller = db.query_one("SELECT * FROM seller_profiles WHERE id=?", (p["seller_id"],)) or {}
    img = db.query_one("SELECT url FROM product_images WHERE product_id=? ORDER BY position LIMIT 1", (p["id"],))
    featured = bool(p["featured_until"] and p["featured_until"] >= db.today())
    out = {
        "id": p["id"],
        "name": p["name"],
        "name_ru": p["name_ru"],
        "name_en": p["name_en"],
        "description": p["description"],
        "price": p["price"],
        "price_type": p["price_type"],
        "location": p["location"],
        "quantity": p["quantity"],
        "available": bool(p["available"]),
        "approved": bool(p["approved"]),
        "featured": featured,
        "rating": p["rating"],
        "rating_count": p["rating_count"],
        "views": p["views"],
        "created_at": p["created_at"],
        "image": img["url"] if img else None,
        "category": {
            "id": cat.get("id"), "slug": cat.get("slug"), "icon": cat.get("icon"),
            "name_uz": cat.get("name_uz"), "name_ru": cat.get("name_ru"), "name_en": cat.get("name_en"),
        },
        "seller": {
            "id": seller.get("id"), "company_name": seller.get("company_name"),
            "rating": seller.get("rating"), "approved": bool(seller.get("approved")),
            "verified": seller.get("verification_status") == "verified",
            "suspended": bool(seller.get("suspended")),
            "premium": bool(seller.get("premium_until") and seller["premium_until"] >= db.today()),
            "location": seller.get("location"),
        },
    }
    if with_extra:
        out["images"] = [r["url"] for r in db.query(
            "SELECT url FROM product_images WHERE product_id=? ORDER BY position", (p["id"],))]
        out["blocked_dates"] = [r["blocked_date"] for r in db.query(
            "SELECT blocked_date FROM availability WHERE product_id=? ORDER BY blocked_date", (p["id"],))]
    return out


@router.get("/categories")
def list_categories():
    rows = db.query("""
        SELECT c.*, COUNT(p.id) AS product_count
        FROM categories c
        LEFT JOIN products p ON p.category_id = c.id AND p.approved = 1 AND p.available = 1
        GROUP BY c.id ORDER BY c.sort
    """)
    return {"items": rows}


@router.get("/stats/public")
def public_stats():
    row = db.query_one(
        """SELECT
             (SELECT COUNT(*) FROM products WHERE approved=1 AND available=1) AS products,
             (SELECT COUNT(*) FROM seller_profiles WHERE approved=1) AS sellers,
             (SELECT COUNT(*) FROM bookings WHERE status NOT IN ('yangi','bekor')) AS bookings,
             (SELECT COUNT(DISTINCT location) FROM products WHERE approved=1) AS cities,
             (SELECT COUNT(*) FROM reviews) AS reviews""")
    return row


@router.get("/locations")
def list_locations():
    rows = db.query("SELECT DISTINCT location FROM products WHERE approved=1 ORDER BY location")
    return {"items": [r["location"] for r in rows]}


@router.get("/products")
def list_products(
    search: str = "",
    category: str = "",
    location: str = "",
    min_price: int = Query(0, ge=0),
    max_price: int = Query(0, ge=0),
    date: str = "",
    date_to: str = "",
    min_rating: float = Query(0, ge=0, le=5),
    sort: str = "popular",
    featured: bool = False,
    page: int = Query(1, ge=1),
    limit: int = Query(24, ge=1, le=60),
):
    where = ["p.approved = 1", "p.available = 1", "sp.suspended = 0"]
    params: list = []
    if search:
        where.append("(p.name LIKE ? OR p.name_ru LIKE ? OR p.name_en LIKE ? OR p.description LIKE ?)")
        like = f"%{search}%"
        params += [like, like, like, like]
    if category:
        where.append("c.slug = ?")
        params.append(category)
    if location:
        where.append("p.location = ?")
        params.append(location)
    if min_price > 0:
        where.append("p.price >= ?")
        params.append(min_price)
    if max_price > 0:
        where.append("p.price <= ?")
        params.append(max_price)
    if date and date_to and date_to >= date:
        where.append("NOT EXISTS (SELECT 1 FROM availability a WHERE a.product_id = p.id "
                     "AND a.blocked_date BETWEEN ? AND ?)")
        params += [date, date_to]
    elif date:
        where.append("NOT EXISTS (SELECT 1 FROM availability a WHERE a.product_id = p.id AND a.blocked_date = ?)")
        params.append(date)
    if min_rating > 0:
        where.append("p.rating >= ?")
        params.append(min_rating)
    if featured:
        where.append("p.featured_until >= ?")
        params.append(db.today())

    order = {
        "price_asc": "p.price ASC",
        "price_desc": "p.price DESC",
        "new": "p.id DESC",
        "rating": "p.rating DESC, p.rating_count DESC",
    }.get(sort, "p.views DESC, p.rating DESC")

    where_sql = " AND ".join(where)
    total = db.query_one(
        f"SELECT COUNT(*) AS n FROM products p JOIN categories c ON c.id=p.category_id JOIN seller_profiles sp ON sp.id=p.seller_id WHERE {where_sql}",
        tuple(params))["n"]
    rows = db.query(
        f"SELECT p.* FROM products p JOIN categories c ON c.id=p.category_id JOIN seller_profiles sp ON sp.id=p.seller_id WHERE {where_sql} "
        f"ORDER BY p.featured_until >= ? DESC, {order} LIMIT ? OFFSET ?",
        tuple(params) + (db.today(), limit, (page - 1) * limit),
    )
    return {
        "items": [serialize_product(r) for r in rows],
        "total": total,
        "page": page,
        "pages": max(1, (total + limit - 1) // limit),
    }


@router.get("/products/{product_id}")
def product_detail(product_id: int):
    p = db.query_one("SELECT * FROM products WHERE id=?", (product_id,))
    if not p:
        raise HTTPException(404, "Mahsulot topilmadi")
    db.execute("UPDATE products SET views = views + 1 WHERE id=?", (product_id,))
    out = serialize_product(p, with_extra=True)
    out["reviews"] = db.query(
        """SELECT r.id, r.rating, r.comment, r.photo_url, r.created_at, r.product_id, u.name AS customer_name
           FROM reviews r JOIN users u ON u.id = r.customer_id
           WHERE r.product_id = ? ORDER BY r.created_at DESC LIMIT 20""",
        (product_id,))
    seller = db.query_one("SELECT * FROM seller_profiles WHERE id=?", (p["seller_id"],))
    if seller:
        out["seller"]["description"] = seller["description"]
        out["seller"]["phone"] = seller["phone"]
        out["seller"]["review_count"] = seller["rating_count"]
    return out


@router.get("/delivery-options")
def delivery_options():
    return {"items": db.query("SELECT * FROM delivery_options ORDER BY id")}
