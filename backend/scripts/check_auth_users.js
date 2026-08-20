require('dotenv').config();
const { supabaseAdmin } = require('../src/config/supabase');

async function main() {
  console.log('--- SUPABASE AUTH USERS CHECK ---');
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) {
    console.error('List users error:', error);
    return;
  }

  console.log(`Found ${data.users.length} users in Supabase Auth:`);
  for (const u of data.users) {
    console.log(`ID: ${u.id} | Email: ${u.email} | Confirmed: ${u.email_confirmed_at ? 'YES' : 'NO'}`);
  }

  // Also fetch user_profiles
  const { data: profiles, error: pErr } = await supabaseAdmin.from('user_profiles').select('*');
  if (pErr) {
    console.error('Profiles fetch error:', pErr);
  } else {
    console.log('\n--- USER PROFILES ---');
    profiles.forEach(p => {
      console.log(`ID: ${p.id} | Name: ${p.full_name} | Role: ${p.role} | Branch: ${p.branch_id} | Active: ${p.is_active}`);
    });
  }
}

main().catch(console.error);
