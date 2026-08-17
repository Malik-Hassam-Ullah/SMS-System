require('dotenv').config();
const { supabaseAdmin } = require('./src/config/supabase');

async function main() {
  const { data: profiles } = await supabaseAdmin.from('user_profiles').select('*');
  console.log("User Profiles:", profiles);

  const { data: branches } = await supabaseAdmin.from('branches').select('*');
  console.log("Branches:", branches);

  const { data: importedSample } = await supabaseAdmin
    .from('students')
    .select('id, full_name, registration_number, branch_id')
    .ilike('full_name', '%Zainab%');
  console.log("Imported student sample (Zainab):", importedSample);
}

main();
