require('dotenv').config();
const { supabaseAdmin } = require('./src/config/supabase');

const sql = `
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

CREATE INDEX IF NOT EXISTS idx_expenses_branch_id ON expenses (branch_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses (status);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses (expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses (category);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'expenses' AND policyname = 'service_role_expenses'
  ) THEN
    CREATE POLICY "service_role_expenses" ON expenses FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
`;

async function main() {
  console.log('🔍 Checking if expenses table exists in Supabase...\n');

  const { error: checkErr } = await supabaseAdmin
    .from('expenses')
    .select('id')
    .limit(1);

  if (!checkErr) {
    console.log('✅ Expenses table already EXISTS and is fully working!');
    return;
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const projectRef = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');

  console.log('⚠️  Expenses table does not exist in Supabase yet.\n');
  console.log('📋 EASY SETUP STEP:');
  console.log('━'.repeat(60));
  console.log('1. Open this link in your browser:');
  console.log(`   https://supabase.com/dashboard/project/${projectRef}/sql/new`);
  console.log('\n2. Paste and run this SQL:\n');
  console.log(sql);
  console.log('━'.repeat(60));
}

main().catch(console.error);
