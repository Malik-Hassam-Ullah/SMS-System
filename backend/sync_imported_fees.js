require('dotenv').config();
const fs = require('fs');
const Papa = require('./node_modules/papaparse');
const { supabaseAdmin } = require('./src/config/supabase');

const csvPath = "C:\\Users\\hassa\\Documents\\Fee Challan with data file  August ,2026.0.csv";
const buffer = fs.readFileSync(csvPath);

const COLUMN_KEY_MAP = {
  'name': 'full_name',
  'roll_no': 'roll_number',
  'roll_no.': 'roll_number',
  'reg_no': 'registration_number',
  'reg:no': 'registration_number',
  'fee': 'monthly_fee',
  'previous_balance': 'previous_balance',
  'total_fee': 'total_fee',
};

const text = buffer.toString('utf8').replace(/^\uFEFF/, '');
const rawLines = text.split(/\r?\n/);

let currentHeaderMap = null;
const records = [];

for (let lineIndex = 0; lineIndex < rawLines.length; lineIndex++) {
  const line = rawLines[lineIndex].trim();
  if (!line) continue;

  const isHeaderRow = /\b(?:v\.?no|roll\s*no|name|reg[:;,.]?\s*no|father\s*name)\b/i.test(line);
  if (isHeaderRow) {
    const parsedHeader = Papa.parse(line).data[0] || [];
    const newHeaderMap = {};
    parsedHeader.forEach((col, idx) => {
      const rawCol = String(col || '').trim();
      if (!rawCol) return;
      const normalizedKey = rawCol.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
      const mappedDbKey = COLUMN_KEY_MAP[normalizedKey];
      if (mappedDbKey && newHeaderMap[mappedDbKey] === undefined) {
        newHeaderMap[mappedDbKey] = idx;
      }
    });
    if (newHeaderMap['full_name'] !== undefined) {
      currentHeaderMap = newHeaderMap;
    }
    continue;
  }

  if (currentHeaderMap) {
    const rowFields = Papa.parse(line).data[0] || [];
    if (!rowFields || rowFields.length === 0) continue;
    const lineLower = line.toLowerCase();
    if (lineLower.includes('total') || lineLower.includes('smart school')) continue;

    const getFieldValue = (dbKey) => {
      const idx = currentHeaderMap[dbKey];
      if (idx === undefined || idx >= rowFields.length) return '';
      return String(rowFields[idx] || '').trim();
    };

    const fullName = getFieldValue('full_name');
    const rollNumber = getFieldValue('roll_number');
    let regNo = getFieldValue('registration_number');

    if (!fullName || fullName.toLowerCase() === 'name') continue;

    if (!regNo) {
      if (rollNumber) regNo = rollNumber;
      else regNo = `GEN-${lineIndex + 1}`;
    }

    const monthlyFee = parseFloat(getFieldValue('monthly_fee') || 0) || 0;
    const previousBalance = parseFloat(getFieldValue('previous_balance') || 0) || 0;
    const totalFee = parseFloat(getFieldValue('total_fee') || (monthlyFee + previousBalance)) || 0;

    const cleanStr = (val, maxLen = 255) => {
      if (!val) return null;
      const cleaned = String(val).replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim();
      return cleaned ? cleaned.slice(0, maxLen) : null;
    };

    records.push({
      registration_number: cleanStr(regNo, 100),
      total_fee: totalFee,
    });
  }
}

async function syncFees() {
  const { data: students, error: stErr } = await supabaseAdmin
    .from('students')
    .select('id, branch_id, registration_number');

  if (stErr) {
    console.error("Error fetching students:", stErr);
    return;
  }

  const feeMap = new Map(records.map(r => [r.registration_number, r.total_fee]));
  const balancePayloads = [];

  students.forEach(s => {
    const regNo = String(s.registration_number).trim();
    const feeAmt = feeMap.get(regNo) || 0;
    if (feeAmt > 0) {
      balancePayloads.push({
        branch_id: s.branch_id,
        student_id: s.id,
        total_outstanding: feeAmt,
        updated_at: new Date().toISOString(),
      });
    }
  });

  console.log(`Syncing fee balances for ${balancePayloads.length} students...`);

  const BATCH_SIZE = 100;
  let successCount = 0;
  for (let i = 0; i < balancePayloads.length; i += BATCH_SIZE) {
    const chunk = balancePayloads.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabaseAdmin
      .from('student_outstanding_balance')
      .upsert(chunk, { onConflict: 'student_id' })
      .select();

    if (error) {
      console.error("Error in batch upsert:", error);
    } else if (data) {
      successCount += data.length;
    }
  }

  console.log(`Successfully synced ${successCount} fee balances into database!`);
}

syncFees();
