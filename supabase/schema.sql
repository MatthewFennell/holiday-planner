-- ============================================================
--  Holiday Planner – Supabase Schema
--  Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Holidays
CREATE TABLE IF NOT EXISTS holidays (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  destination TEXT        NOT NULL,
  start_date  DATE        NOT NULL,
  end_date    DATE        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_dates CHECK (end_date >= start_date)
);

-- 2. Transport details
CREATE TABLE IF NOT EXISTS transport_details (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_id          UUID        NOT NULL REFERENCES holidays(id) ON DELETE CASCADE,
  direction           TEXT        NOT NULL CHECK (direction IN ('outbound', 'return')),
  transport_type      TEXT        NOT NULL CHECK (transport_type IN ('car','train','boat','plane','bus','other')),
  departure_location  TEXT,
  arrival_location    TEXT,
  departure_time      TIMESTAMPTZ,
  arrival_time        TIMESTAMPTZ,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Activities
CREATE TABLE IF NOT EXISTS activities (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_id  UUID        NOT NULL REFERENCES holidays(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  description TEXT,
  day_index   INTEGER,                -- NULL = unassigned; 0 = first day of trip
  time_slot   TEXT        CHECK (time_slot IN ('morning','afternoon','evening')),
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
--  Row Level Security – open read/write for everyone
--  (no auth required – switch to user-scoped policies later)
-- ============================================================

ALTER TABLE holidays         ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities        ENABLE ROW LEVEL SECURITY;

-- Anyone can read all rows
CREATE POLICY "public_read_holidays"          ON holidays          FOR SELECT USING (true);
CREATE POLICY "public_read_transport"         ON transport_details FOR SELECT USING (true);
CREATE POLICY "public_read_activities"        ON activities         FOR SELECT USING (true);

-- Anyone can insert
CREATE POLICY "public_insert_holidays"        ON holidays          FOR INSERT WITH CHECK (true);
CREATE POLICY "public_insert_transport"       ON transport_details FOR INSERT WITH CHECK (true);
CREATE POLICY "public_insert_activities"      ON activities         FOR INSERT WITH CHECK (true);

-- Anyone can update
CREATE POLICY "public_update_activities"      ON activities         FOR UPDATE USING (true);
CREATE POLICY "public_update_transport"       ON transport_details FOR UPDATE USING (true);

-- Anyone can delete
CREATE POLICY "public_delete_activities"      ON activities         FOR DELETE USING (true);
CREATE POLICY "public_delete_transport"       ON transport_details FOR DELETE USING (true);

-- ============================================================
--  Indexes for common query patterns
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_transport_holiday ON transport_details(holiday_id);
CREATE INDEX IF NOT EXISTS idx_activities_holiday ON activities(holiday_id);
CREATE INDEX IF NOT EXISTS idx_activities_container ON activities(holiday_id, day_index, time_slot);
