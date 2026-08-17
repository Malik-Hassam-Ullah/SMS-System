require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const { supabaseAdmin } = require('./src/config/supabase');

const CSV_PATH = path.join('C:', 'Users', 'hassa', 'Documents', 'Fee Challan with data file  August ,2026.0.csv');
const TARGET_BRANCH_NAME = 'Main Campus';
const FEE_MONTH = 'August 2026';
const DUE_DATE = '2026-08-31';

const parseDate = (value) => {
  if (!value) return null;
  const text = String(value).trim();
  if (!text) return null;

  const normalize = (str) => str.trim()
    .replace(/[\.\-]/g, '/')
    .replace(/\s+/g, ' ')
    .replace(/\/+/g, '/');
  const input = normalize(text);

  const dmy = /^([0-9]{1,2})\/(\d{1,2})\/(\d{2,4})$/;
  const ymd = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/;

  let year = null;
  let month = null;
  let day = null;
  let match;

  if ((match = input.match(dmy))) {
    day = match[1];
    month = match[2];
    year = match[3].length === 2 ? `20${match[3]}` : match[3];
  } else if ((match = input.match(ymd))) {
    year = match[1];
    month = match[2];
    day = match[3];
  }

  if (year && month && day) {
    const intYear = Number(year);
    const intMonth = Number(month);
    const intDay = Number(day);
    if (intYear >= 1900 && intYear <= 2100 && intMonth >= 1 && intMonth <= 12 && intDay >= 1 && intDay <= 31) {
      const iso = `${String(intYear).padStart(4, '0')}-${String(intMonth).padStart(2, '0')}-${String(intDay).padStart(2, '0')}`;
      return iso;
    }
  }

  return null;
};

(async () => {
  try {
    if (!fs.existsSync(CSV_PATH)) {
      throw new Error(`CSV file not found at ${CSV_PATH}`);
    }

    const branchResult = await supabaseAdmin
      .from('branches')
      .select('id,name,school_id')
      .ilike('name', `%${TARGET_BRANCH_NAME}%`)
      .limit(1)
      .single();

    if (branchResult.error || !branchResult.data) {
      throw new Error(`Branch lookup failed: ${branchResult.error?.message || 'not found'}`);
    }

    const branch = branchResult.data;
    console.log('Using branch:', branch.name, branch.id);

    console.log('Deleting existing fee payments, vouchers, and outstanding balances for branch...');
    const deletePayments = await supabaseAdmin.from('fee_payments').delete().eq('branch_id', branch.id);
    if (deletePayments.error) throw deletePayments.error;
    const deleteVouchers = await supabaseAdmin.from('fee_vouchers').delete().eq('branch_id', branch.id);
    if (deleteVouchers.error) throw deleteVouchers.error;
    const deleteBalance = await supabaseAdmin.from('student_outstanding_balance').delete().eq('branch_id', branch.id);
    if (deleteBalance.error) throw deleteBalance.error;
    console.log('Old fee data removed.');

    const csvString = fs.readFileSync(CSV_PATH, 'utf8');
    const lines = csvString.split(/\r?\n/);
    const headerIndex = lines.findIndex(line => /V\.No\s*,\s*Roll No\.|V\.No\s*,\s*Roll No\.|Roll No\.|Reg:NO/i.test(line));
    if (headerIndex === -1) {
      throw new Error('Unable to locate the invoice header row in the CSV file.');
    }

    const linesToParse = lines.slice(headerIndex);
    const parsed = Papa.parse(linesToParse.join('\n'), {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => String(h || '')
        .trim()
        .toLowerCase()
        .replace(/[\s\.;:]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, ''),
    });

    if (parsed.errors.length) {
      console.error('CSV parse errors:', parsed.errors);
    }

    const records = parsed.data.map(row => {
      return Object.fromEntries(Object.entries(row)
        .filter(([k]) => k && String(k).trim() !== '')
        .map(([k, v]) => [k.trim(), String(v || '').trim()]));
    }).filter(row => Object.values(row).some(v => v !== ''));

    const columnMap = {
      'v_no': 'voucher_number',
      'v_no_': 'voucher_number',
      'vno': 'voucher_number',
      'roll_no': 'roll_number',
      'roll_no_': 'roll_number',
      'roll_no.': 'roll_number',
      'roll_no,': 'roll_number',
      'name': 'full_name',
      'fee': 'fee',
      'annual_charges': 'annual_charges',
      'reg_charges': 'reg_charges',
      'reg_charges_': 'reg_charges',
      'previous_balance': 'previous_balance',
      'total_fee': 'total_fee',
      'regno': 'registration_number',
      'reg_no': 'registration_number',
      'reg_no_': 'registration_number',
      'regno_': 'registration_number',
      'reg_no:': 'registration_number',
      'reg_no.': 'registration_number',
      'reg_no:': 'registration_number',
      'reg_no_:': 'registration_number',
      'father_name': 'father_name',
      'father_cnic': 'father_cnic',
      'contact_no_1': 'contact_number',
      'gander': 'gender',
      'gender': 'gender',
      'date_of_birth': 'date_of_birth',
      'date_of_admission': 'date_of_admission',
      'admission_in_class': 'admission_class',
      'address': 'address',
    };

    const mapped = records.map((row, index) => {
      const out = { rowIndex: index + 2 };
      Object.entries(row).forEach(([key, value]) => {
        const normalizedKey = key.replace(/[\s\.;:]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
        const mappedKey = columnMap[normalizedKey] || null;
        if (mappedKey) out[mappedKey] = value;
      });
      return out;
    });

    const validRows = mapped.filter(r => r.full_name && r.registration_number);
    console.log(`Parsed ${records.length} rows, ${validRows.length} valid student/fee rows.`);

    const registrationNumbers = [...new Set(validRows.map(r => r.registration_number))];
    const { data: existingStudents } = await supabaseAdmin
      .from('students')
      .select('id,registration_number,branch_id')
      .in('registration_number', registrationNumbers);

    const existingStudentMap = {};
    (existingStudents || []).forEach(s => {
      if (s.branch_id === branch.id) {
        existingStudentMap[s.registration_number] = s.id;
      }
    });

    const studentsToInsert = [];
    const studentByReg = { ...existingStudentMap };
    const seenNewRegs = new Set();

    for (const row of validRows) {
      if (!studentByReg[row.registration_number] && !seenNewRegs.has(row.registration_number)) {
        seenNewRegs.add(row.registration_number);
        studentsToInsert.push({
          branch_id: branch.id,
          full_name: row.full_name,
          registration_number: row.registration_number,
          roll_number: row.roll_number || null,
          father_name: row.father_name || null,
          father_cnic: row.father_cnic || null,
          contact_number: row.contact_number || null,
          gender: ['m','f','male','female'].includes((row.gender || '').toLowerCase()) ? (row.gender.toLowerCase().startsWith('m') ? 'male' : 'female') : null,
          date_of_birth: parseDate(row.date_of_birth),
          date_of_admission: parseDate(row.date_of_admission),
          admission_class: row.admission_class || null,
          address: row.address || null,
          is_active: true,
        });
      }
    }

    if (studentsToInsert.length > 0) {
      console.log(`Creating ${studentsToInsert.length} new student records.`);
      const { data: insertedStudents, error: insertStudentError } = await supabaseAdmin
        .from('students')
        .insert(studentsToInsert)
        .select('id,registration_number');
      if (insertStudentError) throw insertStudentError;
      insertedStudents.forEach(s => { studentByReg[s.registration_number] = s.id; });
    }

    const parseNumber = (value) => {
      if (value == null || value === '') return 0;
      return Number(String(value).replace(/[^0-9.-]/g, '')) || 0;
    };

    const usedVoucherNumbers = new Set();
    const vouchers = validRows.map((row, index) => {
      const studentId = studentByReg[row.registration_number];
      if (!studentId) return null;
      const feeNum = parseNumber(row.fee || row.total_fee);
      const annual = parseNumber(row.annual_charges);
      const regCharge = parseNumber(row.reg_charges);
      const previous = parseNumber(row.previous_balance);
      const currentFee = feeNum || parseNumber(row.total_fee);
      let voucherNumber = row.voucher_number && String(row.voucher_number).trim()
        ? String(row.voucher_number).trim()
        : `VCH-${FEE_MONTH.replace(/\s+/g, '_')}-${String(index + 1).padStart(4, '0')}`;
      let suffix = 1;
      while (usedVoucherNumbers.has(voucherNumber)) {
        voucherNumber = `${voucherNumber}-${suffix}`;
        suffix += 1;
      }
      usedVoucherNumbers.add(voucherNumber);
      return {
        branch_id: branch.id,
        student_id: studentId,
        voucher_number: voucherNumber,
        fee_month: FEE_MONTH,
        due_date: DUE_DATE,
        current_fee: currentFee,
        previous_balance: previous,
        other_charges: annual + regCharge,
        discount: 0,
        amount_paid: 0,
        status: 'unpaid',
        notes: row.father_name ? `Father: ${row.father_name}` : null,
      };
    }).filter(Boolean);

    if (vouchers.length === 0) {
      console.log('No valid vouchers to insert. Exiting.');
      process.exit(0);
    }

    console.log(`Inserting ${vouchers.length} voucher records.`);
    const { data: createdVouchers, error: createVouchersError } = await supabaseAdmin
      .from('fee_vouchers')
      .insert(vouchers)
      .select('id,voucher_number');
    if (createVouchersError) throw createVouchersError;

    await Promise.all(vouchers.map(v => supabaseAdmin.from('student_outstanding_balance').upsert({
      branch_id: branch.id,
      student_id: v.student_id,
      total_outstanding: v.previous_balance + v.current_fee + v.other_charges - v.discount,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'student_id' })));

    const createdCount = Array.isArray(createdVouchers) ? createdVouchers.length : 0;
    console.log('Import complete. Created vouchers:', createdCount);
    process.exit(0);
  } catch (error) {
    console.error('Import failed:', error.message || error);
    process.exit(1);
  }
})();
