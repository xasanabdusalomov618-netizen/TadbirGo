"""Marketplace commission resolution.

Global rate lives in the `settings` table (percent, default 15). A category may
override it with its own rate (10–20%). Commission for a booking is the sum of
each line item's goods total multiplied by the rate of that item's category.
"""
from . import db

DEFAULT_RATE = 15.0
MIN_RATE = 10.0
MAX_RATE = 20.0


def global_rate_pct() -> float:
    row = db.query_one("SELECT value FROM settings WHERE key='commission_rate'")
    try:
        return float(row["value"]) if row else DEFAULT_RATE
    except (TypeError, ValueError):
        return DEFAULT_RATE


def category_rate_pct(category_id: int | None) -> float:
    if category_id is None:
        return global_rate_pct()
    row = db.query_one("SELECT commission_rate FROM categories WHERE id=?", (category_id,))
    if row and row["commission_rate"] is not None:
        return float(row["commission_rate"])
    return global_rate_pct()


def booking_commission(booking_id: int) -> int:
    """Commission in UZS for the goods subtotal of a booking."""
    items = db.query(
        """SELECT bi.total, p.category_id FROM booking_items bi
           LEFT JOIN products p ON p.id = bi.product_id WHERE bi.booking_id=?""",
        (booking_id,))
    total = 0.0
    for it in items:
        total += it["total"] * category_rate_pct(it["category_id"]) / 100.0
    return round(total)


def blended_rate_pct(booking_id: int) -> float:
    b = db.query_one("SELECT subtotal FROM bookings WHERE id=?", (booking_id,))
    if not b or not b["subtotal"]:
        return global_rate_pct()
    return round(booking_commission(booking_id) * 100.0 / b["subtotal"], 2)
