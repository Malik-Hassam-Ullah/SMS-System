-- ═══════════════════════════════════════════════════════
--  Expenses Table for School Management System
--  Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS expenses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id         UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  category          TEXT NOT NULL DEFAULT 'General',
  amount            NUMERIC NOT NULL CHECK (amount > 0),
  expense_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method    TEXT NOT NULL DEFAULT 'cash',
  reference_number  TEXT,
  receipt_url       TEXT,
  description       TEXT,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_by        UUID REFERENCES user_profiles(id),
  approved_by       UUID REFERENCES user_profiles(id),
  approved_at       TIMESTAMPTZ,
  rejection_reason  TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for high-performance filtering
CREATE INDEX IF NOT EXISTS idx_expenses_branch_id ON expenses (branch_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses (status);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses (expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses (category);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON expenses (created_by);

-- Enable Row Level Security
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "service_role_expenses" ON expenses
  FOR ALL USING (true) WITH CHECK (true);
