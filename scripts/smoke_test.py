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
    ok = True

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
        "password": "test123", "role": "seller", "company_name": "Test Do'kon", "location": "Toshkent"})
    assert s == 200, d
    print("register seller OK, approved:", d["user"]["seller"]["approved"])

    # role guard: customer cannot access seller API
    s, d = call("GET", "/api/seller/overview", tok)
    assert s == 403, (s, d)
    print("role guard OK (customer blocked from seller API)")

    print("\nALL SMOKE TESTS PASSED")


if __name__ == "__main__":
    main()
