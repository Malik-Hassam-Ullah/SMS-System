require('dotenv').config();
const { supabaseAdmin } = require('./src/config/supabase');

async function main() {
  const { data: student } = await supabaseAdmin
    .from('students')
    .select('id, branch_id, full_name, registration_number')
    .ilike('full_name', '%Zainab Fatima%')
    .limit(1)
    .single();

  console.log("Found student:", student);

  if (student) {
    const { data: balData, error: balError } = await supabaseAdmin
      .from('student_outstanding_balance')
      .upsert({
        branch_id: student.branch_id,
        student_id: student.id,
        total_outstanding: 3000,
        updated_at: new Date().toISOString()
      }, { onConflict: 'student_id' })
      .select();

    console.log("Upsert result with onConflict: 'student_id':", balData, "Error:", balError);
  }
}

main();
