"""Notifications and saved event packages."""
from fastapi import APIRouter, Depends, File, UploadFile
from pydantic import BaseModel, Field

from .. import db
from ..auth import get_current_user
from .seller_routes import upload_image

router = APIRouter(prefix="/api", tags=["misc"])


class PackageItem(BaseModel):
    product_id: int
    quantity: int = Field(ge=1, le=2000)


class PackageIn(BaseModel):
    name: str = ""
    event_type: str
    guests: int = 0
    event_date: str = ""
    location: str = ""
    budget: int = 0
    total: int = 0
    items: list[PackageItem] = []


@router.post("/uploads")
async def upload_public(file: UploadFile = File(...), user=Depends(get_current_user)):
    """Image upload for any signed-in user (e.g. review photos)."""
    return await upload_image(file, user)


@router.get("/notifications")
def notifications(user=Depends(get_current_user)):
    rows = db.query("SELECT * FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 30", (user["id"],))
    unread = db.query_one("SELECT COUNT(*) AS n FROM notifications WHERE user_id=? AND is_read=0", (user["id"],))["n"]
    return {"items": rows, "unread": unread}


@router.post("/notifications/read")
def mark_read(user=Depends(get_current_user)):
    db.execute("UPDATE notifications SET is_read=1 WHERE user_id=?", (user["id"],))
    return {"ok": True}


@router.post("/packages")
def save_package(data: PackageIn, user=Depends(get_current_user)):
    pid = db.execute(
        "INSERT INTO event_packages(user_id,name,event_type,guests,event_date,location,budget,total,created_at)"
        " VALUES(?,?,?,?,?,?,?,?,?)",
        (user["id"], data.name.strip(), data.event_type, data.guests, data.event_date,
         data.location.strip(), data.budget, data.total, db.now()))
    for item in data.items:
        db.execute("INSERT INTO package_items(package_id,product_id,quantity) VALUES(?,?,?)",
                   (pid, item.product_id, item.quantity))
    return {"id": pid, "ok": True}


@router.get("/packages")
def my_packages(user=Depends(get_current_user)):
    rows = db.query("SELECT * FROM event_packages WHERE user_id=? ORDER BY id DESC", (user["id"],))
    for r in rows:
        r["items"] = db.query(
            """SELECT pi.quantity, p.name, p.price, img.url AS image
               FROM package_items pi
               LEFT JOIN products p ON p.id = pi.product_id
               LEFT JOIN product_images img ON img.product_id = p.id AND img.position = 0
               WHERE pi.package_id = ?""", (r["id"],))
    return {"items": rows}
