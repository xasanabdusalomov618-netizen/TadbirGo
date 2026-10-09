"""Registration, login, profile."""
import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from .. import db
from ..auth import create_token, get_current_user, hash_password, public_user, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: str
    password: str = Field(min_length=6, max_length=100)
    phone: str = ""
    role: str = "customer"
    company_name: str = ""
    location: str = ""
    description: str = ""
    tax_id: str = ""      # STIR — 9 digits
    pinfl: str = ""       # PINFL — 14 digits
    passport: str = ""    # e.g. AA1234567


class LoginIn(BaseModel):
    email: str
    password: str


class ProfileIn(BaseModel):
    name: str | None = None
    phone: str | None = None


class PasswordIn(BaseModel):
    old_password: str
    new_password: str = Field(min_length=6, max_length=100)


@router.post("/register")
def register(data: RegisterIn):
    if not EMAIL_RE.match(data.email):
        raise HTTPException(422, "Email manzil noto'g'ri formatda")
    if data.role not in ("customer", "seller"):
        raise HTTPException(422, "Noto'g'ri rol")
    if db.query_one("SELECT id FROM users WHERE email=?", (data.email,)):
        raise HTTPException(409, "Bu email allaqachon ro'yxatdan o'tgan")
    if data.role == "seller":
        if len(data.company_name.strip()) < 2:
            raise HTTPException(422, "Do'kon nomini kiriting")
        if not re.fullmatch(r"\d{9}", data.tax_id.strip()):
            raise HTTPException(422, "STIR 9 ta raqamdan iborat bo'lishi kerak")
        if not re.fullmatch(r"\d{14}", data.pinfl.strip()):
            raise HTTPException(422, "PINFL 14 ta raqamdan iborat bo'lishi kerak")
        if not re.fullmatch(r"[A-Za-z]{2}\d{7}", data.passport.strip()):
            raise HTTPException(422, "Pasport seriya va raqami noto'g'ri (masalan AA1234567)")

    uid = db.execute(
        "INSERT INTO users(name,email,password_hash,phone,role,created_at) VALUES(?,?,?,?,?,?)",
        (data.name.strip(), data.email.strip(), hash_password(data.password),
         data.phone.strip(), data.role, db.now()),
    )
    if data.role == "seller":
        db.execute(
            "INSERT INTO seller_profiles(user_id,company_name,description,location,phone,approved,created_at,"
            "tax_id,pinfl,passport,verification_status)"
            " VALUES(?,?,?,?,?,0,?,?,?,?,'pending')",
            (uid, data.company_name.strip(), data.description.strip(), data.location.strip(),
             data.phone.strip(), db.now(), data.tax_id.strip(), data.pinfl.strip(), data.passport.strip().upper()),
        )
        admin = db.query("SELECT id FROM users WHERE role='admin'")
        for a in admin:
            db.execute("INSERT INTO notifications(user_id,kind,text,link,created_at) VALUES(?,?,?,?,?)",
                       (a["id"], "seller", f"Yangi sotuvchi ro'yxatdan o'tdi: {data.company_name}", "/admin", db.now()))
    token = create_token(uid, data.role)
    user = db.query_one("SELECT * FROM users WHERE id=?", (uid,))
    return {"token": token, "user": public_user(user)}


@router.post("/login")
def login(data: LoginIn):
    user = db.query_one("SELECT * FROM users WHERE email=?", (data.email,))
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(401, "Email yoki parol noto'g'ri")
    token = create_token(user["id"], user["role"])
    return {"token": token, "user": public_user(user)}


@router.get("/me")
def me(user=Depends(get_current_user)):
    return public_user(user)


@router.put("/me")
def update_profile(data: ProfileIn, user=Depends(get_current_user)):
    name = data.name.strip() if data.name is not None else user["name"]
    phone = data.phone.strip() if data.phone is not None else user.get("phone", "")
    if len(name) < 2:
        raise HTTPException(422, "Ism juda qisqa")
    db.execute("UPDATE users SET name=?, phone=? WHERE id=?", (name, phone, user["id"]))
    fresh = db.query_one("SELECT * FROM users WHERE id=?", (user["id"],))
    return public_user(fresh)


@router.put("/password")
def change_password(data: PasswordIn, user=Depends(get_current_user)):
    full = db.query_one("SELECT * FROM users WHERE id=?", (user["id"],))
    if not verify_password(data.old_password, full["password_hash"]):
        raise HTTPException(400, "Joriy parol noto'g'ri")
    db.execute("UPDATE users SET password_hash=? WHERE id=?", (hash_password(data.new_password), user["id"]))
    return {"ok": True}
