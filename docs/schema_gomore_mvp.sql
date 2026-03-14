-- =============================================================================
-- GoMore-like marketplace MVP – PostgreSQL schema
-- Tables: profiles, listings, listing_images, bookings, payments, reviews
-- With: relationships, created_at/updated_at, indexes, Row Level Security
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. profiles (extends auth.users; link via id = auth.uid() or profile_id)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  full_name     TEXT,
  avatar_url    TEXT,
  phone         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_email ON profiles (email);

-- -----------------------------------------------------------------------------
-- 2. listings (cars; owned by a profile)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS listings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  brand           TEXT NOT NULL,
  model           TEXT NOT NULL,
  year            INT NOT NULL,
  price_per_day   NUMERIC(10, 2) NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'DKK',
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'rejected')),
  location        TEXT,
  latitude        NUMERIC(9, 6),
  longitude       NUMERIC(9, 6),
  seats           INT DEFAULT 5,
  transmission    TEXT CHECK (transmission IN ('automatic', 'manual')),
  fuel_type       TEXT CHECK (fuel_type IN ('petrol', 'diesel', 'electric', 'hybrid')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_listings_owner_id ON listings (owner_id);
CREATE INDEX idx_listings_status ON listings (status);
CREATE INDEX idx_listings_status_created ON listings (status, created_at DESC);
CREATE INDEX idx_listings_location ON listings (latitude, longitude) WHERE latitude IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 3. listing_images
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS listing_images (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  UUID NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_listing_images_listing_id ON listing_images (listing_id);

-- -----------------------------------------------------------------------------
-- 4. bookings (renter books a listing)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id   UUID NOT NULL REFERENCES listings (id) ON DELETE RESTRICT,
  renter_id    UUID NOT NULL REFERENCES profiles (id) ON DELETE RESTRICT,
  start_date   DATE NOT NULL,
  end_date     DATE NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'rejected', 'paid', 'cancelled', 'completed'
  )),
  total_price  NUMERIC(10, 2) NOT NULL,
  currency     TEXT NOT NULL DEFAULT 'DKK',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT booking_dates_valid CHECK (end_date >= start_date)
);

CREATE INDEX idx_bookings_listing_id ON bookings (listing_id);
CREATE INDEX idx_bookings_renter_id ON bookings (renter_id);
CREATE INDEX idx_bookings_status ON bookings (status);
CREATE INDEX idx_bookings_dates ON bookings (start_date, end_date);
CREATE INDEX idx_bookings_renter_status ON bookings (renter_id, status, end_date DESC);

-- -----------------------------------------------------------------------------
-- 5. payments (charges/refunds linked to a booking)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      UUID REFERENCES bookings (id) ON DELETE SET NULL,
  amount          NUMERIC(10, 2) NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'DKK',
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  stripe_id       TEXT UNIQUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_booking_id ON payments (booking_id);
CREATE INDEX idx_payments_status ON payments (status);

-- -----------------------------------------------------------------------------
-- 6. reviews (after completed booking; renter reviews owner/listing)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  UUID NOT NULL REFERENCES bookings (id) ON DELETE CASCADE,
  listing_id  UUID NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  rating      INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  body        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (booking_id, reviewer_id)
);

CREATE INDEX idx_reviews_listing_id ON reviews (listing_id);
CREATE INDEX idx_reviews_reviewee_id ON reviews (reviewee_id);

-- -----------------------------------------------------------------------------
-- updated_at trigger (reusable)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER set_listings_updated_at
  BEFORE UPDATE ON listings FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER set_bookings_updated_at
  BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER set_payments_updated_at
  BEFORE UPDATE ON payments FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER set_reviews_updated_at
  BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- -----------------------------------------------------------------------------
-- Row Level Security (RLS)
-- -----------------------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Assumes Supabase: profiles.id = auth.uid() (same as auth.users.id). Adjust if your
-- profiles table uses a different link to auth (e.g. profiles.auth_id = auth.uid()).

-- profiles: users can read/update own row; can insert own on signup
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- listings: anyone can read active; owner can do all
CREATE POLICY "listings_select_active" ON listings
  FOR SELECT USING (status = 'active' OR owner_id = auth.uid());
CREATE POLICY "listings_insert_own" ON listings
  FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "listings_update_own" ON listings
  FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "listings_delete_own" ON listings
  FOR DELETE USING (owner_id = auth.uid());

-- listing_images: follow listing visibility; only owner can mutate
CREATE POLICY "listing_images_select" ON listing_images
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM listings WHERE id = listing_id AND (status = 'active' OR owner_id = auth.uid()))
  );
CREATE POLICY "listing_images_insert" ON listing_images
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM listings WHERE id = listing_id AND owner_id = auth.uid())
  );
CREATE POLICY "listing_images_delete" ON listing_images
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM listings WHERE id = listing_id AND owner_id = auth.uid())
  );

-- bookings: renter or listing owner can read; renter can create
CREATE POLICY "bookings_select" ON bookings
  FOR SELECT USING (
    renter_id = auth.uid()
    OR EXISTS (SELECT 1 FROM listings WHERE id = listing_id AND owner_id = auth.uid())
  );
CREATE POLICY "bookings_insert" ON bookings
  FOR INSERT WITH CHECK (renter_id = auth.uid());
CREATE POLICY "bookings_update" ON bookings
  FOR UPDATE USING (
    renter_id = auth.uid()
    OR EXISTS (SELECT 1 FROM listings WHERE id = listing_id AND owner_id = auth.uid())
  );

-- payments: only involved parties (via booking)
CREATE POLICY "payments_select" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = payments.booking_id
        AND (b.renter_id = auth.uid() OR EXISTS (SELECT 1 FROM listings l WHERE l.id = b.listing_id AND l.owner_id = auth.uid()))
    )
  );

-- reviews: anyone can read; reviewer can insert/update own
CREATE POLICY "reviews_select" ON reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert" ON reviews
  FOR INSERT WITH CHECK (reviewer_id = auth.uid());
CREATE POLICY "reviews_update_own" ON reviews
  FOR UPDATE USING (reviewer_id = auth.uid());
