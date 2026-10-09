"""Authentication & authorization helpers."""
import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import HTTPException, Request

from . import db

SECRET = os.environ.get("TADBIRGO_SECRET", "tadbirgo-production-secret-key-2026-x9f3kq8mzv71")
ALG = "HS256"
TOKEN_DAYS = 14


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 120_000).hex()
    return f"{salt}${digest}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt, digest = stored.split("$", 1)
    except ValueError:
        return False
    check = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 120_000).hex()
    return secrets.compare_digest(check, digest)


def create_token(user_id: int, role: str) -> str:
    payload = {
        "sub": str(user_id),
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=TOKEN_DAYS),
    }
    return jwt.encode(payload, SECRET, algorithm=ALG)


def decode_token(token: str):
    try:
        return jwt.decode(token, SECRET, algorithms=[ALG])
    except jwt.PyJWTError:
        return None


def get_current_user(request: Request):
    """Return the authenticated user dict or raise 401."""
    auth = request.headers.get("authorization", "")
    if not auth.lower().startswith("bearer "):
        raise HTTPException(401, "Avtorizatsiya talab qilinadi")
    payload = decode_token(auth[7:].strip())
    if not payload:
        raise HTTPException(401, "Sessiya muddati tugagan, qayta kiring")
    try:
        uid = int(payload.get("sub"))
    except (TypeError, ValueError):
        raise HTTPException(401, "Sessiya muddati tugagan, qayta kiring")
    user = db.query_one("SELECT * FROM users WHERE id = ?", (uid,))
    if not user:
        raise HTTPException(401, "Foydalanuvchi topilmadi")
    user.pop("password_hash", None)
    return user


def get_optional_user(request: Request):
    auth = request.headers.get("authorization", "")
    if not auth.lower().startswith("bearer "):
        return None
    payload = decode_token(auth[7:].strip())
    if not payload:
        return None
    try:
        uid = int(payload.get("sub"))
    except (TypeError, ValueError):
        return None
    user = db.query_one("SELECT * FROM users WHERE id = ?", (uid,))
    if user:
        user.pop("password_hash", None)
    return user


def require_role(*roles):
    def checker(request: Request):
        user = get_current_user(request)
        if user["role"] not in roles:
            raise HTTPException(403, "Bu amaliyot uchun ruxsat yo'q")
        return user
    return checker


require_admin = require_role("admin")


def require_seller(request: Request):
    user = get_current_user(request)
    if user["role"] not in ("seller", "admin"):
        raise HTTPException(403, "Bu sahifa faqat sotuvchilar uchun")
    return user


def seller_profile_for(user: dict):
    return db.query_one("SELECT * FROM seller_profiles WHERE user_id = ?", (user["id"],))


def public_user(user: dict, include_seller: bool = True) -> dict:
    out = {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "phone": user.get("phone", ""),
        "role": user["role"],
        "created_at": user["created_at"],
    }
    if include_seller and user["role"] == "seller":
        out["seller"] = seller_profile_for(user)
    return out
