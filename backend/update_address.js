require('dotenv').config();
const { supabaseAdmin } = require('./src/config/supabase');

async function updateAll() {
    console.log('Fetching branches...');
    const { data: branches, error: brErr } = await supabaseAdmin
        .from('branches').select('id, name').limit(1);

    if (brErr || !branches?.length) {
        console.error('Cannot fetch branch:', brErr?.message);
        return;
    }
    const branch = branches[0];
    console.log('Branch:', branch.name, '(' + branch.id + ')');

    // Get all student IDs first
    const { data: allStudents, error: fetchErr } = await supabaseAdmin
        .from('students')
        .select('id')
        .eq('branch_id', branch.id);

    if (fetchErr) { console.error('Fetch error:', fetchErr.message); return; }
    console.log('Total students found:', allStudents?.length);

    // Update in batches of 50 to avoid timeout
    const ids = allStudents.map(s => s.id);
    const BATCH = 50;
    let updated = 0;

    for (let i = 0; i < ids.length; i += BATCH) {
        const batchIds = ids.slice(i, i + BATCH);
        const { data, error } = await supabaseAdmin
            .from('students')
            .update({ address: 'Kahuta', is_active: true })
            .in('id', batchIds)
            .select('id');

        if (error) {
            console.error('Batch error:', error.message);
        } else {
            updated += data?.length || 0;
            console.log(`  Updated ${updated}/${ids.length}...`);
        }
    }

    console.log('\nDONE! Updated', updated, 'students — address = Kahuta, is_active = true');

    // Verify
    const { data: sample } = await supabaseAdmin
        .from('students')
        .select('full_name, address, is_active')
        .eq('branch_id', branch.id)
        .limit(3);
    console.log('Sample check:', JSON.stringify(sample, null, 2));
}

updateAll().catch(console.error);
