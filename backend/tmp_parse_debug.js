const fs = require('fs');
const Papa = require('papaparse');
const raw = fs.readFileSync('C:/Users/hassa/Documents/Fee Challan with data file  August ,2026.0.csv', 'utf8').replace(/^\uFEFF/, '');
const lines = raw.split(/\r?\n/).map(l => l.trim());
const headerIndex = lines.findIndex(line => /\b(?:v\.?no|voucher\s*no|roll\s*no|roll\s*number|roll_number|reg(?:istration)?[:;,.]?\s*no|reg(?:istration)?\s*number|reg\.?no|reg_no|registration_number|student\s*name|name|full\s*name|full_name)\b/i.test(line));
const csv = lines.slice(headerIndex).join('\n');
const result = Papa.parse(csv, {
  header: true,
  skipEmptyLines: true,
  transformHeader: h => String(h || '').trim().toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/_+/g,'_').replace(/^_+|_+$/g,'')
});
const rows = result.data;
const COLUMN_MAP = {
  'name':'full_name','student_name':'full_name','full_name':'full_name','studentfullname':'full_name',
  'roll':'roll_number','roll_no':'roll_number','roll_no_':'roll_number','roll_number':'roll_number','rollno':'roll_number',
  'roll_number_':'roll_number','roll_number.':'roll_number','reg._no.':'registration_number','reg_no':'registration_number',
  'reg_no_':'registration_number','reg:no':'registration_number','reg:no.':'registration_number','reg:no_':'registration_number',
  'regno':'registration_number','regno_':'registration_number','registration_no':'registration_number','registration_no.':'registration_number','registration_no_':'registration_number',
  'registration_number':'registration_number','registrationnumber':'registration_number','registration':'registration_number','student_reg':'registration_number','student_reg_no':'registration_number',
  'voucher_no.':'voucher_number','voucher_no':'voucher_number','v_no':'voucher_number','vno':'voucher_number',
  'father_name':'father_name','father_cnic':'father_cnic','contact_no.':'contact_number','contact_no':'contact_number','contact_no_1':'contact_number','contact_no._1':'contact_number','contact_number':'contact_number',
  'gender':'gender','gander':'gender','date_of_birth':'date_of_birth','dob':'date_of_birth','date_of_admission':'date_of_admission','admission_date':'date_of_admission','admission_in_class':'admission_class','address':'address'
};
let valid = [];
rows.forEach((row,i) => {
  const mapped = {};
  Object.entries(row).forEach(([k,v]) => {
    const key = String(k||'').trim().toLowerCase();
    const mappedKey = COLUMN_MAP[key];
    if (mappedKey) mapped[mappedKey] = String(v||'').trim();
  });
  if (mapped.full_name && mapped.registration_number) valid.push(mapped);
});
console.log(JSON.stringify({headerIndex, fields: result.meta.fields, rows: rows.length, valid: valid.length, firstValid: valid[0] || null}, null, 2));
