require('dotenv').config();
const XLSX = require('xlsx');
const { supabaseAdmin } = require('./src/config/supabase');

const normalizeClassName = (raw) => {
  if (!raw) return '';
  let s = String(raw).trim().toLowerCase();
  s = s.replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();

  if (s.includes('playgroup') || s.includes('play group') || s === 'pg') return 'Play Group';
  if (s.includes('nursery')) return 'Nursery';
  if (s === 'kg' || s === 'k g' || s.includes('kindergarten')) return 'KG';
  if (s === 'prep') return 'Prep';
  if (s === 'one' || s === '1' || s === '1st' || s === 'i' || s === 'class 1' || s === 'class1') return 'Class 1';
  if (s === 'two' || s === '2' || s === '2nd' || s === 'ii' || s === 'class 2' || s === 'class2') return 'Class 2';
  if (s === 'three' || s === '3' || s === '3rd' || s === 'iii' || s === 'class 3' || s === 'class3') return 'Class 3';
  if (s === 'four' || s === '4' || s === '4th' || s === 'iv' || s === 'class 4' || s === 'class4') return 'Class 4';
  if (s === 'five' || s === '5' || s === '5th' || s === 'v' || s === 'class 5' || s === 'class5') return 'Class 5';
  if (s === 'six' || s === '6' || s === '6th' || s === 'vi' || s === 'class 6' || s === 'class6') return 'Class 6';
  if (s === 'seven' || s === '7' || s === '7th' || s === 'vii' || s === 'class 7' || s === 'class7') return 'Class 7';
  if (s === 'eight' || s === '8' || s === '8th' || s === 'viii' || s === 'class 8' || s === 'class8') return 'Class 8';
  if (s === 'nine' || s === '9' || s === '9th' || s === 'ix' || s === 'class 9' || s === 'class9') return 'Class 9';
  if (s === 'ten' || s === '10' || s === '10th' || s === 'x' || s === 'class 10' || s === 'class10' || s.includes('ex x') || s.includes('ex')) return 'Class 10';
  if (s === '11' || s === '11th' || s === 'xi' || s === 'class 11' || s === 'class11') return 'Class 11';
  if (s === '12' || s === '12th' || s === 'xii' || s === 'class 12' || s === 'class12') return 'Class 12';

  return raw.trim().replace(/\b\w/g, c => c.toUpperCase());
};

const normalizeSectionName = (raw) => {
  if (!raw) return 'A';
  let s = String(raw).trim().toUpperCase();
  if (s.startsWith('A')) return 'A';
  if (s.startsWith('B')) return 'B';
  if (s.startsWith('C')) return 'C';
  if (s.startsWith('D')) return 'D';
  if (s.startsWith('E')) return 'E';
  if (s.includes('GIRL')) return 'Girls';
  if (s.includes('BOY')) return 'Boys';
  const clean = s.replace(/[^A-Z0-9]/g, '');
  return clean.length > 0 ? clean.charAt(0) : 'A';
};

const parseGradeHeader = (row) => {
  if (!row || !Array.isArray(row)) return null;
  let gradeStr = '';

  for (let c = 0; c < Math.min(row.length, 5); c++) {
    const val = String(row[c] || '').trim();
    if (!val) continue;

    const m = val.match(/(?:grade|class)\s*[:\-]?\s*(.*)/i);
    if (m) {
      let g = m[1].trim().replace(/^[:\s\-]+/, '');
      if (!g || g.length === 0) {
        for (let nextC = c + 1; nextC < Math.min(row.length, 5); nextC++) {
          const nextVal = String(row[nextC] || '').trim();
          if (nextVal && !/^(fee|detail|month|kahuta)/i.test(nextVal)) {
            g = nextVal;
            break;
          }
        }
      }
      if (g && !/^(fee|detail|month|kahuta|for the)/i.test(g)) {
        gradeStr = g;
        break;
      }
    }
  }

  if (!gradeStr || /^(fee|detail|month|kahuta|for the)/i.test(gradeStr)) return null;

  let className = '';
  let sectionName = 'A';

  if (gradeStr.includes('/')) {
    const parts = gradeStr.split('/');
    className = normalizeClassName(parts[0]);
    sectionName = normalizeSectionName(parts.slice(1).join('/'));
  } else {
    className = normalizeClassName(gradeStr);
    sectionName = 'A';
  }

  return { raw: gradeStr, className, sectionName };
};

async function syncAllStudents() {
  const branchId = 'bbbbbbbb-0000-0000-0000-000000000001';
  const filePath = 'C:/Users/hassa/Downloads/Fee Challan with data file  August ,2026.0.xls';

  console.log('Reading Excel file:', filePath);
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets['Data File '] || wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false });

  // Fetch DB classes & sections
  const [{ data: dbClasses }, { data: dbSections }, { data: existingStudents }] = await Promise.all([
    supabaseAdmin.from('classes').select('id, name').eq('branch_id', branchId),
    supabaseAdmin.from('sections').select('id, name, class_id').eq('branch_id', branchId),
    supabaseAdmin.from('students').select('id, registration_number, roll_number, voucher_number, full_name, current_class_id, current_section_id').eq('branch_id', branchId),
  ]);

  const classMap = new Map((dbClasses || []).map(c => [normalizeClassName(c.name).toLowerCase(), c.id]));
  const sectionMap = new Map((dbSections || []).map(s => [`${s.class_id}:${normalizeSectionName(s.name)}`, s.id]));

  console.log(`Found ${existingStudents.length} students in DB.`);

  let currentGradeClassName = '';
  let currentGradeSectionName = 'A';
  let headerMap = null;
  const updates = [];

  const studentByReg = new Map();
  const studentByRoll = new Map();
  const studentByVoucher = new Map();

  existingStudents.forEach(s => {
    if (s.registration_number) studentByReg.set(String(s.registration_number).trim(), s);
    if (s.roll_number) studentByRoll.set(String(s.roll_number).trim(), s);
    if (s.voucher_number) studentByVoucher.set(String(s.voucher_number).trim(), s);
  });

  for (let lineIndex = 0; lineIndex < rows.length; lineIndex++) {
    const row = rows[lineIndex];
    if (!row || !Array.isArray(row)) continue;

    const gradeInfo = parseGradeHeader(row);
    if (gradeInfo) {
      currentGradeClassName = gradeInfo.className;
      currentGradeSectionName = gradeInfo.sectionName;
      continue;
    }

    const isHeaderRow = row.slice(0, 10).some(cell => typeof cell === 'string' && /\b(?:v\.?no|roll\s*no|father\s*name)\b/i.test(cell.trim()));
    if (isHeaderRow) {
      headerMap = {};
      row.slice(0, 20).forEach((col, idx) => {
        const rawCol = String(col || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
        if (rawCol.includes('roll')) headerMap.roll = idx;
        else if (rawCol.includes('v_no') || rawCol.includes('vno')) headerMap.vno = idx;
        else if (rawCol === 'name' || rawCol === 'student_name') headerMap.name = idx;
        else if (rawCol.includes('reg') && (rawCol.includes('no') || rawCol.includes('num'))) headerMap.reg = idx;
      });
      continue;
    }

    const nameIdx = headerMap?.name ?? 2;
    const name = row[nameIdx] !== null && row[nameIdx] !== undefined ? String(row[nameIdx]).trim() : '';
    if (!name || /^(name|student\s*name|total|sub\s*total|grand\s*total)$/i.test(name)) continue;
    if (/^\d+$/.test(name) || name.length < 2) continue;

    const vNoIdx = headerMap?.vno ?? 0;
    const rollIdx = headerMap?.roll ?? 1;
    const regIdx = headerMap?.reg ?? 8;

    const vNo = row[vNoIdx] !== null && row[vNoIdx] !== undefined ? String(row[vNoIdx]).trim() : '';
    const rollNo = row[rollIdx] !== null && row[rollIdx] !== undefined ? String(row[rollIdx]).trim() : '';
    const regNo = row[regIdx] !== null && row[regIdx] !== undefined ? String(row[regIdx]).trim() : '';

    if (/^v\.?no/i.test(vNo) || /^roll/i.test(rollNo)) continue;

    // Match student in DB
    const student = (regNo && studentByReg.get(regNo)) ||
                    (rollNo && studentByRoll.get(rollNo)) ||
                    (vNo && studentByVoucher.get(vNo));

    if (student) {
      const classId = classMap.get(currentGradeClassName.toLowerCase()) || null;
      const sectionId = classId ? (sectionMap.get(`${classId}:${currentGradeSectionName}`) || null) : null;

      if (classId && sectionId && (student.current_class_id !== classId || student.current_section_id !== sectionId)) {
        updates.push({
          id: student.id,
          name: student.full_name,
          current_class_id: classId,
          current_section_id: sectionId,
          className: currentGradeClassName,
          sectionName: currentGradeSectionName
        });
      }
    }
  }

  console.log(`Found ${updates.length} students requiring class/section updates.`);

  // Execute updates in batches
  const BATCH_SIZE = 50;
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const chunk = updates.slice(i, i + BATCH_SIZE);
    await Promise.all(chunk.map(u => 
      supabaseAdmin.from('students').update({
        current_class_id: u.current_class_id,
        current_section_id: u.current_section_id
      }).eq('id', u.id)
    ));
    console.log(`Updated batch ${i + 1} to ${Math.min(i + BATCH_SIZE, updates.length)}`);
  }

  console.log('All student classes & sections synced successfully!');
}

syncAllStudents();
