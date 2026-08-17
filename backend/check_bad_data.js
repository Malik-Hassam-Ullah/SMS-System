require('dotenv').config();
const { supabaseAdmin } = require('./src/config/supabase');
const fs = require('fs');

async function check() {
    const { data, error } = await supabaseAdmin
        .from('students')
        .select('id, full_name, registration_number, roll_number, father_name, gender, admission_class, is_active')
        .order('created_at', { ascending: false })
        .limit(30);

    if (error) { fs.writeFileSync('bad_data.txt', 'ERROR: ' + error.message); return; }

    let out = '';
    data.forEach((s, i) => {
        out += `${i + 1}. name="${s.full_name}" | reg="${s.registration_number}" | roll="${s.roll_number}" | father="${s.father_name}" | class="${s.admission_class}" | active=${s.is_active}\n`;
    });

    // Count how many have field-like names
    const { count: total } = await supabaseAdmin.from('students').select('*', { count: 'exact', head: true });
    const { count: active } = await supabaseAdmin.from('students').select('*', { count: 'exact', head: true }).eq('is_active', true);

    // Check for bad rows (field names as values)
    const { data: bad } = await supabaseAdmin
        .from('students')
        .select('id, full_name')
        .in('full_name', ['Name', 'V.No', 'Roll No.', 'Fee', 'Father Name', 'Registration Charges', 'Annual Charges', 'Total Fee', 'Previous Balance', 'Reg; Charges']);

    out += `\nTOTAL: ${total} | ACTIVE: ${active}\n`;
    out += `\nBAD ROWS (field names as names): ${bad?.length || 0}\n`;
    bad?.forEach(b => out += `  - id=${b.id} name="${b.full_name}"\n`);

    fs.writeFileSync('bad_data.txt', out);
    console.log('Written to bad_data.txt');
    console.log(out);
}
check().catch(console.error);
