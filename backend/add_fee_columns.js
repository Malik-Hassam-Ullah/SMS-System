require('dotenv').config();
const { supabaseAdmin } = require('./src/config/supabase');

async function main() {
  // Test if we can alter table or add fee columns via Supabase SQL rpc or query
  const { data, error } = await supabaseAdmin.rpc('exec_sql', {
    sql_query: `
      ALTER TABLE students ADD COLUMN IF NOT EXISTS monthly_fee numeric DEFAULT 0;
      ALTER TABLE students ADD COLUMN IF NOT EXISTS previous_balance numeric DEFAULT 0;
      ALTER TABLE students ADD COLUMN IF NOT EXISTS total_fee numeric DEFAULT 0;
      ALTER TABLE students ADD COLUMN IF NOT EXISTS annual_charges numeric DEFAULT 0;
    `
  });

  if (error) {
    console.log("RPC exec_sql not found or error:", error.message);
  } else {
    console.log("Columns added successfully via RPC!", data);
  }
}

main();
