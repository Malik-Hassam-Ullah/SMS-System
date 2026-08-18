require('dotenv').config();
const { supabaseAdmin } = require('./src/config/supabase');
const fs = require('fs');

async function main() {
    const { data: student } = await supabaseAdmin
        .from('students')
        .select('*')
        .limit(1)
        .single();

    fs.writeFileSync('student_cols_out.txt', Object.keys(student || {}).join(', '));
    console.log('Done');
}

main();
