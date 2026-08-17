require('dotenv').config();
const { supabaseAdmin } = require('./src/config/supabase');

async function test() {
  console.log("Fetching a class...");
  const { data: cls, error: clsError } = await supabaseAdmin.from('classes').select('*').limit(1).single();
  if (clsError) {
    console.error("Error fetching class:", clsError);
    return;
  }
  console.log("Class:", cls);
  
  console.log("Inserting section...");
  const { data, error } = await supabaseAdmin
    .from('sections')
    .insert({
      branch_id: cls.branch_id,
      class_id: cls.id,
      name: 'Test Section ' + Date.now()
    })
    .select();
    
  if (error) {
    console.error("Failed to insert section:", error);
  } else {
    console.log("Success:", data);
  }
}

test();
