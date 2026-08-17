require('dotenv').config();
const { supabaseAdmin } = require('./src/config/supabase');

async function main() {
  const { data, count, error } = await supabaseAdmin
    .from('students')
    .select('*', { count: 'exact' });

  if (error) {
    console.error("Error querying students table:", error);
    return;
  }

  console.log(`Total students in Supabase DB: ${count}`);
  if (data && data.length > 0) {
    console.log("Sample 5 students:", data.slice(0, 5).map(s => ({
      id: s.id,
      full_name: s.full_name,
      registration_number: s.registration_number,
      branch_id: s.branch_id,
      admission_class: s.admission_class
    })));
  }
}

main();
