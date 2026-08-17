require('dotenv').config();
const XLSX = require('xlsx');
const { supabaseAdmin } = require('./src/config/supabase');

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const XLS_PATH = 'C:/Users/hassa/Pictures/Fee Challan with data file  August ,2026.0.xls';
const SHEET_NAME = 'Data File ';
const DEFAULT_ADDRESS = 'Kahuta';
const DEFAULT_CITY = 'Kahuta';

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/** Convert Excel serial date or string date to YYYY-MM-DD */
function parseDate(val) {
    if (!val) return null;
    if (typeof val === 'number') {
        // Excel serial date
        const date = XLSX.SSF.parse_date_code(val);
        if (!date) return null;
        const m = String(date.m).padStart(2, '0');
        const d = String(date.d).padStart(2, '0');
        return `${date.y}-${m}-${d}`;
    }
    if (typeof val === 'string') {
        // Try DD/MM/YYYY
        const parts = val.trim().split('/');
        if (parts.length === 3) {
            const [d, m, y] = parts;
            if (y && y.length === 4) return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            // Try MM/DD/YYYY
            return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
        }
    }
    return null;
}

/** Normalize class name */
function normalizeClass(raw) {
    if (!raw || typeof raw !== 'string') return null;
    const s = raw.trim().toLowerCase();
    const map = {
        'play group': 'Play Group', 'playgroup': 'Play Group', 'play groups': 'Play Group',
        'nursery': 'Nursery',
        'kg': 'KG', 'k.g': 'KG',
        'one': 'Class 1', 'one ': 'Class 1', '1': 'Class 1', '1st': 'Class 1',
        'two': 'Class 2', '2': 'Class 2', '2nd': 'Class 2',
        'three': 'Class 3', 'three  ': 'Class 3', 'three ': 'Class 3', '3': 'Class 3', '3rd': 'Class 3',
        'four': 'Class 4', 'foure': 'Class 4', '4th ': 'Class 4', '4': 'Class 4',
        'five': 'Class 5', 'five ': 'Class 5', '5th ': 'Class 5', '5': 'Class 5',
        'six': 'Class 6', 'six ': 'Class 6', 'six ': 'Class 6', '6th ': 'Class 6', '6th': 'Class 6', '6': 'Class 6',
        'seven': 'Class 7', '7th ': 'Class 7', '7': 'Class 7',
        'eight': 'Class 8', '8th ': 'Class 8', '8th': 'Class 8', '8': 'Class 8',
        'nine': 'Class 9', '9th ': 'Class 9', '9th': 'Class 9', '9': 'Class 9',
        'ten': 'Class 10', '10th ': 'Class 10', '10': 'Class 10',
        'left': null,
    };
    return map[s] !== undefined ? map[s] : raw.trim();
}

/** Normalize gender */
function normalizeGender(g) {
    if (!g) return null;
    const s = String(g).trim().toLowerCase();
    if (s === 'm' || s === 'male') return 'male';
    if (s === 'f' || s === 'female') return 'female';
    return null;
}

/** Format contact number */
function formatContact(val) {
    if (!val) return null;
    let s = String(val).replace(/\D/g, '');
    if (s.length === 10 && !s.startsWith('0')) s = '0' + s;
    return s || null;
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
    console.log('\n📂 Reading Excel file...');
    const wb = XLSX.readFile(XLS_PATH);
    const ws = wb.Sheets[SHEET_NAME];
    if (!ws) {
        console.error(`❌ Sheet "${SHEET_NAME}" not found! Available:`, wb.SheetNames);
        process.exit(1);
    }

    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });

    // ── Step 1: Get branch_id ────────────────────────────────────────────────
    const { data: branches, error: brErr } = await supabaseAdmin
        .from('branches').select('id, name').limit(10);
    if (brErr) { console.error('❌ Cannot fetch branches:', brErr.message); process.exit(1); }

    console.log('\n🏫 Available branches:');
    branches.forEach((b, i) => console.log(`  [${i}] ${b.name} (${b.id})`));

    if (!branches.length) { console.error('❌ No branches found in DB'); process.exit(1); }
    const branch = branches[0];
    console.log(`\n✅ Using branch: "${branch.name}" (${branch.id})`);

    // ── Step 2: Get or create classes in DB ─────────────────────────────────
    const { data: existingClasses } = await supabaseAdmin
        .from('classes').select('id, name').eq('branch_id', branch.id);

    const classMap = {}; // name → id
    existingClasses?.forEach(c => { classMap[c.name] = c.id; });

    // ── Step 3: Parse student rows ───────────────────────────────────────────
    console.log('\n📋 Parsing student rows...');
    const students = [];
    const classesNeeded = new Set();

    // Data starts at row 4 (index 4), header is at row 3
    for (let i = 4; i < rows.length; i++) {
        const row = rows[i];
        // Valid student row: col[0]=V.No (number), col[2]=Name (string)
        if (!row[0] || typeof row[0] !== 'number' || !row[2] || typeof row[2] !== 'string') continue;
        if (String(row[2]).trim() === '') continue;

        const rawClass = row[15];
        const normClass = normalizeClass(rawClass);
        if (normClass === null) {
            console.log(`  ⚠️  Skipping "${row[2]}" — class is "left"`);
            continue; // Skip left/withdrawn students
        }
        if (normClass) classesNeeded.add(normClass);

        students.push({
            voucher_number: String(row[0]),
            roll_number: row[1] ? String(row[1]) : null,
            full_name: String(row[2]).trim(),
            current_fee: Number(row[3]) || 0,
            previous_balance: Number(row[6]) || 0,
            registration_number: row[8] ? String(row[8]).trim() : null,
            father_name: row[9] ? String(row[9]).trim() : null,
            father_cnic: row[10] ? String(row[10]).trim() : null,
            contact_number: formatContact(row[11]),
            gender: normalizeGender(row[12]),
            date_of_birth: parseDate(row[13]),
            admission_date: parseDate(row[14]),
            admission_class: rawClass ? String(rawClass).trim() : null,
            current_class_name: normClass,
            address: DEFAULT_ADDRESS,
            city: DEFAULT_CITY,
        });
    }

    console.log(`✅ Parsed ${students.length} students`);
    console.log(`📚 Classes needed: ${[...classesNeeded].join(', ')}`);

    // ── Step 4: Create missing classes ──────────────────────────────────────
    for (const className of classesNeeded) {
        if (!classMap[className]) {
            const { data: newClass, error } = await supabaseAdmin
                .from('classes')
                .insert({ name: className, branch_id: branch.id })
                .select('id, name')
                .single();
            if (error) {
                console.log(`  ⚠️  Could not create class "${className}":`, error.message);
            } else {
                classMap[className] = newClass.id;
                console.log(`  ✅ Created class: ${className}`);
            }
        }
    }

    // ── Step 5: Get existing students (to avoid duplicates) ─────────────────
    const { data: existingStudents } = await supabaseAdmin
        .from('students')
        .select('id, registration_number, roll_number, full_name')
        .eq('branch_id', branch.id);

    const existingRegNos = new Set(existingStudents?.map(s => s.registration_number).filter(Boolean));
    const existingRollNos = new Set(existingStudents?.map(s => s.roll_number).filter(Boolean));

    // ── Step 6: Prepare insert payload ──────────────────────────────────────
    const toInsert = [];
    const skipped = [];

    for (const s of students) {
        // Skip if already exists by reg number or roll number
        if (s.registration_number && existingRegNos.has(s.registration_number)) {
            skipped.push(`${s.full_name} (Reg: ${s.registration_number}) — already exists`);
            continue;
        }

        const classId = classMap[s.current_class_name] || null;

        toInsert.push({
            branch_id: branch.id,
            full_name: s.full_name,
            registration_number: s.registration_number,
            roll_number: s.roll_number,
            father_name: s.father_name,
            father_cnic: s.father_cnic,
            contact_number: s.contact_number,
            gender: s.gender,
            date_of_birth: s.date_of_birth,
            admission_date: s.admission_date,
            admission_class: s.admission_class,
            current_class_id: classId,
            address: s.address,
            city: s.city,
            is_active: true,
        });
    }

    console.log(`\n📊 Summary:`);
    console.log(`  → To insert: ${toInsert.length}`);
    console.log(`  → Skipped (duplicate): ${skipped.length}`);
    if (skipped.length > 0) {
        console.log('\n  Skipped:');
        skipped.slice(0, 10).forEach(s => console.log('   -', s));
        if (skipped.length > 10) console.log(`   ... and ${skipped.length - 10} more`);
    }

    if (toInsert.length === 0) {
        console.log('\n✅ Nothing to insert — all students already exist.');
        return;
    }

    // ── Step 7: Insert in batches of 100 ───────────────────────────────────
    console.log(`\n🚀 Inserting ${toInsert.length} students in batches of 100...`);
    let inserted = 0;
    let failed = 0;
    const BATCH = 100;

    for (let i = 0; i < toInsert.length; i += BATCH) {
        const batch = toInsert.slice(i, i + BATCH);
        const { data, error } = await supabaseAdmin
            .from('students')
            .insert(batch)
            .select('id');

        if (error) {
            console.error(`  ❌ Batch ${Math.floor(i / BATCH) + 1} error:`, error.message);
            failed += batch.length;
        } else {
            inserted += data?.length || 0;
            process.stdout.write(`  ✅ Batch ${Math.floor(i / BATCH) + 1}: ${inserted}/${toInsert.length} inserted\r`);
        }
    }

    console.log(`\n\n🎉 DONE!`);
    console.log(`  ✅ Inserted: ${inserted} students`);
    console.log(`  ❌ Failed:   ${failed} students`);
    console.log(`  ⏭️  Skipped:  ${skipped.length} (already existed)`);
    console.log(`\n  Address set to "${DEFAULT_ADDRESS}" for all imported students.`);
    console.log(`\n  Visit: http://localhost:5173/admin/students to verify.\n`);
}

main().catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
});
