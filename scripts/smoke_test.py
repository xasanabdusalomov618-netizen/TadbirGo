"""Quick API smoke test."""
import datetime
import json
import urllib.request

BASE = "http://localhost:8000"


def call(method, path, token=None, body=None):
    req = urllib.request.Request(BASE + path, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    data = json.dumps(body).encode() if body is not None else None
    try:
        with urllib.request.urlopen(req, data=data) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"{}")


def main():
    # login customer
    s, d = call("POST", "/api/auth/login", body={"email": "mijoz@tadbirgo.uz", "password": "mijoz123"})
    assert s == 200, d
    tok = d["token"]
    print("login customer OK, role:", d["user"]["role"])

    s, d = call("GET", "/api/bookings", tok)
    print("customer bookings:", [(b["code"], b["status"]) for b in d["items"]])

    # checkout spanning 2 sellers -> 2 bookings
    s, d = call("POST", "/api/checkout", tok, {
        "items": [{"product_id": 1, "quantity": 5}, {"product_id": 9, "quantity": 1}],
        "event_date": "2026-10-25", "event_type": "toy", "location": "Toshkent, Test",
        "guests": 50, "delivery": "express", "installation": True, "pickup": False})
    assert s == 200, d
    print("checkout OK ->", [(b["code"], b["seller_name"], b["total"]) for b in d["bookings"]])
    checkout_booking_id = d["bookings"][0]["id"]
    bid = d["bookings"][0]["id"]

    # pay booking
    s, d = call("POST", f"/api/bookings/{bid}/pay", tok, {"method": "payme"})
    assert s == 200, d
    print("pay OK -> status:", d["status"])

    # blocked date conflict
    bad_date = (datetime.date.today() + datetime.timedelta(days=7)).isoformat()
    s, d = call("POST", "/api/checkout", tok, {
        "items": [{"product_id": 3, "quantity": 1}], "event_date": bad_date,
        "event_type": "toy", "location": "Toshkent", "guests": 100,
        "delivery": "standard", "installation": False, "pickup": False})
    assert s == 422, (s, d)
    print("blocked-date rejected OK:", d.get("detail"))

    # login seller + overview
    s, d = call("POST", "/api/auth/login", body={"email": "seller1@tadbirgo.uz", "password": "tadbir123"})
    stok = d["token"]
    print("login seller OK")
    s, d = call("GET", "/api/seller/overview", stok)
    assert s == 200, d
    print("seller overview:", d["stats"])

    # seller accepts booking (find a kutmoqda booking for seller1)
    s, d = call("GET", "/api/bookings", stok)
    kut = next((b for b in d["items"] if b["status"] == "kutmoqda"), None)
    if kut:
        s, d = call("POST", f"/api/bookings/{kut['id']}/status", stok, {"status": "tasdiqlandi"})
        print("seller accept ->", d.get("status"), d.get("detail"))
        # advance to tayyorlanmoqda
        s, d = call("POST", f"/api/bookings/{kut['id']}/status", stok, {"status": "tayyorlanmoqda"})
        print("advance ->", d.get("status"), d.get("detail"))

    # login admin + stats
    s, d = call("POST", "/api/auth/login", body={"email": "admin@tadbirgo.uz", "password": "admin123"})
    atok = d["token"]
    s, d = call("GET", "/api/admin/stats", atok)
    assert s == 200, d
    print("admin stats:", {k: d[k] for k in ("users", "sellers", "bookings", "revenue", "active_listings", "pending_products", "pending_sellers")})
    print("monthly:", d["monthly"])

    # register new seller
    s, d = call("POST", "/api/auth/register", body={
        "name": "Test Sotuvchi", "email": f"test_s{datetime.datetime.now().microsecond}@mail.uz",
        "password": "test123", "role": "seller", "company_name": "Test Do'kon", "location": "Toshkent",
        "tax_id": "123456789", "pinfl": "12345678901234", "passport": "AA1234567"})
    assert s == 200, d
    print("register seller OK, approved:", d["user"]["seller"]["approved"])

    # role guard: customer cannot access seller API
    s, d = call("GET", "/api/seller/overview", tok)
    assert s == 403, (s, d)
    print("role guard OK (customer blocked from seller API)")

    # ---- v2: disputes, status override, commission, categories, suspension ----
    s, d = call("POST", "/api/auth/register", body={
        "name": "Bad Sotuvchi", "email": f"bad_s{datetime.datetime.now().microsecond}@mail.uz",
        "password": "test123", "role": "seller", "company_name": "Bad Do'kon", "location": "Toshkent",
        "tax_id": "12345", "pinfl": "1", "passport": "X"})
    assert s == 422, (s, d)
    print("seller verification validation OK")

    s, d = call("GET", "/api/categories")
    cats = {c["slug"]: c for c in d["items"]}
    assert "boshlovchi" in cats and "animator" in cats and "xizmatchi" in cats, list(cats)
    s, d = call("GET", "/api/products?limit=60")
    assert d["total"] >= 25, d["total"]
    print("catalog OK:", d["total"], "products,", len(cats), "categories")

    s, d = call("GET", "/api/products?min_rating=4.8&date=2026-12-01&date_to=2026-12-03")
    assert s == 200 and all(p["rating"] >= 4.8 for p in d["items"]), d
    print("rating + date-range filter OK:", d["total"])

    s, d = call("POST", "/api/auth/login", body={"email": "admin@tadbirgo.uz", "password": "admin123"})
    atok = d["token"]
    s, d = call("GET", "/api/admin/disputes", atok)
    mine = [x for x in d["items"] if x["booking_id"] == checkout_booking_id and x["status"] == "open"]
    if not mine:
        # re-runnable: open a fresh dispute from the customer on the PAID booking just created
        s, _ = call("POST", f"/api/bookings/{checkout_booking_id}/dispute", tok,
                    {"reason": "late_delivery", "description": "Smoke test: jihoz kech yetkazildi"})
        assert s == 200, _
        s, d = call("GET", "/api/admin/disputes", atok)
        mine = [x for x in d["items"] if x["booking_id"] == checkout_booking_id and x["status"] == "open"]
    assert s == 200 and d["open"] >= 1 and mine, d
    did = mine[0]["id"]
    print("disputes listed:", d["open"], "open; resolving dispute", did)

    s, d = call("POST", f"/api/admin/disputes/{did}/resolve", atok, {"action": "partial", "amount": 100000, "note": "test"})
    assert s == 200, d
    print("partial refund resolved OK")

    s, d = call("PUT", "/api/admin/settings", atok, {"commission_rate": 25})
    assert s == 422, (s, d)
    s, d = call("PUT", "/api/admin/settings", atok, {"commission_rate": 15})
    assert s == 200, d
    s, d = call("POST", "/api/admin/categories", atok, {"name_uz": "Test kategoriya", "name_en": "Test cat", "commission_rate": 19})
    assert s == 200, d
    cid = d["id"]
    s, d = call("PUT", f"/api/admin/categories/{cid}", atok, {"name_uz": "Test kategoriya", "name_en": "Test cat", "commission_rate": 25})
    assert s == 422, (s, d)
    s, d = call("DELETE", f"/api/admin/categories/{cid}", atok)
    assert s == 200, d
    print("settings + category manager OK")

    s, cur = call("GET", "/api/bookings/1", atok)
    target = "tayyorlanmoqda" if cur.get("status") == "tasdiqlandi" else "tasdiqlandi"
    s, d = call("POST", "/api/admin/bookings/1/status", atok, {"status": target, "note": "test"})
    assert s == 200, d
    print("admin status override OK ->", d["status"])

    print("\nALL SMOKE TESTS PASSED")


if __name__ == "__main__":
    main()
