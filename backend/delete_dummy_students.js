require('dotenv').config();
const { supabaseAdmin } = require('./src/config/supabase');

async function deleteDummyStudents() {
  const { data, error } = await supabaseAdmin
    .from('students')
    .delete()
    .ilike('registration_number', 'DEMO-%')
    .select();

  if (error) {
    console.error('Error deleting dummy students:', error);
  } else {
    console.log(`Deleted ${data?.length || 0} dummy seed students cleanly!`);
  }
}

deleteDummyStudents();
