const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');
const { logAudit } = require('../utils/audit.util');
const multer = require('multer');
const XLSX = require('xlsx');
const Papa = require('papaparse');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const normalizeDateValue = (value) => {
  if (!value) return null;

  let text = String(value).trim();
  if (!text) return null;

  // Clean double slashes & dashes e.g. "03/11//2021" -> "03/11/2021"
  text = text.replace(/\/+/g, '/').replace(/-+/g, '-').trim();

  // If YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [y, m, d] = text.split('-').map(n => parseInt(n, 10));
    if (y >= 1950 && y <= 2099 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return text;
    }
    return null;
  }

  // Match DD/MM/YYYY or MM/DD/YYYY or DD-MM-YYYY
  const match = text.match(/^(\d{1,3})[/-](\d{1,2})[/-](\d{2,8})$/);
  if (match) {
    let [, dayStr, monthStr, yearStr] = match;

    // Fix crazy years e.g. 202020 -> 2020, 20260 -> 2026
    if (yearStr.length > 4) {
      if (yearStr.startsWith('20')) {
        yearStr = yearStr.slice(0, 4);
      } else {
        yearStr = yearStr.slice(-4);
      }
    } else if (yearStr.length === 2) {
      yearStr = `20${yearStr}`;
    }

    let y = parseInt(yearStr, 10);
    let m = parseInt(monthStr, 10);
    let d = parseInt(dayStr, 10);

    if (d > 31 && dayStr.length === 3) {
      dayStr = dayStr.slice(-2);
      d = parseInt(dayStr, 10);
    }

    // Handle MM/DD/YYYY if m > 12 and d <= 12
    if (m > 12 && d <= 12) {
      const temp = m;
      m = d;
      d = temp;
    }

    if (y >= 1950 && y <= 2099 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const normalizedDay = String(d).padStart(2, '0');
      const normalizedMonth = String(m).padStart(2, '0');
      return `${y}-${normalizedMonth}-${normalizedDay}`;
    }
  }

  // Try standard Date parsing as fallback
  const parsed = Date.parse(text);
  if (!Number.isNaN(parsed)) {
    const dt = new Date(parsed);
    const y = dt.getFullYear();
    if (y >= 1950 && y <= 2099) {
      return dt.toISOString().split('T')[0];
    }
  }

  return null;
};

const normalizeGenderValue = (value) => {
  if (!value) return null;

  const text = String(value).trim().toLowerCase();
  if (!text) return null;

  if (['male', 'm', 'boy', 'gentleman', 'gendar', 'gander'].includes(text)) return 'male';
  if (['female', 'f', 'girl', 'lady'].includes(text)) return 'female';
  if (['other', 'o', 'nonbinary', 'non-binary', 'prefer_not_to_say'].includes(text)) return 'other';

  return null;
};

const COLUMN_KEY_MAP = {
  'name': 'full_name',
  'student_name': 'full_name',
  'full_name': 'full_name',
  'studentfullname': 'full_name',
  'roll': 'roll_number',
  'roll_no': 'roll_number',
  'roll_no.': 'roll_number',
  'roll_no_': 'roll_number',
  'roll_number': 'roll_number',
  'rollno': 'roll_number',
  'reg._no.': 'registration_number',
  'reg_no': 'registration_number',
  'reg_no.': 'registration_number',
  'reg:no': 'registration_number',
  'reg:no.': 'registration_number',
  'regno': 'registration_number',
  'registration_no': 'registration_number',
  'registration_number': 'registration_number',
  'voucher_no.': 'voucher_number',
  'voucher_no': 'voucher_number',
  'v_no': 'voucher_number',
  'vno': 'voucher_number',
  'fee': 'monthly_fee',
  'new_fee': 'monthly_fee',
  'monthly_fee': 'monthly_fee',
  'tuition_fee': 'monthly_fee',
  'current_fee': 'monthly_fee',
  'annual_charges': 'annual_charges',
  'other_charges': 'annual_charges',
  'reg_charges': 'annual_charges',
  'reg_charges_': 'annual_charges',
  'previous_balance': 'previous_balance',
  'arrears': 'previous_balance',
  'prev_balance': 'previous_balance',
  'total_fee': 'total_fee',
  'total_payable': 'total_fee',
  'total': 'total_fee',
  'father_name': 'father_name',
  'father_s_name': 'father_name',
  'fathername': 'father_name',
  'father_cnic': 'father_cnic',
  'father_s_cnic': 'father_cnic',
  'fathercnic': 'father_cnic',
  'cnic': 'father_cnic',
  'contact_no._1': 'contact_number',
  'contact_no_1': 'contact_number',
  'contact_number': 'contact_number',
  'contact_no': 'contact_number',
  'contact': 'contact_number',
  'contactno': 'contact_number',
  'phone': 'contact_number',
  'phone_no': 'contact_number',
  'phone_no.': 'contact_number',
  'phone_number': 'contact_number',
  'phoneno': 'contact_number',
  'mobile': 'contact_number',
  'mobile_no': 'contact_number',
  'mobile_no.': 'contact_number',
  'mobile_number': 'contact_number',
  'mobileno': 'contact_number',
  'cell': 'contact_number',
  'cell_no': 'contact_number',
  'cell_no.': 'contact_number',
  'cell_number': 'contact_number',
  'cellno': 'contact_number',
  'whatsapp': 'contact_number',
  'whatsapp_no': 'contact_number',
  'whatsapp_no.': 'contact_number',
  'whatsapp_number': 'contact_number',
  'whatsappno': 'contact_number',
  'phone_number_1': 'contact_number',
  'phone_number_2': 'contact_number',
  'contact_1': 'contact_number',
  'contact_2': 'contact_number',
  'mobile_1': 'contact_number',
  'mobile_2': 'contact_number',
  'gender': 'gender',
  'gander': 'gender',
  'gendar': 'gender',
  'date_of_birth': 'date_of_birth',
  'dob': 'date_of_birth',
  'date_of_admission': 'date_of_admission',
  'admission_date': 'date_of_admission',
  'admission_in_class': 'admission_class',
  'address': 'address',
  'residential_address': 'address',
  'home_address': 'address',
  'father_occupation': 'father_occupation',
  'father_status': 'father_status',
  'primary_contact_person': 'primary_contact_person',
  'concession_type': 'concession_type',
  'concession_percentage': 'concession_percentage',
  'nationality': 'nationality',
  'place_of_birth': 'place_of_birth',
  'age_relaxation': 'age_relaxation',
  'parent_email': 'parent_email',
  'email': 'parent_email',
  'email_address': 'parent_email',
};

// Multi-section CSV & Excel Parser for Fee Challans & General Student Imports
const parseStudentRecordsFromBuffer = (buffer, isCsv) => {
  const records = [];
  const detectedColumns = new Set();

  // Native Excel & CSV parsing
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  let targetSheet = null;
  let sheetData = [];

  // Find the sheet with data ("Data File " or similar)
  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
    // Check if any row looks like the header
    const hasHeader = data.some(row => row && Array.isArray(row) && row.some(cell => typeof cell === 'string' && /^(v\.?no|name|reg[:;,.]?\s*no)$/i.test(cell.trim())));
    if (hasHeader) {
      targetSheet = ws;
      sheetData = data;
      break;
    }
  }

  if (!targetSheet && workbook.SheetNames.length > 0) {
    sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: null, raw: true });
  }

  let headerMap = null;
  let currentGrade = '';

  for (let lineIndex = 0; lineIndex < sheetData.length; lineIndex++) {
    const row = sheetData[lineIndex];
    if (!row || !Array.isArray(row)) continue;

    // Check for Grade/Class section header (e.g., "Grade: PlayGroup/A")
    const firstCell = String(row[0] || '').trim();
    const gradeMatch = firstCell.match(/Grade:\s*([^,:]+)/i);
    if (gradeMatch) {
      currentGrade = gradeMatch[1].trim();
      continue;
    }

    // Detect Header Row
    if (!headerMap) {
      const isHeaderRow = row.some(cell => typeof cell === 'string' && /\b(?:v\.?no|roll\s*no|name|reg[:;,.]?\s*no|father\s*name)\b/i.test(cell.trim()));
      if (isHeaderRow) {
        headerMap = {};
        row.forEach((col, idx) => {
          const rawCol = String(col || '').trim();
          if (!rawCol) return;
          const normalizedKey = rawCol.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
          detectedColumns.add(normalizedKey);
          const mappedDbKey = COLUMN_KEY_MAP[normalizedKey];
          if (mappedDbKey && headerMap[mappedDbKey] === undefined) {
            headerMap[mappedDbKey] = idx;
          }
        });
        continue;
      }
    }

    // Parse Data Row
    if (headerMap) {
      const getFieldValue = (dbKey) => {
        const idx = headerMap[dbKey];
        if (idx === undefined || idx >= row.length) return '';
        return row[idx] !== null && row[idx] !== undefined ? String(row[idx]).trim() : '';
      };

      const fullName = getFieldValue('full_name');
      const rollNumber = getFieldValue('roll_number');
      const voucherNumber = getFieldValue('voucher_number');
      let regNo = getFieldValue('registration_number');

      // Skip invalid/empty student rows
      if (!fullName || fullName.toLowerCase() === 'name' || fullName.toLowerCase() === 'student name') continue;
      if (/^\d+$/.test(fullName.trim())) continue; // Skip garbage rows (pure numbers)
      if (fullName.trim().length < 2) continue;

      // Fallback for registration number
      if (!regNo) {
        if (rollNumber) regNo = rollNumber;
        else if (voucherNumber) regNo = `V-${voucherNumber}`;
        else regNo = `GEN-${lineIndex + 1}`;
      }

      const cleanStr = (val, maxLen = 255) => {
        if (!val) return null;
        const cleaned = String(val).replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim();
        return cleaned ? cleaned.slice(0, maxLen) : null;
      };

      const monthlyFee = parseFloat(getFieldValue('monthly_fee') || 0) || 0;
      const previousBalance = parseFloat(getFieldValue('previous_balance') || 0) || 0;
      const totalFee = parseFloat(getFieldValue('total_fee') || (monthlyFee + previousBalance)) || 0;
      const admissionClass = cleanStr(getFieldValue('admission_class') || currentGrade, 100);

      // Date parsing for Excel serial numbers
      const parseExcelDate = (val) => {
        if (!val) return null;
        if (!isNaN(val) && typeof val === 'number') {
          const date = XLSX.SSF.parse_date_code(val);
          if (date) return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
        }
        return normalizeDateValue(val);
      };

      const rawDob = headerMap['date_of_birth'] !== undefined ? row[headerMap['date_of_birth']] : null;
      const rawDoa = headerMap['date_of_admission'] !== undefined ? row[headerMap['date_of_admission']] : null;

      // Normalize contact number
      let contactNo = getFieldValue('contact_number');
      if (contactNo) {
        contactNo = String(contactNo).replace(/[^0-9]/g, '');
        if (/^3\d{9}$/.test(contactNo)) {
          contactNo = '0' + contactNo;
        }
      }

      records.push({
        raw_row: lineIndex + 1,
        full_name: cleanStr(fullName, 150) || 'Unnamed Student',
        registration_number: cleanStr(regNo, 100) || `GEN-${lineIndex + 1}`,
        roll_number: cleanStr(rollNumber, 50),
        voucher_number: cleanStr(voucherNumber, 50),
        father_name: cleanStr(getFieldValue('father_name'), 150),
        father_cnic: cleanStr(getFieldValue('father_cnic'), 50),
        contact_number: cleanStr(contactNo, 50),
        gender: normalizeGenderValue(getFieldValue('gender')),
        date_of_birth: parseExcelDate(rawDob),
        date_of_admission: parseExcelDate(rawDoa),
        admission_class: admissionClass,
        address: cleanStr(getFieldValue('address'), 300) || 'Kahuta', // Default address
        father_occupation: cleanStr(getFieldValue('father_occupation'), 100),
        father_status: cleanStr(getFieldValue('father_status'), 50),
        primary_contact_person: cleanStr(getFieldValue('primary_contact_person'), 50),
        concession_type: cleanStr(getFieldValue('concession_type'), 50),
        concession_percentage: parseFloat(getFieldValue('concession_percentage')) || null,
        nationality: cleanStr(getFieldValue('nationality'), 50),
        place_of_birth: cleanStr(getFieldValue('place_of_birth'), 100),
        age_relaxation: cleanStr(getFieldValue('age_relaxation'), 50),
        parent_email: cleanStr(getFieldValue('parent_email'), 150),
        monthly_fee: monthlyFee,
        previous_balance: previousBalance,
        total_fee: totalFee,
        section_context: currentGrade,
      });
    }
  }

  return { records, detectedColumns: Array.from(detectedColumns) };
};

// POST /api/import/students — Admin only
router.post('/students', authenticate, requireRole('admin'), upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const { action = 'preview' } = req.query; // preview | import
  const ext = req.file.originalname.toLowerCase().split('.').pop();

  if (ext !== 'csv' && ext !== 'xlsx' && ext !== 'xls') {
    return res.status(400).json({ success: false, message: 'Only CSV or Excel (.xlsx, .xls) files are supported' });
  }

  const { records, detectedColumns } = parseStudentRecordsFromBuffer(req.file.buffer, ext === 'csv');

  if (records.length === 0) {
    return res.status(422).json({
      success: false,
      message: 'No student records could be parsed from the file. Please check file format.',
      detectedColumns,
    });
  }

  // Fetch existing classes & sections in this branch for auto-linking
  const [{ data: dbClasses }, { data: dbSections }] = await Promise.all([
    supabaseAdmin.from('classes').select('id, name').eq('branch_id', req.branchId),
    supabaseAdmin.from('sections').select('id, name, class_id').eq('branch_id', req.branchId),
  ]);

  const classMap = new Map((dbClasses || []).map(c => [c.name.trim().toLowerCase(), c.id]));
  const sectionMap = new Map((dbSections || []).map(s => [`${s.class_id}:${s.name.trim().toLowerCase()}`, s.id]));

  const invalid = [];
  const duplicates = [];
  const valid = [];
  const seenRegistrationNumbers = new Set();

  records.forEach((student, index) => {
    if (!student.full_name || !student.registration_number) {
      invalid.push({
        row: student.raw_row,
        data: student,
        reason: 'Missing name or registration number',
      });
      return;
    }

    const regNo = String(student.registration_number).trim();
    if (seenRegistrationNumbers.has(regNo)) {
      duplicates.push({
        row: student.raw_row,
        registration_number: regNo,
        name: student.full_name,
        reason: 'Duplicate registration number within file',
      });
      return;
    }

    seenRegistrationNumbers.add(regNo);

    // Auto link class & section if match found
    let currentClassId = null;
    let currentSectionId = null;

    const classHint = student.admission_class || student.section_context || '';
    if (classHint) {
      let possibleClassName = '';
      let possibleSectionName = '';

      if (classHint.includes('/')) {
        const parts = classHint.split('/');
        possibleClassName = parts[0].trim().toLowerCase();
        possibleSectionName = parts[1].trim().toLowerCase();
      } else {
        const match = classHint.trim().match(/^(.*?)(?:\s+([a-zA-Z]))?$/);
        if (match) {
          possibleClassName = match[1].trim().toLowerCase();
          possibleSectionName = match[2] ? match[2].trim().toLowerCase() : '';
        } else {
          possibleClassName = classHint.trim().toLowerCase();
        }
      }

      // Normalize common variations
      if (possibleClassName === 'play group' && !classMap.has(possibleClassName)) {
        possibleClassName = 'playgroup';
      } else if (possibleClassName === 'playgroup' && !classMap.has(possibleClassName)) {
        possibleClassName = 'play group';
      }

      if (possibleClassName && classMap.has(possibleClassName)) {
        currentClassId = classMap.get(possibleClassName);
        if (possibleSectionName && sectionMap.has(`${currentClassId}:${possibleSectionName}`)) {
          currentSectionId = sectionMap.get(`${currentClassId}:${possibleSectionName}`);
        }
      }
    }

    valid.push({
      branch_id: req.branchId,
      full_name: student.full_name,
      registration_number: regNo,
      roll_number: student.roll_number,
      voucher_number: student.voucher_number,
      father_name: student.father_name,
      father_cnic: student.father_cnic,
      contact_number: student.contact_number,
      gender: student.gender,
      date_of_birth: student.date_of_birth,
      date_of_admission: student.date_of_admission,
      admission_class: student.admission_class,
      address: student.address,
      father_occupation: student.father_occupation,
      father_status: student.father_status,
      primary_contact_person: student.primary_contact_person,
      concession_type: student.concession_type,
      concession_percentage: student.concession_percentage,
      nationality: student.nationality,
      place_of_birth: student.place_of_birth,
      age_relaxation: student.age_relaxation,
      parent_email: student.parent_email,
      current_class_id: currentClassId,
      current_section_id: currentSectionId,
      is_active: true,
    });
  });

  const uniqueRegistrationNumbers = Array.from(seenRegistrationNumbers);
  // Also collect all roll numbers for fallback matching
  const uniqueRollNumbers = [...new Set(valid.map(s => s.roll_number).filter(Boolean))];

  const [{ data: existingByReg, error: existingError }, { data: existingByRoll }] = await Promise.all([
    supabaseAdmin
      .from('students')
      .select('id, registration_number, roll_number')
      .eq('branch_id', req.branchId)
      .in('registration_number', uniqueRegistrationNumbers.length > 0 ? uniqueRegistrationNumbers : ['__NONE__']),
    supabaseAdmin
      .from('students')
      .select('id, registration_number, roll_number')
      .eq('branch_id', req.branchId)
      .in('roll_number', uniqueRollNumbers.length > 0 ? uniqueRollNumbers : ['__NONE__']),
  ]);

  if (existingError) throw existingError;

  // Build lookup: by registration_number first, then by roll_number as fallback
  const existingStudentMap = new Map();
  (existingByReg || []).forEach(s => {
    existingStudentMap.set(String(s.registration_number).trim(), s);
  });
  // Add roll_number fallback (only if not already matched by reg number)
  (existingByRoll || []).forEach(s => {
    if (s.roll_number && !existingStudentMap.has(String(s.registration_number).trim())) {
      existingStudentMap.set(`roll:${String(s.roll_number).trim()}`, s);
    }
  });

  // Preview mode
  if (action === 'preview') {
    return res.json({
      success: true,
      data: {
        preview: valid.slice(0, 10),
        summary: {
          total: records.length,
          valid: valid.length,
          duplicates: duplicates.length,
          invalid: invalid.length,
        },
        valid,
        duplicates,
        invalid,
        detectedColumns,
      },
    });
  }

  // Import mode
  if (valid.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No valid records to import',
      summary: { total: records.length, valid: 0, duplicates: duplicates.length, invalid: invalid.length },
    });
  }

  const newStudents = [];
  const updateStudents = [];

  for (const payload of valid) {
    const regNo = String(payload.registration_number).trim();
    // Try matching by registration_number first, then by roll_number
    const existingMatch =
      existingStudentMap.get(regNo) ||
      (payload.roll_number ? existingStudentMap.get(`roll:${String(payload.roll_number).trim()}`) : null);
    if (existingMatch) {
      updateStudents.push({ id: existingMatch.id, payload });
    } else {
      newStudents.push(payload);
    }
  }

  let insertedResults = [];
  let updatedResults = [];
  const BATCH_SIZE = 100;

  // Batch insert new students in chunks of 100
  for (let i = 0; i < newStudents.length; i += BATCH_SIZE) {
    const chunk = newStudents.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabaseAdmin
      .from('students')
      .insert(chunk)
      .select('id, full_name, registration_number, voucher_number');

    if (error) throw error;
    if (data) insertedResults = insertedResults.concat(data);
  }

  // Batch update existing students in parallel chunks of 50
  const UPDATE_BATCH_SIZE = 50;
  for (let i = 0; i < updateStudents.length; i += UPDATE_BATCH_SIZE) {
    const chunk = updateStudents.slice(i, i + UPDATE_BATCH_SIZE);
    const promises = chunk.map(({ id, payload }) => {
      // Partial update: only set fields that have real values in CSV
      // This preserves existing data that wasn't in the CSV
      const updatePayload = { is_active: true, full_name: payload.full_name };
      if (payload.father_name) updatePayload.father_name = payload.father_name;
      if (payload.father_cnic) updatePayload.father_cnic = payload.father_cnic;
      if (payload.contact_number) updatePayload.contact_number = payload.contact_number;
      if (payload.gender) updatePayload.gender = payload.gender;
      if (payload.date_of_birth) updatePayload.date_of_birth = payload.date_of_birth;
      if (payload.date_of_admission) updatePayload.date_of_admission = payload.date_of_admission;
      if (payload.admission_class) updatePayload.admission_class = payload.admission_class;
      if (payload.address) updatePayload.address = payload.address;
      if (payload.roll_number) updatePayload.roll_number = payload.roll_number;
      if (payload.voucher_number) updatePayload.voucher_number = payload.voucher_number;
      if (payload.current_class_id) updatePayload.current_class_id = payload.current_class_id;
      if (payload.current_section_id) updatePayload.current_section_id = payload.current_section_id;
      if (payload.father_occupation) updatePayload.father_occupation = payload.father_occupation;
      if (payload.father_status) updatePayload.father_status = payload.father_status;
      if (payload.primary_contact_person) updatePayload.primary_contact_person = payload.primary_contact_person;
      if (payload.concession_type) updatePayload.concession_type = payload.concession_type;
      if (payload.concession_percentage !== null) updatePayload.concession_percentage = payload.concession_percentage;
      if (payload.nationality) updatePayload.nationality = payload.nationality;
      if (payload.place_of_birth) updatePayload.place_of_birth = payload.place_of_birth;
      if (payload.age_relaxation) updatePayload.age_relaxation = payload.age_relaxation;
      if (payload.parent_email) updatePayload.parent_email = payload.parent_email;
      return supabaseAdmin
        .from('students')
        .update(updatePayload)
        .eq('id', id)
        .select('id, full_name, registration_number, voucher_number')
        .single();
    });

    const results = await Promise.all(promises);
    results.forEach(({ data, error }) => {
      if (error) throw error;
      if (data) updatedResults.push(data);
    });
  }

  // Batch upsert fee balances into student_outstanding_balance table
  const allImported = [...insertedResults, ...updatedResults];
  const balancePayloads = [];
  const voucherPayloads = [];

  // Fetch active session and branch settings
  const [{ data: activeSession }, { data: branchData }] = await Promise.all([
    supabaseAdmin
      .from('sessions')
      .select('id')
      .eq('branch_id', req.branchId)
      .eq('is_current', true)
      .maybeSingle(),
    supabaseAdmin
      .from('branches')
      .select('settings')
      .eq('id', req.branchId)
      .single()
  ]);

  const settings = branchData?.settings || {};
  const dueDay = parseInt(settings.feeDueDay || '10', 10);
  const fee_month = new Date().toISOString().slice(0, 7);
  const due_date = new Date(new Date().getFullYear(), new Date().getMonth(), dueDay).toISOString().split('T')[0];

  const recordMap = new Map(records.map(r => [String(r.registration_number).trim(), r]));

  allImported.forEach(s => {
    const regNo = String(s.registration_number).trim();
    const r = recordMap.get(regNo);
    if (r) {
      balancePayloads.push({
        branch_id: req.branchId,
        student_id: s.id,
        total_outstanding: r.total_fee || 0,
        updated_at: new Date().toISOString(),
      });

      if (r.voucher_number) {
        voucherPayloads.push({
          branch_id: req.branchId,
          student_id: s.id,
          session_id: activeSession?.id || null,
          voucher_number: r.voucher_number,
          fee_month: fee_month,
          due_date: due_date,
          current_fee: r.monthly_fee || 0,
          previous_balance: r.previous_balance || 0,
          other_charges: 0,
          discount: 0,
          amount_paid: 0,
          status: 'unpaid',
          created_by: req.profile.id,
        });
      }
    }
  });

  if (balancePayloads.length > 0) {
    const BAL_BATCH_SIZE = 100;
    for (let i = 0; i < balancePayloads.length; i += BAL_BATCH_SIZE) {
      const chunk = balancePayloads.slice(i, i + BAL_BATCH_SIZE);
      const { error: balError } = await supabaseAdmin
        .from('student_outstanding_balance')
        .upsert(chunk, { onConflict: 'student_id' });
      if (balError) console.error("Error upserting student_outstanding_balance:", balError);
    }
  }

  if (voucherPayloads.length > 0) {
    const VOUCH_BATCH_SIZE = 100;
    for (let i = 0; i < voucherPayloads.length; i += VOUCH_BATCH_SIZE) {
      const chunk = voucherPayloads.slice(i, i + VOUCH_BATCH_SIZE);
      const { error: vouchError } = await supabaseAdmin
        .from('fee_vouchers')
        .upsert(chunk, { onConflict: 'voucher_number' });
      if (vouchError) console.error("Error upserting fee_vouchers:", vouchError);
    }
  }

  await logAudit(req, 'IMPORT_STUDENTS', 'students', null, null, {
    total: records.length,
    imported: insertedResults.length + updatedResults.length,
    inserted: insertedResults.length,
    updated: updatedResults.length,
    duplicates: duplicates.length,
    invalid: invalid.length,
  });

  res.status(201).json({
    success: true,
    data: {
      summary: {
        total: records.length,
        imported: insertedResults.length + updatedResults.length,
        inserted: insertedResults.length,
        updated: updatedResults.length,
        duplicates: duplicates.length,
        invalid: invalid.length,
      },
      imported: [...insertedResults, ...updatedResults],
      inserted: insertedResults,
      updated: updatedResults,
      duplicates,
      invalid,
    },
  });
}));

module.exports = router;

