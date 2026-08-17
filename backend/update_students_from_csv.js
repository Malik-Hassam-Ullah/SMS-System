/**
 * update_students_from_csv.js
 * ───────────────────────────────────────────────────────────────────────
 * Reads the Fee Challan CSV and updates student profiles in Supabase DB.
 * Only fills fields that are BLANK in the DB (does not overwrite existing data).
 * Run from /backend: node update_students_from_csv.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const { supabaseAdmin } = require('./src/config/supabase');

// ── CONFIG ────────────────────────────────────────────────────────────
const CSV_PATH = 'C:\\Users\\hassa\\Documents\\Fee Challan with data file  August ,2026.0.csv';
const BRANCH_ID = 'bbbbbbbb-0000-0000-0000-000000000001'; // Main Campus
// ─────────────────────────────────────────────────────────────────────

// ── Date parser (DD/MM/YYYY → YYYY-MM-DD) ────────────────────────────
function parseDate(value) {
    if (!value) return null;
    let text = String(value).trim().replace(/\/+/g, '/').replace(/-+/g, '-');
    if (!text) return null;

    // YYYY-MM-DD already
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

    // DD/MM/YYYY or MM/DD/YYYY
    const m = text.match(/^(\d{1,3})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (!m) return null;

    let [, d, mo, y] = m;
    if (y.length === 2) y = '20' + y;
    if (y.length > 4) y = y.slice(0, 4);

    let day = +d, month = +mo, year = +y;
    if (day > 31 && String(d).length === 3) { day = +String(d).slice(-2); }
    if (month > 12 && day <= 12) { [day, month] = [month, day]; }

    if (year >= 1950 && year <= 2099 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    return null;
}

// ── Gender normalizer ─────────────────────────────────────────────────
function parseGender(value) {
    if (!value) return null;
    const t = String(value).trim().toLowerCase();
    if (['m', 'male', 'boy'].includes(t)) return 'male';
    if (['f', 'female', 'girl'].includes(t)) return 'female';
    return null;
}

// ── CSV column key map ────────────────────────────────────────────────
const COL_MAP = {
    'name': 'full_name', 'v_no': 'voucher_no',
    'roll_no': 'roll_number', 'roll_no_': 'roll_number',
    'reg_no': 'registration_number', 'regno': 'registration_number',
    'reg_no.': 'registration_number',
    'father_name': 'father_name', 'father_cnic': 'father_cnic',
    'contact_no_1': 'contact_number', 'contact_no__1': 'contact_number',
    'contact_no._1': 'contact_number',
    'gander': 'gender', 'gendar': 'gender', 'gender': 'gender',
    'date_of_birth': 'date_of_birth',
    'date_of_admission': 'date_of_admission',
    'admission_in_class': 'admission_class', 'address': 'address',
};

// ── Parse CSV ─────────────────────────────────────────────────────────
function parseCSV(filePath) {
    const buffer = fs.readFileSync(filePath);
    const text = buffer.toString('utf8').replace(/^\uFEFF/, '');
    const rawLines = text.split(/\r?\n/);

    let currentHeaderMap = null;
    let currentGrade = '';
    const records = [];

    for (let i = 0; i < rawLines.length; i++) {
        const line = rawLines[i].trim();
        if (!line) continue;

        // Grade section header
        const gradeMatch = line.match(/Grade:\s*([^,:]+)/i);
        if (gradeMatch) { currentGrade = gradeMatch[1].trim(); continue; }

        // Column header row
        const isHeader = /\b(?:v\.?no|roll\s*no|name|reg[:;,.]?\s*no|father\s*name)\b/i.test(line);
        if (isHeader) {
            const cols = Papa.parse(line).data[0] || [];
            const headerMap = {};
            cols.forEach((col, idx) => {
                const raw = String(col || '').trim();
                if (!raw) return;
                const key = raw.toLowerCase()
                    .replace(/[^a-z0-9]+/g, '_')
                    .replace(/_+/g, '_')
                    .replace(/^_+|_+$/g, '');
                const db = COL_MAP[key];
                if (db && headerMap[db] === undefined) headerMap[db] = idx;
            });
            if (headerMap['full_name'] !== undefined) currentHeaderMap = headerMap;
            continue;
        }

        if (!currentHeaderMap) continue;

        // Skip total / school rows
        const ll = line.toLowerCase();
        if (ll.includes('total') || ll.includes('smart school')) continue;

        const fields = Papa.parse(line).data[0] || [];
        const get = (key) => {
            const idx = currentHeaderMap[key];
            if (idx === undefined || idx >= fields.length) return '';
            return String(fields[idx] || '').trim();
        };

        const name = get('full_name');
        if (!name || name.toLowerCase() === 'name') continue;
        if (/^\d+$/.test(name) || name.length < 2) continue; // garbage

        records.push({
            full_name: name,
            registration_number: get('registration_number'),
            roll_number: get('roll_number'),
            father_name: get('father_name') || null,
            father_cnic: get('father_cnic') || null,
            contact_number: get('contact_number') || null,
            gender: parseGender(get('gender')),
            date_of_birth: parseDate(get('date_of_birth')),
            date_of_admission: parseDate(get('date_of_admission')),
            admission_class: get('admission_class') || currentGrade || null,
            address: get('address') || null,
            grade_context: currentGrade,
        });
    }
    return records;
}

// ── Main ──────────────────────────────────────────────────────────────
(async () => {
    try {
        console.log('📂 Reading CSV...');
        const csvRecords = parseCSV(CSV_PATH);
        console.log(`   Parsed ${csvRecords.length} records from CSV.`);

        // Fetch ALL students in this branch
        console.log('🔄 Fetching students from DB...');
        const { data: dbStudents, error: dbErr } = await supabaseAdmin
            .from('students')
            .select('id, full_name, registration_number, roll_number, father_name, father_cnic, contact_number, gender, date_of_birth, date_of_admission, admission_class, address')
            .eq('branch_id', BRANCH_ID);

        if (dbErr) throw dbErr;
        console.log(`   Found ${dbStudents.length} students in DB.\n`);

        // Build lookup maps
        const byReg = new Map(dbStudents.map(s => [String(s.registration_number || '').trim(), s]));
        const byRoll = new Map(dbStudents.map(s => [String(s.roll_number || '').trim(), s]));

        let updated = 0, skipped = 0, noMatch = 0;
        const failedNames = [];
        const updatesQueue = [];

        for (const csv of csvRecords) {
            // Match by reg number first, then roll number
            const regKey = String(csv.registration_number || '').trim();
            const rollKey = String(csv.roll_number || '').trim();

            const dbStudent = (regKey && byReg.get(regKey))
                || (rollKey && byRoll.get(rollKey))
                || null;

            if (!dbStudent) {
                noMatch++;
                failedNames.push(`  ✗ NOT IN DB: ${csv.full_name} (Reg:${regKey || 'none'}, Roll:${rollKey || 'none'})`);
                continue;
            }

            // Build partial update: only fill fields that are currently NULL in DB
            const patch = {};
            const fill = (csvVal, dbKey) => {
                if (csvVal && !dbStudent[dbKey]) patch[dbKey] = csvVal;
            };

            fill(csv.father_name, 'father_name');
            fill(csv.father_cnic, 'father_cnic');
            fill(csv.contact_number, 'contact_number');
            fill(csv.gender, 'gender');
            fill(csv.date_of_birth, 'date_of_birth');
            fill(csv.date_of_admission, 'date_of_admission');
            fill(csv.admission_class, 'admission_class');
            fill(csv.address, 'address');
            // Always update roll_number and full_name if different
            if (rollKey && !dbStudent.roll_number) patch.roll_number = rollKey;

            if (Object.keys(patch).length === 0) {
                skipped++;
                continue; // nothing new to fill
            }

            updatesQueue.push({ id: dbStudent.id, patch, name: csv.full_name });
        }

        console.log(`📊 ${updatesQueue.length} students need profile updates, ${skipped} already complete, ${noMatch} not found in DB.\n`);

        if (updatesQueue.length === 0) {
            console.log('✅ All students in DB already have complete data!');
            if (noMatch > 0) {
                console.log(`\n⚠️  ${noMatch} CSV records had no matching student in DB:`);
                failedNames.slice(0, 20).forEach(l => console.log(l));
            }
            return;
        }

        // Batch update in chunks of 50
        const CHUNK = 50;
        let done = 0;
        for (let i = 0; i < updatesQueue.length; i += CHUNK) {
            const chunk = updatesQueue.slice(i, i + CHUNK);
            const results = await Promise.all(
                chunk.map(({ id, patch }) =>
                    supabaseAdmin.from('students').update(patch).eq('id', id).select('id').single()
                )
            );
            results.forEach(({ error }) => {
                if (error) console.error('  ⚠️  Update error:', error.message);
                else done++;
            });
            console.log(`  Progress: ${Math.min(i + CHUNK, updatesQueue.length)} / ${updatesQueue.length}`);
        }

        updated = done;
        console.log(`\n✅ DONE! Updated ${updated} student profiles from CSV.`);
        console.log(`   Skipped (already complete): ${skipped}`);
        console.log(`   Not found in DB: ${noMatch}`);

        if (noMatch > 0) {
            console.log(`\n⚠️  These ${noMatch} CSV records had no match in DB:`);
            failedNames.slice(0, 20).forEach(l => console.log(l));
            if (noMatch > 20) console.log(`  ... and ${noMatch - 20} more`);
        }

    } catch (err) {
        console.error('❌ Error:', err.message || err);
        process.exit(1);
    }
})();
