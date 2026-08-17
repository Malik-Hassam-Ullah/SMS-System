require('dotenv').config();
const { supabaseAdmin } = require('./src/config/supabase');
const fs = require('fs');

async function listUsers() {
  try {
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) throw error;

    let out = [];
    out.push('--- SUPABASE AUTH USERS ---');
    if (users.length === 0) {
      out.push('No users found in Supabase Auth!');
    } else {
      users.forEach(user => {
        out.push(`ID: ${user.id} | Email: ${user.email} | Created At: ${user.created_at}`);
      });
    }

    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, role, full_name, school_id, branch_id');

    if (profileError) throw profileError;

    out.push('\n--- USER PROFILES TABLE ---');
    if (profiles.length === 0) {
      out.push('No profiles found in user_profiles table!');
    } else {
      profiles.forEach(p => {
        out.push(`ID: ${p.id} | Role: ${p.role} | Name: ${p.full_name} | School ID: ${p.school_id} | Branch ID: ${p.branch_id}`);
      });
    }
    fs.writeFileSync('users_list.txt', out.join('\n'), 'utf8');
  } catch (err) {
    console.error('Error listing database users:', err.message);
  }
}

listUsers();
