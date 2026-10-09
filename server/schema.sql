-- ============================================================================
--  EventBox UZ — relational schema
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  email         TEXT    NOT NULL UNIQUE,
  phone         TEXT,
  password_hash TEXT    NOT NULL,
  role          TEXT    NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','seller','admin')),
  avatar_url    TEXT,
  city          TEXT,
  language      TEXT    NOT NULL DEFAULT 'uz',
  theme         TEXT    NOT NULL DEFAULT 'light',
  is_blocked    INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS seller_profiles (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  business_name   TEXT    NOT NULL,
  slug            TEXT    NOT NULL UNIQUE,
  description     TEXT,
  city            TEXT,
  district        TEXT,
  address         TEXT,
  phone           TEXT,
  telegram        TEXT,
  logo_url        TEXT,
  rating          REAL    NOT NULL DEFAULT 0,
  review_count    INTEGER NOT NULL DEFAULT 0,
  is_approved     INTEGER NOT NULL DEFAULT 0,
  is_premium      INTEGER NOT NULL DEFAULT 0,
  premium_until   TEXT,
  commission_rate REAL    NOT NULL DEFAULT 0.12,
  featured        INTEGER NOT NULL DEFAULT 0,
  balance         INTEGER NOT NULL DEFAULT 0,
  total_earnings  INTEGER NOT NULL DEFAULT 0,
  completed_orders INTEGER NOT NULL DEFAULT 0,
  response_hours  INTEGER NOT NULL DEFAULT 2,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  slug           TEXT    NOT NULL UNIQUE,
  name_uz        TEXT    NOT NULL,
  name_ru        TEXT    NOT NULL,
  name_en        TEXT    NOT NULL,
  description_uz TEXT,
  description_ru TEXT,
  description_en TEXT,
  icon           TEXT    NOT NULL DEFAULT 'Package',
  accent         TEXT    NOT NULL DEFAULT '#6366f1',
  sort_order     INTEGER NOT NULL DEFAULT 0,
  is_active      INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS products (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  seller_id     INTEGER NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
  category_id   INTEGER NOT NULL REFERENCES categories(id),
  name          TEXT    NOT NULL,
  description   TEXT,
  price         INTEGER NOT NULL DEFAULT 0,
  price_type    TEXT    NOT NULL DEFAULT 'day' CHECK (price_type IN ('hour','day','event','person','set')),
  deposit       INTEGER NOT NULL DEFAULT 0,
  city          TEXT,
  district      TEXT,
  address       TEXT,
  quantity      INTEGER NOT NULL DEFAULT 1,
  available     INTEGER NOT NULL DEFAULT 1,
  rating        REAL    NOT NULL DEFAULT 0,
  review_count  INTEGER NOT NULL DEFAULT 0,
  featured      INTEGER NOT NULL DEFAULT 0,
  featured_until TEXT,
  is_approved   INTEGER NOT NULL DEFAULT 1,
  is_active     INTEGER NOT NULL DEFAULT 1,
  views         INTEGER NOT NULL DEFAULT 0,
  min_order     INTEGER NOT NULL DEFAULT 1,
  unit_note     TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS product_images (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url        TEXT    NOT NULL,
  is_primary INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS availability (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  date       TEXT    NOT NULL,
  status     TEXT    NOT NULL DEFAULT 'available' CHECK (status IN ('available','booked','blocked')),
  note       TEXT,
  UNIQUE (product_id, date)
);

CREATE TABLE IF NOT EXISTS delivery_options (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  code               TEXT    NOT NULL UNIQUE,
  name_uz            TEXT    NOT NULL,
  name_ru            TEXT    NOT NULL,
  name_en            TEXT    NOT NULL,
  description_uz     TEXT,
  description_ru     TEXT,
  description_en     TEXT,
  icon               TEXT    NOT NULL DEFAULT 'Truck',
  base_fee           INTEGER NOT NULL DEFAULT 0,
  per_km_fee         INTEGER NOT NULL DEFAULT 0,
  installation_fee   INTEGER NOT NULL DEFAULT 0,
  express_multiplier REAL    NOT NULL DEFAULT 1,
  eta_hours          INTEGER NOT NULL DEFAULT 24,
  is_active          INTEGER NOT NULL DEFAULT 1,
  sort_order         INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS bookings (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  code             TEXT    NOT NULL UNIQUE,
  customer_id      INTEGER NOT NULL REFERENCES users(id),
  seller_id        INTEGER NOT NULL REFERENCES seller_profiles(id),
  event_date       TEXT,
  end_date         TEXT,
  event_type       TEXT,
  city             TEXT,
  district         TEXT,
  address          TEXT,
  guests           INTEGER NOT NULL DEFAULT 0,
  subtotal         INTEGER NOT NULL DEFAULT 0,
  delivery_fee     INTEGER NOT NULL DEFAULT 0,
  installation_fee INTEGER NOT NULL DEFAULT 0,
  service_fee      INTEGER NOT NULL DEFAULT 0,
  discount         INTEGER NOT NULL DEFAULT 0,
  commission       INTEGER NOT NULL DEFAULT 0,
  total            INTEGER NOT NULL DEFAULT 0,
  status           TEXT    NOT NULL DEFAULT 'yangi',
  delivery_option_id INTEGER REFERENCES delivery_options(id),
  delivery_type    TEXT,
  payment_method   TEXT    NOT NULL DEFAULT 'cash',
  payment_status   TEXT    NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','refunded')),
  notes            TEXT,
  cancel_reason    TEXT,
  created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS booking_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id  INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  product_id  INTEGER REFERENCES products(id) ON DELETE SET NULL,
  name        TEXT    NOT NULL,
  image_url   TEXT,
  price       INTEGER NOT NULL DEFAULT 0,
  price_type  TEXT    NOT NULL DEFAULT 'day',
  quantity    INTEGER NOT NULL DEFAULT 1,
  units       REAL    NOT NULL DEFAULT 1,
  subtotal    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS event_packages (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT,
  event_type   TEXT,
  guests       INTEGER NOT NULL DEFAULT 0,
  event_date   TEXT,
  city         TEXT,
  budget       INTEGER NOT NULL DEFAULT 0,
  items_count  INTEGER NOT NULL DEFAULT 0,
  estimate_total INTEGER NOT NULL DEFAULT 0,
  status       TEXT    NOT NULL DEFAULT 'draft',
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS package_items (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  package_id INTEGER NOT NULL REFERENCES event_packages(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity   INTEGER NOT NULL DEFAULT 1,
  note       TEXT
);

CREATE TABLE IF NOT EXISTS reviews (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id   INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id  INTEGER NOT NULL REFERENCES users(id),
  seller_id    INTEGER NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
  product_id   INTEGER REFERENCES products(id) ON DELETE SET NULL,
  rating       INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      TEXT,
  seller_reply TEXT,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (booking_id, product_id)
);

CREATE TABLE IF NOT EXISTS payments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  seller_id  INTEGER REFERENCES seller_profiles(id) ON DELETE SET NULL,
  amount     INTEGER NOT NULL DEFAULT 0,
  type       TEXT    NOT NULL DEFAULT 'booking' CHECK (type IN ('booking','commission','subscription','featured','advertising','payout')),
  method     TEXT    NOT NULL DEFAULT 'card' CHECK (method IN ('card','cash','click','payme','balance')),
  status     TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','refunded')),
  reference  TEXT,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT    NOT NULL DEFAULT 'system',
  payload    TEXT    NOT NULL DEFAULT '{}',
  link       TEXT,
  is_read    INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  seller_id  INTEGER NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
  plan       TEXT    NOT NULL DEFAULT 'premium',
  price      INTEGER NOT NULL DEFAULT 0,
  starts_at  TEXT    NOT NULL,
  ends_at    TEXT    NOT NULL,
  status     TEXT    NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','cancelled'))
);

CREATE TABLE IF NOT EXISTS advertisements (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  seller_id   INTEGER REFERENCES seller_profiles(id) ON DELETE CASCADE,
  title       TEXT    NOT NULL,
  image_url   TEXT,
  link        TEXT,
  placement   TEXT    NOT NULL DEFAULT 'home',
  budget      INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks      INTEGER NOT NULL DEFAULT 0,
  is_active   INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_products_seller ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_city ON products(city);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_seller ON bookings(seller_id);
CREATE INDEX IF NOT EXISTS idx_booking_items_booking ON booking_items(booking_id);
CREATE INDEX IF NOT EXISTS idx_availability_product ON availability(product_id, date);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_seller ON reviews(seller_id);
