-- ═══════════════════════════════════════════════════════
--  Staff Attendance Table
--  Run this in Supabase SQL Editor once
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS staff_attendance (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id   UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  staff_id    UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'leave')) DEFAULT 'present',
  check_in    TIME,
  check_out   TIME,
  remarks     TEXT,
  marked_by   UUID REFERENCES user_profiles(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),

  -- Only one record per staff per day
  UNIQUE (staff_id, date)
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_staff_attendance_branch_date ON staff_attendance (branch_id, date);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_staff_id    ON staff_attendance (staff_id);

-- Enable Row Level Security
ALTER TABLE staff_attendance ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (backend uses service role)
CREATE POLICY "service_role_staff_attendance" ON staff_attendance
  FOR ALL USING (true) WITH CHECK (true);
