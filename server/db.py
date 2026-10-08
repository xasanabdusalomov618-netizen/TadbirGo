"""SQLite database layer for TadbirGo."""
import os
import sqlite3
import threading
from datetime import datetime, timezone

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)
DB_PATH = os.path.join(DATA_DIR, "tadbirgo.db")

_lock = threading.RLock()
_conn = None


def now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


def today() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def get_conn() -> sqlite3.Connection:
    global _conn
    if _conn is None:
        _conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        _conn.row_factory = sqlite3.Row
        _conn.execute("PRAGMA journal_mode=WAL")
        _conn.execute("PRAGMA foreign_keys=ON")
    return _conn


def query(sql: str, params: tuple = ()) -> list:
    with _lock:
        cur = get_conn().execute(sql, params)
        return [dict(r) for r in cur.fetchall()]


def query_one(sql: str, params: tuple = ()):
    with _lock:
        cur = get_conn().execute(sql, params)
        row = cur.fetchone()
        return dict(row) if row else None


def execute(sql: str, params: tuple = ()) -> int:
    with _lock:
        conn = get_conn()
        cur = conn.execute(sql, params)
        conn.commit()
        return cur.lastrowid


SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  phone TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','seller','admin')),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS seller_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  description TEXT DEFAULT '',
  location TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  approved INTEGER NOT NULL DEFAULT 0,
  premium_until TEXT,
  rating REAL NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name_uz TEXT NOT NULL,
  name_ru TEXT NOT NULL,
  name_en TEXT NOT NULL,
  icon TEXT DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  seller_id INTEGER NOT NULL REFERENCES seller_profiles(id),
  category_id INTEGER NOT NULL REFERENCES categories(id),
  name TEXT NOT NULL,
  name_ru TEXT DEFAULT '',
  name_en TEXT DEFAULT '',
  description TEXT DEFAULT '',
  price INTEGER NOT NULL,
  price_type TEXT NOT NULL DEFAULT 'kun',
  location TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  available INTEGER NOT NULL DEFAULT 1,
  approved INTEGER NOT NULL DEFAULT 0,
  featured_until TEXT,
  rating REAL NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  views INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS product_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS availability (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  blocked_date TEXT NOT NULL,
  UNIQUE(product_id, blocked_date)
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  customer_id INTEGER NOT NULL REFERENCES users(id),
  seller_id INTEGER NOT NULL REFERENCES seller_profiles(id),
  event_date TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'toy',
  location TEXT NOT NULL,
  guests INTEGER NOT NULL DEFAULT 0,
  subtotal INTEGER NOT NULL,
  delivery_fee INTEGER NOT NULL DEFAULT 0,
  installation_fee INTEGER NOT NULL DEFAULT 0,
  pickup_fee INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'yangi',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS booking_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price INTEGER NOT NULL,
  total INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS event_packages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  name TEXT DEFAULT '',
  event_type TEXT NOT NULL,
  guests INTEGER NOT NULL DEFAULT 0,
  event_date TEXT DEFAULT '',
  location TEXT DEFAULT '',
  budget INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS package_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  package_id INTEGER NOT NULL REFERENCES event_packages(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS delivery_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL DEFAULT 'delivery',
  name_uz TEXT NOT NULL,
  name_ru TEXT NOT NULL,
  name_en TEXT NOT NULL,
  price INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL REFERENCES users(id),
  seller_id INTEGER NOT NULL REFERENCES seller_profiles(id),
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  UNIQUE(booking_id, product_id)
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  kind TEXT NOT NULL DEFAULT 'booking',
  amount INTEGER NOT NULL,
  commission_rate REAL NOT NULL DEFAULT 0,
  commission INTEGER NOT NULL DEFAULT 0,
  method TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  text TEXT NOT NULL,
  link TEXT DEFAULT '',
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_seller ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_seller ON bookings(seller_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
"""


def init_db() -> None:
    with _lock:
        conn = get_conn()
        conn.executescript(SCHEMA)
        conn.commit()
