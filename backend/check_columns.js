require('dotenv').config();
const { supabaseAdmin } = require('./src/config/supabase');
const fs = require('fs');

async function main() {
    let out = '';

    const { data: v } = await supabaseAdmin.from('fee_vouchers').select('*').limit(1);
    out += '=== fee_vouchers ===\n' + Object.keys(v?.[0] || {}).join(', ') + '\n\n';

    const { data: p } = await supabaseAdmin.from('fee_payments').select('*').limit(1);
    out += '=== fee_payments ===\n' + Object.keys(p?.[0] || {}).join(', ') + '\n\n';

    const { data: b } = await supabaseAdmin.from('student_outstanding_balance').select('*').limit(1);
    out += '=== student_outstanding_balance ===\n' + Object.keys(b?.[0] || {}).join(', ') + '\n\n';

    fs.writeFileSync('cols_out.txt', out);
    console.log('Written to cols_out.txt');
}

main();
