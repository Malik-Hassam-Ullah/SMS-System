require('dotenv').config();
const { supabaseAdmin } = require('./src/config/supabase');

async function cleanAndFix() {
    console.log('=== STEP 1: Finding garbage rows ===');

    // Get all students
    const { data: allStudents, error } = await supabaseAdmin
        .from('students')
        .select('id, full_name, registration_number, roll_number, is_active');

    if (error) { console.error('Fetch error:', error.message); return; }
    console.log('Total students in DB:', allStudents.length);

    // Identify garbage rows:
    // 1. registration_number starts with 'GEN-' (auto-generated = bad parse)
    // 2. full_name looks like a field label (no spaces between words that form names, or known bad labels)
    const BAD_NAMES = new Set([
        'name', 'v.no', 'roll no.', 'roll no', 'fee', 'father name', 'father_name',
        'registration charges', 'annual charges', 'total fee', 'previous balance',
        'reg; charges', 'fee challan', 'tuition fee', 'late fee charges', 'arrears',
        'description', 'roll#:', 'fee for the month of:', 'issue date:', 'branch:',
        'payment terms:', 'after due date', 'collection account# :', 'buyer (challan #):',
        'pv (roll#):', 'this is system generated document and needs no signature',
    ]);

    const garbageIds = [];
    const goodInactiveIds = [];

    allStudents.forEach(s => {
        const nameLC = (s.full_name || '').toLowerCase().trim();
        const regNo = (s.registration_number || '').trim();

        const isGarbage =
            regNo.startsWith('GEN-') ||
            BAD_NAMES.has(nameLC) ||
            nameLC.length < 2 ||
            /^\d+$/.test(nameLC); // pure number as name

        if (isGarbage) {
            garbageIds.push(s.id);
        } else if (!s.is_active) {
            goodInactiveIds.push(s.id);
        }
    });

    console.log(`Garbage rows to DELETE: ${garbageIds.length}`);
    console.log(`Good rows to ACTIVATE: ${goodInactiveIds.length}`);

    // Step 2: Delete garbage in batches
    if (garbageIds.length > 0) {
        console.log('\n=== STEP 2: Deleting garbage rows ===');
        const BATCH = 50;
        let deleted = 0;
        for (let i = 0; i < garbageIds.length; i += BATCH) {
            const chunk = garbageIds.slice(i, i + BATCH);
            const { error: delErr } = await supabaseAdmin
                .from('students')
                .delete()
                .in('id', chunk);
            if (delErr) console.error('Delete error:', delErr.message);
            else { deleted += chunk.length; console.log(`  Deleted ${deleted}/${garbageIds.length}...`); }
        }
        console.log(`✅ Deleted ${deleted} garbage rows`);
    }

    // Step 3: Activate all real students
    if (goodInactiveIds.length > 0) {
        console.log('\n=== STEP 3: Activating real students ===');
        const BATCH = 50;
        let activated = 0;
        for (let i = 0; i < goodInactiveIds.length; i += BATCH) {
            const chunk = goodInactiveIds.slice(i, i + BATCH);
            const { data, error: upErr } = await supabaseAdmin
                .from('students')
                .update({ is_active: true, address: 'Kahuta' })
                .in('id', chunk)
                .select('id');
            if (upErr) console.error('Activate error:', upErr.message);
            else { activated += data?.length || 0; console.log(`  Activated ${activated}/${goodInactiveIds.length}...`); }
        }
        console.log(`✅ Activated ${activated} real students`);
    }

    // Step 4: Final verification
    console.log('\n=== STEP 4: Final Count ===');
    const { count: totalNow } = await supabaseAdmin.from('students').select('*', { count: 'exact', head: true });
    const { count: activeNow } = await supabaseAdmin.from('students').select('*', { count: 'exact', head: true }).eq('is_active', true);
    console.log(`Total students: ${totalNow}`);
    console.log(`Active students: ${activeNow}`);

    // Show 5 sample real students
    const { data: sample } = await supabaseAdmin
        .from('students')
        .select('full_name, registration_number, roll_number, father_name, admission_class')
        .eq('is_active', true)
        .limit(5);
    console.log('\nSample active students:');
    sample?.forEach((s, i) => console.log(`  ${i + 1}. ${s.full_name} | Reg:${s.registration_number} | Roll:${s.roll_number} | Class:${s.admission_class}`));
    console.log('\n✅ DONE! Visit http://localhost:5173/admin/students to verify.');
}

cleanAndFix().catch(console.error);
