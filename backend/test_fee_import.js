const fs = require('fs');
const path = require('path');
const Papa = require('c:/Users/hassa/Downloads/SMS-System-main/backend/node_modules/papaparse');

const csvPath = "C:\\Users\\hassa\\Documents\\Fee Challan with data file  August ,2026.0.csv";
const buffer = fs.readFileSync(csvPath);

const COLUMN_KEY_MAP = {
  'name': 'full_name',
  'student_name': 'full_name',
  'full_name': 'full_name',
  'roll': 'roll_number',
  'roll_no': 'roll_number',
  'roll_no.': 'roll_number',
  'roll_number': 'roll_number',
  'reg._no.': 'registration_number',
  'reg_no': 'registration_number',
  'reg:no': 'registration_number',
  'registration_no': 'registration_number',
  'registration_number': 'registration_number',
  'voucher_no.': 'voucher_number',
  'v_no': 'voucher_number',
  'vno': 'voucher_number',
  'fee': 'monthly_fee',
  'annual_charges': 'annual_charges',
  'previous_balance': 'previous_balance',
  'total_fee': 'total_fee',
  'father_name': 'father_name',
  'father_cnic': 'father_cnic',
  'contact_no._1': 'contact_number',
  'contact_no_1': 'contact_number',
  'contact_number': 'contact_number',
  'gender': 'gender',
  'gander': 'gender',
  'gendar': 'gender',
  'date_of_birth': 'date_of_birth',
  'date_of_admission': 'date_of_admission',
  'admission_in_class': 'admission_class',
  'address': 'address',
};

const text = buffer.toString('utf8').replace(/^\uFEFF/, '');
const rawLines = text.split(/\r?\n/);

let currentGrade = '';
let currentHeaderMap = null;
const records = [];

for (let lineIndex = 0; lineIndex < rawLines.length; lineIndex++) {
  const line = rawLines[lineIndex].trim();
  if (!line) continue;

  const gradeMatch = line.match(/Grade:\s*([^,:]+)/i);
  if (gradeMatch) {
    currentGrade = gradeMatch[1].trim();
    continue;
  }

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
    const voucherNumber = getFieldValue('voucher_number');
    let regNo = getFieldValue('registration_number');

    if (!fullName || fullName.toLowerCase() === 'name') continue;

    if (!regNo) {
      if (rollNumber) regNo = rollNumber;
      else if (voucherNumber) regNo = `V-${voucherNumber}`;
      else regNo = `GEN-${lineIndex + 1}`;
    }

    const monthlyFee = parseFloat(getFieldValue('monthly_fee') || 0) || 0;
    const previousBalance = parseFloat(getFieldValue('previous_balance') || 0) || 0;
    const totalFee = parseFloat(getFieldValue('total_fee') || (monthlyFee + previousBalance)) || 0;

    records.push({
      name: fullName,
      regNo,
      monthlyFee,
      previousBalance,
      totalFee
    });
  }
}

console.log("Total records:", records.length);
console.log("Sample 5 records with fee:", records.slice(0, 5));
console.log("Count of records with totalFee > 0:", records.filter(r => r.totalFee > 0).length);
