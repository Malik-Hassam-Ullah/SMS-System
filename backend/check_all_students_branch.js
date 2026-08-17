require('dotenv').config();
const { supabaseAdmin } = require('./src/config/supabase');

async function main() {
  const { data: students } = await supabaseAdmin
    .from('students')
    .select('id, branch_id, registration_number, full_name')
    .limit(10);

  console.log("Sample 10 students registration_numbers:", students);
}

main();
