require('dotenv').config();
const { supabaseAdmin } = require('./src/config/supabase');

async function test() {
  const { data: admins } = await supabaseAdmin.from('user_profiles').select('*').eq('role', 'admin');
  console.log("Admins:", admins);
}

test();
