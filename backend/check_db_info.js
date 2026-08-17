require('dotenv').config();
const { supabaseAdmin } = require('./src/config/supabase');

async function main() {
    const { data: branches } = await supabaseAdmin.from('branches').select('id, name, school_id');
    const fs = require('fs');
    const out = ['=== BRANCHES ==='];
    (branches || []).forEach(b => out.push(`  id: ${b.id} | name: "${b.name}"`));

    const { data: students } = await supabaseAdmin
        .from('students')
        .select('id, full_name, registration_number, roll_number, branch_id, father_name, contact_number, gender')
        .limit(5);
    out.push('\n=== SAMPLE STUDENTS (first 5) ===');
    (students || []).forEach(s => out.push(JSON.stringify(s)));

    const { count } = await supabaseAdmin.from('students').select('*', { count: 'exact', head: true });
    out.push(`\nTotal students in DB: ${count}`);

    fs.writeFileSync('db_info.txt', out.join('\n'), 'utf8');
    console.log(out.join('\n'));
}
main().catch(e => console.error(e.message));
