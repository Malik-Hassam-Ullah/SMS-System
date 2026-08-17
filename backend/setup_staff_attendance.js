require('dotenv').config();
const { supabaseAdmin } = require('./src/config/supabase');

const sql = `
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
  UNIQUE (staff_id, date)
);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_branch_date ON staff_attendance (branch_id, date);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_staff_id    ON staff_attendance (staff_id);
`;

async function main() {
    console.log('🔧 Creating staff_attendance table in Supabase...\n');

    // Method: Use Supabase's pg_net or SQL via the REST API
    // Supabase allows raw SQL via the /rest/v1/ endpoint with SQL header for some operations
    // Best approach: try inserting into the table to see if it exists first

    const { error: checkErr } = await supabaseAdmin
        .from('staff_attendance')
        .select('id')
        .limit(1);

    if (!checkErr) {
        console.log('✅ staff_attendance table already EXISTS and is working!');
        console.log('🚀 Staff Attendance feature ready at: http://localhost:5173/admin/staff-attendance');
        return;
    }

    // Table doesn't exist — use Supabase Management API to run SQL
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const projectRef = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');

    const fetch = (...args) => import('node-fetch').then(m => m.default(...args)).catch(() => {
        // node-fetch not available, use https
        return null;
    });

    // Try Supabase management API
    const apiUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

    console.log('⚠️  Table does not exist yet.\n');
    console.log('📋 MANUAL STEP REQUIRED:');
    console.log('━'.repeat(55));
    console.log('1. Open this URL in your browser:');
    console.log(`   https://supabase.com/dashboard/project/${projectRef}/sql/new`);
    console.log('\n2. Paste and run this SQL:\n');
    console.log(sql);
    console.log('━'.repeat(55));
    console.log('\n✅ After running, Staff Attendance will work at:');
    console.log('   http://localhost:5173/admin/staff-attendance\n');
}

main().catch(console.error);
