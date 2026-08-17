require('dotenv').config();
const fs = require('fs');
const { supabaseAdmin } = require('./src/config/supabase');

async function run() {
    const branchId = "bbbbbbbb-0000-0000-0000-000000000001";
    const { data, error, count } = await supabaseAdmin
        .from('fee_vouchers')
        .select(`
      *,
      students ( id, full_name, registration_number, roll_number, father_name,
        classes ( id, name ), sections ( id, name )
      )
    `, { count: 'exact' })
        .eq('branch_id', branchId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .range(0, 5);

    if (error) {
        fs.writeFileSync('query_test.txt', "Error: " + JSON.stringify(error, null, 2));
    } else {
        fs.writeFileSync('query_test.txt', `Count: ${count}\nData: ` + JSON.stringify(data, null, 2));
    }
}

run();
