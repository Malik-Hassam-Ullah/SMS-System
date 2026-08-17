require('dotenv').config();
const { supabaseAdmin } = require('./src/config/supabase');

async function main() {
  const { data: vouchers } = await supabaseAdmin.from('fee_vouchers').select('*').limit(1);
  console.log("Fee Vouchers Columns:", vouchers ? Object.keys(vouchers[0] || {}) : []);

  const { data: balance } = await supabaseAdmin.from('student_outstanding_balance').select('*').limit(1);
  console.log("Outstanding Balance Columns:", balance ? Object.keys(balance[0] || {}) : []);
}

main();
